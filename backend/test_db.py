import sys
from app.database import engine, Base
import app.models

try:
    Base.metadata.create_all(bind=engine)
    print("Sucesso! Banco de Dados e as Tabelas (Clientes, Imóveis, Contratos, Parcelas) foram criadas com êxito.")
    sys.exit(0)
except Exception as e:
    print(f"Erro: {e}")
    sys.exit(1)
