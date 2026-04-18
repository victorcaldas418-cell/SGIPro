from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_audit(
    db: Session,
    org_id: int,
    user,
    entity_type: str,
    action: str,
    description: str,
    entity_id: int | None = None,
    contract_id: int | None = None,
):
    """Registra uma entrada no log de auditoria. Nunca levanta exceção."""
    try:
        entry = AuditLog(
            organization_id=org_id,
            user_id=getattr(user, "id", None),
            user_name=getattr(user, "name", "Sistema"),
            entity_type=entity_type,
            entity_id=entity_id,
            contract_id=contract_id,
            action=action,
            description=description,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        print(f"[AUDIT ERROR] {type(e).__name__}: {e}")
        db.rollback()
