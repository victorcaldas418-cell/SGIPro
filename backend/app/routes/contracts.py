from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.models.contract import Contract, ContractIndex, Installment, ContractStatus, ContractAndamento
from app.models.property import Property, PropertyOccupancyStatus
from app.schemas.contract_schema import ContractCreate, ContractOut, ContractUpdate, InstallmentOut, InstallmentUpdate, ContractAndamentoCreate, ContractAndamentoUpdate, ContractAndamentoOut
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User

router = APIRouter()


def sync_property_occupancy(db: Session, property_id: int | None):
    """Sincroniza o status do imóvel com base nos contratos ativos vinculados."""
    if not property_id:
        return
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        return
    has_active = db.query(Contract).filter(
        Contract.property_id == property_id,
        Contract.status == ContractStatus.ATIVO
    ).first() is not None
    prop.status = PropertyOccupancyStatus.OCUPADO if has_active else PropertyOccupancyStatus.DESOCUPADO
    db.commit()


@router.post("/", response_model=ContractOut, status_code=201)
def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    contract_data = contract.model_dump(exclude={"indexes"})
    contract_data["organization_id"] = org_id
    db_contract = Contract(**contract_data)

    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)

    if contract.indexes:
        for idx in contract.indexes:
            db_idx = ContractIndex(contract_id=db_contract.id, **idx.model_dump())
            db.add(db_idx)

    current_date = contract.start_date
    while current_date <= contract.end_date:
        installment = Installment(
            contract_id=db_contract.id,
            reference_month=current_date.month,
            reference_year=current_date.year,
            due_date=current_date,
            base_value=contract.base_rent_value,
            total_value=contract.base_rent_value,
        )
        db.add(installment)
        current_date += relativedelta(months=1)

    db.commit()
    db.refresh(db_contract)

    sync_property_occupancy(db, db_contract.property_id)
    return db_contract


@router.get("/", response_model=List[ContractOut])
def get_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    return db.query(Contract).filter(Contract.organization_id == org_id).offset(skip).limit(limit).all()


@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_contract = db.query(Contract).filter(Contract.id == contract_id, Contract.organization_id == org_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")
    return db_contract


@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(
    contract_id: int,
    contract_update: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_contract = db.query(Contract).filter(Contract.id == contract_id, Contract.organization_id == org_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")

    update_data = contract_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contract, key, value)

    db.commit()
    db.refresh(db_contract)

    sync_property_occupancy(db, db_contract.property_id)
    return db_contract


@router.delete("/{contract_id}", status_code=204)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_contract = db.query(Contract).filter(Contract.id == contract_id, Contract.organization_id == org_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")

    property_id = db_contract.property_id
    db.delete(db_contract)
    db.commit()

    sync_property_occupancy(db, property_id)


# --- Rota para Parcelas do Contrato ---
@router.put("/installments/{installment_id}", response_model=InstallmentOut)
def update_installment(
    installment_id: int,
    inst_update: InstallmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_installment = db.query(Installment).filter(Installment.id == installment_id).first()
    if not db_installment:
        raise HTTPException(status_code=404, detail="Parcela não encontrada.")

    db_contract = db.query(Contract).filter(
        Contract.id == db_installment.contract_id,
        Contract.organization_id == org_id,
    ).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Parcela não encontrada.")

    update_data = inst_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_installment, key, value)

    db.commit()
    db.refresh(db_installment)
    return db_installment


# --- Rotas para Andamentos ---
@router.post("/{contract_id}/andamentos/", response_model=ContractAndamentoOut, status_code=201)
def create_andamento(
    contract_id: int,
    andamento: ContractAndamentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_contract = db.query(Contract).filter(Contract.id == contract_id, Contract.organization_id == org_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")
    db_andamento = ContractAndamento(contract_id=contract_id, **andamento.model_dump())
    db.add(db_andamento)
    db.commit()
    db.refresh(db_andamento)
    return db_andamento


@router.put("/andamentos/{andamento_id}", response_model=ContractAndamentoOut)
def update_andamento(
    andamento_id: int,
    andamento_update: ContractAndamentoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_andamento = db.query(ContractAndamento).filter(ContractAndamento.id == andamento_id).first()
    if not db_andamento:
        raise HTTPException(status_code=404, detail="Andamento não encontrado.")
    db_contract = db.query(Contract).filter(
        Contract.id == db_andamento.contract_id,
        Contract.organization_id == org_id,
    ).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Andamento não encontrado.")
    for key, value in andamento_update.model_dump(exclude_unset=True).items():
        setattr(db_andamento, key, value)
    db.commit()
    db.refresh(db_andamento)
    return db_andamento


@router.delete("/andamentos/{andamento_id}", status_code=204)
def delete_andamento(
    andamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_andamento = db.query(ContractAndamento).filter(ContractAndamento.id == andamento_id).first()
    if not db_andamento:
        raise HTTPException(status_code=404, detail="Andamento não encontrado.")
    db_contract = db.query(Contract).filter(
        Contract.id == db_andamento.contract_id,
        Contract.organization_id == org_id,
    ).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Andamento não encontrado.")
    db.delete(db_andamento)
    db.commit()
