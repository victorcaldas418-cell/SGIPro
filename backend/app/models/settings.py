from sqlalchemy import Column, Integer, Text, ForeignKey
from app.database import Base

DEFAULT_WHATSAPP_TEMPLATE = (
    "Olá {locatario_nome}! Sua parcela referente ao contrato CR-{contrato_id} "
    "no valor de {valor} vence em {vencimento}. "
    "Por favor, efetue o pagamento até a data de vencimento."
)

class OrgSettings(Base):
    __tablename__ = "org_settings"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, unique=True, index=True)
    whatsapp_message_template = Column(Text, default=DEFAULT_WHATSAPP_TEMPLATE)
