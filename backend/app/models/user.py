from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    AGENT = "agent"


class OrgType(str, enum.Enum):
    IMOBILIARIA = "Imobiliária"
    ESCRITORIO = "Escritório de Advocacia"
    OUTRO = "Outro"


class Organization(Base):
    """Imobiliária ou Escritório de Advocacia — entidade tenant."""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    org_type = Column(Enum(OrgType), default=OrgType.IMOBILIARIA)
    cnpj = Column(String, nullable=True, unique=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    """Usuário do sistema SGI."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=True)   # Null se só usa OAuth
    google_sub = Column(String, nullable=True, unique=True)  # Google user ID
    avatar_url = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.AGENT, nullable=False)
    is_active = Column(Boolean, default=True)
    is_deletable = Column(Boolean, default=True)  # False para SUPER_ADMIN
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    organizations = relationship("UserOrganization", back_populates="user", cascade="all, delete-orphan")
    password_resets = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class UserOrganization(Base):
    """Associação entre usuário e organização — com permissões embutidas."""
    __tablename__ = "user_organizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    # Permissões globais para este usuário nesta org (ADMIN/SUPER_ADMIN têm all=True)
    is_org_admin = Column(Boolean, default=False)  # Admin local desta org
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="organizations")
    organization = relationship("Organization", back_populates="members")
    permissions = relationship(
        "ModulePermission",
        back_populates="user_organization",
        cascade="all, delete-orphan"
    )


class ModulePermission(Base):
    """
    Permissões granulares por módulo para usuários AGENT.
    module = 'clients' | 'properties' | 'contracts' | 'financial' | 'reports' | '*'
    """
    __tablename__ = "module_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_org_id = Column(Integer, ForeignKey("user_organizations.id"), nullable=False)
    module = Column(String, nullable=False)  # '*' = todos os módulos

    can_view = Column(Boolean, default=True)
    can_create = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_generate_reports = Column(Boolean, default=False)

    user_organization = relationship("UserOrganization", back_populates="permissions")


class PasswordResetToken(Base):
    """Token para recuperação de senha."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="password_resets")
