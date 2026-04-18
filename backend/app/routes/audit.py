from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.core.security import get_current_user, get_current_org_id
from app.models.user import User
from app.models.audit import AuditLog

router = APIRouter()


class AuditLogOut(BaseModel):
    id: int
    user_name: str
    entity_type: str
    entity_id: Optional[int] = None
    contract_id: Optional[int] = None
    action: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


def _require_auditor(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Sem permissão para auditar.")
    return current_user


@router.get("/", response_model=List[AuditLogOut])
def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    contract_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_auditor),
    org_id: int = Depends(get_current_org_id),
):
    q = db.query(AuditLog).filter(AuditLog.organization_id == org_id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if contract_id is not None:
        q = q.filter(AuditLog.contract_id == contract_id)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
