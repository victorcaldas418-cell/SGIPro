from sqlalchemy import Column, Integer, String, Boolean, Float, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class PropertyOccupancyStatus(enum.Enum):
    OCUPADO = "Ocupado"
    DESOCUPADO = "Desocupado"

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    description = Column(String, nullable=False) # Ex: Edifício Comercial XYZ
    address = Column(String, nullable=False)
    number = Column(String, nullable=False)
    complement = Column(String, nullable=True)
    neighborhood = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zipcode = Column(String, nullable=True)
    
    total_area_m2 = Column(Float, nullable=False)
    status = Column(Enum(PropertyOccupancyStatus), default=PropertyOccupancyStatus.DESOCUPADO)

    # Info Matrículas
    current_registry_office = Column(String, nullable=True) # Nome do Cartório
    current_registry_number = Column(String, nullable=True) # Matrícula atual
    cnm = Column(String, nullable=True) # Cadastro Nacional de Matrículas
    municipal_registration = Column(String, nullable=True) # Inscrição Imobiliária

    # IPTU Config
    iptu_total_value = Column(Float, default=0.0)
    iptu_discount_value = Column(Float, default=0.0)

    # Relacionamentos
    # O imóvel pode ter um locador atual em um contrato e etc.
    # Será referenciado em Contratos
    subunits = relationship("SubUnit", back_populates="property", cascade="all, delete-orphan")
    accounts = relationship("ServiceAccount", back_populates="property", cascade="all, delete-orphan")

class SubUnit(Base):
    """ Tabela de Subdivisões (Salas, Apartamentos) """
    __tablename__ = "property_subunits"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    identifier = Column(String, nullable=False) # Sala 101, Apto 2B
    area_m2 = Column(Float, nullable=False)
    status = Column(Enum(PropertyOccupancyStatus), default=PropertyOccupancyStatus.DESOCUPADO)

    # Pode ser locado separadamente
    property = relationship("Property", back_populates="subunits")

class ServiceAccountType(enum.Enum):
    AGUA = "Água"
    ENERGIA = "Energia"
    TELEFONIA = "Telefonia"
    OUTROS = "Outros"

class ServiceAccountStatus(enum.Enum):
    ATIVO = "Ativo"
    SUSPENSO = "Suspenso"
    ENCERRADO = "Encerrado"

class ServiceAccount(Base):
    """ Varias contas num imovel """
    __tablename__ = "property_service_accounts"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    service_type = Column(Enum(ServiceAccountType), nullable=False)
    provider_name = Column(String, nullable=False) # Ex: Sabesp, Enel
    account_number = Column(String, nullable=False) # Numero da instalação / Código do cliente
    status = Column(Enum(ServiceAccountStatus), default=ServiceAccountStatus.ATIVO)

    property = relationship("Property", back_populates="accounts")
