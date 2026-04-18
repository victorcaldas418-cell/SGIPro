from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User
from app.models.settings import OrgSettings, DEFAULT_WHATSAPP_TEMPLATE

router = APIRouter()


class SettingsOut(BaseModel):
    whatsapp_message_template: str

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    whatsapp_message_template: str


@router.get("/", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    row = db.query(OrgSettings).filter(OrgSettings.organization_id == org_id).first()
    if not row:
        return SettingsOut(whatsapp_message_template=DEFAULT_WHATSAPP_TEMPLATE)
    return row


@router.put("/", response_model=SettingsOut)
def update_settings(
    update: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
):
    row = db.query(OrgSettings).filter(OrgSettings.organization_id == org_id).first()
    if not row:
        row = OrgSettings(
            organization_id=org_id,
            whatsapp_message_template=update.whatsapp_message_template,
        )
        db.add(row)
    else:
        row.whatsapp_message_template = update.whatsapp_message_template
    db.commit()
    db.refresh(row)
    return row
