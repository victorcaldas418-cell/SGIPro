from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, OrgType


# ─── Organization ───────────────────────────────────────────────

class OrganizationBase(BaseModel):
    name: str
    org_type: OrgType = OrgType.IMOBILIARIA
    cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationOut(OrganizationBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Module Permissions ─────────────────────────────────────────

class ModulePermissionBase(BaseModel):
    module: str
    can_view: bool = True
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_generate_reports: bool = False


class ModulePermissionOut(ModulePermissionBase):
    id: int

    class Config:
        from_attributes = True


# ─── User ────────────────────────────────────────────────────────

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.AGENT


class UserCreate(UserBase):
    password: Optional[str] = None
    organization_id: Optional[int] = None
    permissions: Optional[List[ModulePermissionBase]] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[ModulePermissionBase]] = None


class UserOrgOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    permissions: List[ModulePermissionOut] = []

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    is_deletable: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    organizations: List[OrganizationOut] = []

    class Config:
        from_attributes = True


# ─── Auth Schemas ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    token: str  # ID token do Google


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    organizations: List[dict]
    requires_org_selection: bool = False


class SelectOrgRequest(BaseModel):
    organization_id: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class CreateOrgAndJoinRequest(BaseModel):
    org: OrganizationCreate
    user_id: Optional[int] = None  # Se já autenticado mas sem org
