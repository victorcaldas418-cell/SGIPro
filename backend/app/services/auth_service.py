import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import (
    User, Organization, UserOrganization, ModulePermission,
    PasswordResetToken, UserRole, OrgType
)
from app.core.security import get_password_hash
from app.core.config import settings


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_orgs(db: Session, user_id: int) -> List[Organization]:
    """Retorna todas as organizações de um usuário."""
    user_orgs = db.query(UserOrganization).filter(UserOrganization.user_id == user_id).all()
    return [uo.organization for uo in user_orgs if uo.organization.is_active]


def get_user_permissions(db: Session, user_id: int, org_id: int) -> List[ModulePermission]:
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == org_id
    ).first()
    if not user_org:
        return []
    return user_org.permissions


def build_user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "is_deletable": user.is_deletable,
    }


def build_org_dict(org: Organization) -> dict:
    return {
        "id": org.id,
        "name": org.name,
        "org_type": org.org_type.value,
        "email": org.email,
    }


def build_permissions_dict(permissions: List[ModulePermission]) -> list:
    return [
        {
            "module": p.module,
            "can_view": p.can_view,
            "can_create": p.can_create,
            "can_edit": p.can_edit,
            "can_delete": p.can_delete,
            "can_generate_reports": p.can_generate_reports,
        }
        for p in permissions
    ]


def create_organization(db: Session, name: str, org_type: OrgType = OrgType.IMOBILIARIA, **kwargs) -> Organization:
    org = Organization(name=name, org_type=org_type, **kwargs)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def add_user_to_org(
    db: Session,
    user: User,
    org: Organization,
    is_org_admin: bool = False,
    permissions: Optional[List[dict]] = None
) -> UserOrganization:
    user_org = UserOrganization(
        user_id=user.id,
        organization_id=org.id,
        is_org_admin=is_org_admin
    )
    db.add(user_org)
    db.flush()  # para ter user_org.id disponível

    if permissions:
        for perm in permissions:
            mp = ModulePermission(user_org_id=user_org.id, **perm)
            db.add(mp)
    elif user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        # Admins têm todos os poderes em todos os módulos
        for module in ["*"]:
            mp = ModulePermission(
                user_org_id=user_org.id,
                module=module,
                can_view=True, can_create=True,
                can_edit=True, can_delete=True,
                can_generate_reports=True
            )
            db.add(mp)

    db.commit()
    db.refresh(user_org)
    return user_org


def seed_super_admin(db: Session) -> dict:
    """Cria o SUPER_ADMIN e a organização master se não existirem."""
    existing = get_user_by_email(db, settings.SUPER_ADMIN_EMAIL)
    if existing:
        return {"message": "SUPER_ADMIN já existe.", "created": False}

    org = db.query(Organization).filter(Organization.name == settings.MASTER_ORG_NAME).first()
    if not org:
        org = create_organization(db, settings.MASTER_ORG_NAME, OrgType.ESCRITORIO)

    user = User(
        name=settings.SUPER_ADMIN_NAME,
        email=settings.SUPER_ADMIN_EMAIL,
        hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_deletable=False,
    )
    db.add(user)
    db.flush()

    add_user_to_org(db, user, org, is_org_admin=True)

    return {
        "message": f"SUPER_ADMIN criado: {settings.SUPER_ADMIN_EMAIL}",
        "org": settings.MASTER_ORG_NAME,
        "created": True
    }


def generate_reset_token(db: Session, user: User) -> str:
    """Gera e salva um token de reset de senha (válido por 1 hora)."""
    # Invalida tokens anteriores
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})
    db.commit()

    token = secrets.token_urlsafe(48)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(reset_token)
    db.commit()
    return token


def send_reset_email(email: str, name: str, reset_link: str) -> bool:
    """Envia e-mail de recuperação de senha via SMTP."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print(f"[DEV] Link de reset para {email}: {reset_link}")
        return True  # Em dev, apenas loga

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🔐 Recuperação de Senha — SGI Pro"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = email

        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            <h2 style="color:#2563eb;margin-bottom:8px;">SGI Pro</h2>
            <p>Olá, <strong>{name}</strong>!</p>
            <p>Recebemos uma solicitação de recuperação de senha para sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
            <a href="{reset_link}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Redefinir Senha
            </a>
            <p style="color:#6b7280;font-size:13px;">Se você não solicitou isso, ignore este e-mail.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="color:#9ca3af;font-size:12px;">SGI Pro — Sistema de Gestão Imobiliária</p>
          </div>
        </body></html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
