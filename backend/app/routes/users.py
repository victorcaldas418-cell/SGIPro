from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.core.security import get_current_user, get_current_org_id, get_password_hash, require_role
from app.models.user import User, UserOrganization, ModulePermission, UserRole
from app.schemas.auth import UserCreate, UserUpdate, UserOrgOut
from app.services.auth_service import (
    get_user_by_email, add_user_to_org, get_user_orgs,
    build_user_dict, build_permissions_dict
)

router = APIRouter()


def _require_admin(current_user: User):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")


def _validate_org_membership(db: Session, user_id: int, org_id: int):
    """Verifica que o usuário pertence à organização solicitada."""
    membership = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == org_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta organização.")
    return membership


@router.get("/", summary="Lista usuários da organização atual")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    _require_admin(current_user)
    _validate_org_membership(db, current_user.id, org_id)

    user_orgs = db.query(UserOrganization).filter(
        UserOrganization.organization_id == org_id
    ).all()

    result = []
    for uo in user_orgs:
        user = uo.user
        perms = build_permissions_dict(uo.permissions)
        result.append({
            **build_user_dict(user),
            "is_org_admin": uo.is_org_admin,
            "joined_at": uo.joined_at,
            "permissions": perms,
        })
    return result


@router.post("/", summary="Cria novo usuário e o vincula a uma organização")
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    _require_admin(current_user)
    _validate_org_membership(db, current_user.id, org_id)

    # SUPER_ADMIN só pode ser criado via seed
    if body.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Usuários SUPER_ADMIN só podem ser criados via seed.")

    from app.models.user import Organization
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada.")

    existing = get_user_by_email(db, body.email)
    if existing:
        already = db.query(UserOrganization).filter(
            UserOrganization.user_id == existing.id,
            UserOrganization.organization_id == org_id,
        ).first()
        if already:
            raise HTTPException(status_code=400, detail="Usuário já vinculado a esta organização.")
        perms = [p.model_dump() for p in body.permissions] if body.permissions else None
        add_user_to_org(db, existing, org, perms=perms)
        return {"message": "Usuário existente vinculado à organização.", "user_id": existing.id}

    hashed_pw = get_password_hash(body.password) if body.password else None
    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hashed_pw,
        role=body.role,
        is_active=True,
        is_deletable=True,
    )
    db.add(user)
    db.flush()

    perms = [p.model_dump() for p in body.permissions] if body.permissions else None
    add_user_to_org(db, user, org, is_org_admin=(body.role == UserRole.ADMIN), permissions=perms)

    return {"message": "Usuário criado com sucesso.", "user_id": user.id}


@router.put("/{user_id}", summary="Atualiza dados do usuário")
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    _require_admin(current_user)
    _validate_org_membership(db, current_user.id, org_id)

    # Verifica que o usuário alvo pertence à mesma org
    _validate_org_membership(db, user_id, org_id)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if not user.is_deletable and body.role and body.role != user.role:
        raise HTTPException(status_code=403, detail="Não é possível alterar o role do SUPER_ADMIN.")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    db.commit()
    return {"message": "Usuário atualizado.", "user_id": user.id}


@router.put("/{user_id}/permissions", summary="Atualiza permissões de um AGENT na org")
def update_permissions(
    user_id: int,
    permissions: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    _require_admin(current_user)
    _validate_org_membership(db, current_user.id, org_id)

    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == org_id,
    ).first()

    if not user_org:
        raise HTTPException(status_code=404, detail="Vínculo usuário/organização não encontrado.")

    db.query(ModulePermission).filter(ModulePermission.user_org_id == user_org.id).delete()

    for perm in permissions:
        mp = ModulePermission(user_org_id=user_org.id, **perm)
        db.add(mp)

    db.commit()
    return {"message": "Permissões atualizadas."}


@router.delete("/{user_id}", summary="Exclui usuário do sistema")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    _require_admin(current_user)
    _validate_org_membership(db, current_user.id, org_id)

    # Verifica que o usuário alvo pertence à mesma org
    _validate_org_membership(db, user_id, org_id)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if not user.is_deletable:
        raise HTTPException(status_code=403, detail="O SUPER_ADMIN não pode ser excluído.")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta.")

    db.delete(user)
    db.commit()
    return {"message": "Usuário excluído."}
