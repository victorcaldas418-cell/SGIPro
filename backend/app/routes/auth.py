from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    verify_google_token, get_current_user
)
from app.core.config import settings
from app.models.user import User, Organization, UserOrganization, ModulePermission, PasswordResetToken, UserRole, OrgType
from app.schemas.auth import (
    LoginRequest, GoogleLoginRequest, TokenResponse,
    SelectOrgRequest, ForgotPasswordRequest, ResetPasswordRequest,
    OrganizationCreate, CreateOrgAndJoinRequest
)
from app.services.auth_service import (
    get_user_by_email, get_user_orgs, build_user_dict, build_org_dict,
    build_permissions_dict, get_user_permissions, create_organization,
    add_user_to_org, seed_super_admin, generate_reset_token, send_reset_email
)

router = APIRouter()


def _make_token_response(db: Session, user: User, org_id: int = None) -> dict:
    """Monta a resposta JWT com user, orgs e permissões."""
    orgs = get_user_orgs(db, user.id)
    orgs_data = [build_org_dict(o) for o in orgs]

    # Se só tem uma org, seleciona automaticamente
    selected_org_id = org_id
    if not selected_org_id and len(orgs) == 1:
        selected_org_id = orgs[0].id
    requires_org = not selected_org_id and len(orgs) > 1

    permissions = []
    if selected_org_id:
        perms = get_user_permissions(db, user.id, selected_org_id)
        permissions = build_permissions_dict(perms)

    token_data = {
        "sub": str(user.id),
        "org_id": selected_org_id,
        "role": user.role.value,
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {**build_user_dict(user), "permissions": permissions},
        "organizations": orgs_data,
        "requires_org_selection": requires_org,
        "selected_org_id": selected_org_id,
    }


@router.post("/seed", summary="Cria o SUPER_ADMIN e a org master (1ª vez apenas)")
def seed(db: Session = Depends(get_db)):
    result = seed_super_admin(db)
    return result


@router.post("/login", summary="Login com e-mail e senha")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário inativo. Contate o administrador.")

    user.last_login = datetime.utcnow()
    db.commit()

    return _make_token_response(db, user)


@router.post("/google", summary="Login / Registro via Google OAuth")
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(body.token)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Token Google inválido.")

    google_sub = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", email.split("@")[0])
    avatar_url = idinfo.get("picture")

    # Busca por google_sub ou email
    user = db.query(User).filter(
        (User.google_sub == google_sub) | (User.email == email)
    ).first()

    if user:
        # Atualiza campos do Google
        user.google_sub = google_sub
        user.avatar_url = avatar_url or user.avatar_url
        user.last_login = datetime.utcnow()
        db.commit()
    else:
        # Novo usuário via Google — cria sem org (vai para seleção/criação)
        user = User(
            name=name,
            email=email,
            google_sub=google_sub,
            avatar_url=avatar_url,
            role=UserRole.AGENT,
            is_active=True,
            is_deletable=True,
            last_login=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _make_token_response(db, user)


@router.post("/select-org", summary="Seleciona a organização ativa no token")
def select_org(body: SelectOrgRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verifica se o usuário pertence à org
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == body.organization_id
    ).first()

    if not user_org:
        raise HTTPException(status_code=403, detail="Você não pertence a esta organização.")

    return _make_token_response(db, current_user, org_id=body.organization_id)


@router.get("/me", summary="Retorna o usuário autenticado")
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orgs = get_user_orgs(db, current_user.id)
    return {
        "user": build_user_dict(current_user),
        "organizations": [build_org_dict(o) for o in orgs],
    }


@router.post("/forgot-password", summary="Solicita recuperação de senha")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    # Sempre retorna 200 para não expor quais emails existem
    if not user or not user.is_active:
        return {"message": "Se o e-mail existir no sistema, você receberá as instruções em breve."}

    if not user.hashed_password:
        return {"message": "Esta conta usa login pelo Google. Faça login com sua conta Google."}

    token = generate_reset_token(db, user)
    reset_link = f"{settings.FRONTEND_URL}/redefinir-senha?token={token}"
    send_reset_email(user.email, user.name, reset_link)

    return {"message": "Se o e-mail existir no sistema, você receberá as instruções em breve."}


@router.post("/reset-password", summary="Redefine a senha com o token recebido")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado.")
    if reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo link.")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 8 caracteres.")

    user = reset_token.user
    user.hashed_password = get_password_hash(body.new_password)
    reset_token.used = True
    db.commit()

    return {"message": "Senha redefinida com sucesso. Você já pode fazer login."}


@router.post("/organizations", summary="Cria uma nova organização e vincula o usuário")
def create_org_and_join(
    body: CreateOrgAndJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verifica se já existe org com mesmo nome para este usuário
    existing = db.query(Organization).filter(Organization.name == body.org.name).first()
    if existing:
        # Se o usuário já está nela
        already_in = db.query(UserOrganization).filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == existing.id
        ).first()
        if already_in:
            raise HTTPException(status_code=400, detail="Você já está vinculado a uma organização com este nome.")

    org = create_organization(
        db,
        name=body.org.name,
        org_type=body.org.org_type,
        cnpj=body.org.cnpj,
        email=body.org.email,
        phone=body.org.phone,
        address=body.org.address,
    )

    # Quem cria a org se torna ADMIN dela
    if current_user.role == UserRole.AGENT:
        current_user.role = UserRole.ADMIN
        db.commit()

    add_user_to_org(db, current_user, org, is_org_admin=True)

    return _make_token_response(db, current_user, org_id=org.id)
