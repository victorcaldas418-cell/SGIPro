from sqlalchemy import Column, Integer, String, Boolean, Date, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class ClientType(enum.Enum):
    PF = "PF"
    PJ = "PJ"

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    type = Column(Enum(ClientType), nullable=False)
    name = Column(String, index=True, nullable=False) # Nome ou Razão Social
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    status = Column(Boolean, default=True) # Ativo / Inativo

    # Endereço comum
    zipcode = Column(String, nullable=True)
    address = Column(String, nullable=True)
    number = Column(String, nullable=True)
    complement = Column(String, nullable=True)
    neighborhood = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

    # Dados PF
    cpf = Column(String, index=True, nullable=True)
    rg = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)

    # Dados PJ
    trading_name = Column(String, nullable=True) # Nome Fantasia
    cnpj = Column(String, index=True, nullable=True)
    state_registration = Column(String, nullable=True)

    # Relacionamentos
    # Um cliente pode ser proprietário (locador) ou inquilino (locatário) de vários contratos.
    # Esses relacionamentos serão criados no modelo de Contrato.
    
    # Se for PJ, pode ter associados (representantes legais / sócios)
    associates = relationship(
        "ClientAssociate",
        back_populates="company",
        cascade="all, delete-orphan",
        foreign_keys="[ClientAssociate.company_id]"
    )

class AssociateRole(enum.Enum):
    SOCIO = "Sócio"
    SOCIO_ADMIN = "Sócio Administrador"
    ADMINISTRADOR = "Administrador"
    DIRETOR = "Diretor"
    PRESIDENTE = "Presidente"

class ClientAssociate(Base):
    """ Tabela de junção/dados para guardar quem são os sócios de uma PJ """
    __tablename__ = "client_associates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # O sócio poderia ser outro 'Client' registrado ou apenas um cadastro aqui mesmo
    person_id = Column(Integer, ForeignKey("clients.id"), nullable=True) # Se o associado for um Client PF já cadastrado

    name = Column(String, nullable=False) # Caso o person_id seja Nulo e cadastre apenas o nome
    cpf = Column(String, nullable=True)
    role = Column(Enum(AssociateRole), nullable=False)

    company = relationship("Client", back_populates="associates", foreign_keys="[ClientAssociate.company_id]")
    person = relationship("Client", foreign_keys="[ClientAssociate.person_id]")
