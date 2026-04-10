from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.models.contract import Contract, ContractIndex, Installment
from app.schemas.contract_schema import ContractCreate, ContractOut, ContractUpdate, InstallmentOut, InstallmentUpdate
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User

router = APIRouter()


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

    db.delete(db_contract)
    db.commit()
    return {"ok": True}


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

    # Valida que a parcela pertence a um contrato da org do usuário
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
