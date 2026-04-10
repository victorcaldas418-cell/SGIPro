from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.property import Property, SubUnit, ServiceAccount
from app.schemas.property_schema import PropertyCreate, PropertyOut, PropertyUpdate
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=PropertyOut, status_code=201)
def create_property(
    prop: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    prop_data = prop.model_dump(exclude={"subunits", "accounts"})
    prop_data["organization_id"] = org_id
    db_prop = Property(**prop_data)

    db.add(db_prop)
    db.commit()
    db.refresh(db_prop)

    if prop.subunits:
        for subunit_in in prop.subunits:
            db_subunit = SubUnit(property_id=db_prop.id, **subunit_in.model_dump())
            db.add(db_subunit)

    if prop.accounts:
        for account_in in prop.accounts:
            db_acc = ServiceAccount(property_id=db_prop.id, **account_in.model_dump())
            db.add(db_acc)

    if prop.subunits or prop.accounts:
        db.commit()
        db.refresh(db_prop)

    return db_prop


@router.get("/", response_model=List[PropertyOut])
def list_properties(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    properties = db.query(Property).filter(Property.organization_id == org_id).offset(skip).limit(limit).all()
    return properties


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_prop = db.query(Property).filter(Property.id == property_id, Property.organization_id == org_id).first()
    if not db_prop:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    return db_prop


@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: int,
    prop_update: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_prop = db.query(Property).filter(Property.id == property_id, Property.organization_id == org_id).first()
    if not db_prop:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")

    update_data = prop_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_prop, key, value)

    db.commit()
    db.refresh(db_prop)
    return db_prop


@router.delete("/{property_id}", status_code=204)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    db_prop = db.query(Property).filter(Property.id == property_id, Property.organization_id == org_id).first()
    if not db_prop:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")

    db.delete(db_prop)
    db.commit()
    return {"ok": True}
