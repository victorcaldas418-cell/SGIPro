from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.models.contract import IndexType, ContractStatus, InstallmentStatus

# --- Indexes ---
class ContractIndexBase(BaseModel):
    index_name: IndexType

class ContractIndexCreate(ContractIndexBase):
    pass

class ContractIndexOut(ContractIndexBase):
    id: int
    contract_id: int
    class Config:
        from_attributes = True

# --- Aditivos ---
class ContractAmendmentBase(BaseModel):
    signature_date: date
    description: str

class ContractAmendmentCreate(ContractAmendmentBase):
    pass

class ContractAmendmentOut(ContractAmendmentBase):
    id: int
    contract_id: int
    class Config:
        from_attributes = True

# --- Parcelas ---
class InstallmentBase(BaseModel):
    reference_month: int
    reference_year: int
    due_date: date
    
    base_value: float
    iptu_value: float = 0.0
    other_fees_value: float = 0.0

    penalty_value: float = 0.0
    interest_value: float = 0.0
    inflation_value: float = 0.0
    total_value: float
    
    status: InstallmentStatus = InstallmentStatus.PENDENTE
    payment_date: Optional[date] = None

class InstallmentCreate(InstallmentBase):
    pass

class InstallmentOut(InstallmentBase):
    id: int
    contract_id: int
    class Config:
        from_attributes = True

class InstallmentUpdate(BaseModel):
    status: Optional[InstallmentStatus] = None
    payment_date: Optional[date] = None
    penalty_value: Optional[float] = None
    interest_value: Optional[float] = None
    inflation_value: Optional[float] = None
    total_value: Optional[float] = None

# --- Contratos ---
class ContractBase(BaseModel):
    locador_id: int
    locatario_id: int
    property_id: Optional[int] = None
    subunit_id: Optional[int] = None
    
    start_date: date
    end_date: date
    status: ContractStatus = ContractStatus.ATIVO
    
    base_rent_value: float
    adjustment_month: int
    adjustment_min_percentage: float = 0.0
    
    penalty_rescission_value: float = 0.0
    penalty_default_perc: float = 10.0
    interest_default_perc: float = 1.0
    inflation_index: Optional[IndexType] = None

class ContractCreate(ContractBase):
    indexes: Optional[List[ContractIndexCreate]] = []

class ContractOut(ContractBase):
    id: int
    indexes: List[ContractIndexOut] = []
    installments: List[InstallmentOut] = []
    amendments: List[ContractAmendmentOut] = []
    class Config:
        from_attributes = True

class ContractUpdate(BaseModel):
    status: Optional[ContractStatus] = None
    base_rent_value: Optional[float] = None
    end_date: Optional[date] = None
