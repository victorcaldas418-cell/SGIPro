from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=False, default="Sistema")
    entity_type = Column(String, nullable=False, index=True)
    # CLIENT | PROPERTY | CONTRACT | ANDAMENTO | INSTALLMENT
    entity_id = Column(Integer, nullable=True, index=True)
    contract_id = Column(Integer, nullable=True, index=True)  # usado para ANDAMENTO
    action = Column(String, nullable=False)
    # CRIAR | ATUALIZAR | EXCLUIR | STATUS | PAGAMENTO
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
