from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.client import Client, ClientAssociate
from app.schemas.client_schema import ClientCreate, ClientOut, ClientUpdate
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User
from app.services.audit_service import log_audit

router = APIRouter()


@router.post("/", response_model=ClientOut, status_code=201)
def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    client_data = client.model_dump(exclude={"associates"})
    client_data["organization_id"] = org_id
    db_client = Client(**client_data)

    db.add(db_client)
    db.commit()
    db.refresh(db_client)

    if client.associates:
        for assoc_in in client.associates:
            db_assoc = ClientAssociate(company_id=db_client.id, **assoc_in.model_dump())
            db.add(db_assoc)
        db.commit()
        db.refresh(db_client)

    log_audit(db, org_id, current_user, "CLIENT", "CRIAR",
              f"Cliente '{db_client.name}' cadastrado.", entity_id=db_client.id)
    return db_client


@router.get("/", response_model=List[ClientOut])
def get_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    return db.query(Client).filter(Client.organization_id == org_id).offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_client = db.query(Client).filter(Client.id == client_id, Client.organization_id == org_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return db_client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    client: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_client = db.query(Client).filter(Client.id == client_id, Client.organization_id == org_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    update_data = client.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)

    db.commit()
    db.refresh(db_client)

    log_audit(db, org_id, current_user, "CLIENT", "ATUALIZAR",
              f"Cliente '{db_client.name}' atualizado.", entity_id=db_client.id)
    return db_client


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_client = db.query(Client).filter(Client.id == client_id, Client.organization_id == org_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    name = db_client.name
    db.delete(db_client)
    db.commit()

    log_audit(db, org_id, current_user, "CLIENT", "EXCLUIR",
              f"Cliente '{name}' (ID {client_id}) excluído.", entity_id=client_id)
