from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date
from app.models.client import ClientType, AssociateRole

# --- Associados (Sócios) ---
class ClientAssociateBase(BaseModel):
    name: str = Field(..., max_length=150)
    cpf: Optional[str] = Field(None, max_length=14)
    role: AssociateRole
    person_id: Optional[int] = None

class ClientAssociateCreate(ClientAssociateBase):
    pass

class ClientAssociateOut(ClientAssociateBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True

# --- Clientes ---
class ClientBase(BaseModel):
    type: ClientType
    name: str = Field(..., max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    status: bool = True

    # Endereço
    zipcode: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    # PF
    cpf: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[date] = None

    # PJ
    trading_name: Optional[str] = None
    cnpj: Optional[str] = None
    state_registration: Optional[str] = None

class ClientCreate(ClientBase):
    associates: Optional[List[ClientAssociateCreate]] = []

class ClientUpdate(ClientBase):
    type: Optional[ClientType] = None
    name: Optional[str] = None

class ClientOut(ClientBase):
    id: int
    associates: List[ClientAssociateOut] = []

    class Config:
        from_attributes = True
