from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.property import PropertyOccupancyStatus, ServiceAccountType, ServiceAccountStatus

# --- SubUnit ---
class SubUnitBase(BaseModel):
    identifier: str = Field(..., max_length=50)
    area_m2: float
    status: PropertyOccupancyStatus = PropertyOccupancyStatus.DESOCUPADO

class SubUnitCreate(SubUnitBase):
    pass

class SubUnitOut(SubUnitBase):
    id: int
    property_id: int

    class Config:
        from_attributes = True

# --- Service Account ---
class ServiceAccountBase(BaseModel):
    service_type: ServiceAccountType
    provider_name: str = Field(..., max_length=100)
    account_number: str = Field(..., max_length=100)
    status: ServiceAccountStatus = ServiceAccountStatus.ATIVO

class ServiceAccountCreate(ServiceAccountBase):
    pass

class ServiceAccountOut(ServiceAccountBase):
    id: int
    property_id: int

    class Config:
        from_attributes = True

# --- Property ---
class PropertyBase(BaseModel):
    description: str = Field(..., max_length=200)
    address: str
    number: str
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipcode: Optional[str] = None
    total_area_m2: float
    status: PropertyOccupancyStatus = PropertyOccupancyStatus.DESOCUPADO

    # Matriculas
    current_registry_office: Optional[str] = None
    current_registry_number: Optional[str] = None
    cnm: Optional[str] = None
    municipal_registration: Optional[str] = None

    # IPTU
    iptu_total_value: float = 0.0
    iptu_discount_value: float = 0.0

class PropertyCreate(PropertyBase):
    subunits: Optional[List[SubUnitCreate]] = []
    accounts: Optional[List[ServiceAccountCreate]] = []

class PropertyUpdate(PropertyBase):
    # Campos que podem ser atualizados
    description: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    total_area_m2: Optional[float] = None
    status: Optional[PropertyOccupancyStatus] = None

class PropertyOut(PropertyBase):
    id: int
    subunits: List[SubUnitOut] = []
    accounts: List[ServiceAccountOut] = []

    class Config:
        from_attributes = True
