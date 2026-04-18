from sqlalchemy import Column, Integer, String, Boolean, Float, Date, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
import enum
from app.database import Base
from datetime import date

class IndexType(enum.Enum):
    IGPM = "IGPM"
    IPCA = "IPCA"
    INPC = "INPC"

class ContractStatus(enum.Enum):
    EM_ELABORACAO = "Em Elaboração"
    ENCAMINHADO_ASSINATURA = "Encaminhado para Assinatura"
    ATIVO = "Ativo"
    FINALIZADO = "Finalizado"
    RESCINDIDO = "Rescindido"

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    # Relações Principais
    locador_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    locatario_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Pode ser o Imóvel Inteiro ou Apenas a Subdivisão
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    subunit_id = Column(Integer, ForeignKey("property_subunits.id"), nullable=True)

    # Datas e Prazos
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.ATIVO)

    # Financeiro
    base_rent_value = Column(Float, nullable=False) # Valor base atual do aluguel
    
    # Reajuste
    adjustment_month = Column(Integer, nullable=False) # Mês de reajuste ex: 1 = Janeiro
    adjustment_min_percentage = Column(Float, default=0.0) # Piso de reajuste garantido

    # Multas e Encargos
    penalty_rescission_value = Column(Float, default=0.0) # Valor de rescisão base (ex: 3 alugueis)
    penalty_default_perc = Column(Float, default=10.0) # Multa por atraso (ex: 10%)
    interest_default_perc = Column(Float, default=1.0) # Juros de mora mensal (ex: 1%)
    inflation_index = Column(Enum(IndexType), nullable=True) # Ex: IGPM

    # Relacionamentos
    locador = relationship("Client", foreign_keys=[locador_id])
    locatario = relationship("Client", foreign_keys=[locatario_id])
    property = relationship("Property")
    subunit = relationship("SubUnit")
    
    indexes = relationship("ContractIndex", back_populates="contract", cascade="all, delete-orphan")
    installments = relationship("Installment", back_populates="contract", cascade="all, delete-orphan")
    amendments = relationship("ContractAmendment", back_populates="contract", cascade="all, delete-orphan")
    andamentos = relationship("ContractAndamento", back_populates="contract", cascade="all, delete-orphan")

class ContractIndex(Base):
    """ Índices cadastrados para ver o maior aplicável no reajuste deste contrato """
    __tablename__ = "contract_indexes"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    index_name = Column(Enum(IndexType), nullable=False)

    contract = relationship("Contract", back_populates="indexes")

class ContractAmendment(Base):
    """ Registro de termos aditivos """
    __tablename__ = "contract_amendments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    signature_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)

    contract = relationship("Contract", back_populates="amendments")

class InstallmentStatus(enum.Enum):
    PENDENTE = "Pendente"
    PAGO = "Pago"
    ATRASO = "Em Atraso"
    CANCELADO = "Cancelado"

class Installment(Base):
    __tablename__ = "installments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    
    reference_month = Column(Integer, nullable=False)
    reference_year = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    
    # Valores originais
    base_value = Column(Float, nullable=False) # Valor do aluguel
    iptu_value = Column(Float, default=0.0) # Proporcional do mês
    other_fees_value = Column(Float, default=0.0)
    
    # Calculo dinâmico de mora e valores totais
    penalty_value = Column(Float, default=0.0)
    interest_value = Column(Float, default=0.0)
    inflation_value = Column(Float, default=0.0)
    total_value = Column(Float, nullable=False)

    status = Column(Enum(InstallmentStatus), default=InstallmentStatus.PENDENTE)
    payment_date = Column(Date, nullable=True) # Só preenche quando pago

    contract = relationship("Contract", back_populates="installments")

class ContractAndamento(Base):
    __tablename__ = "contract_andamentos"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    contract = relationship("Contract", back_populates="andamentos")
