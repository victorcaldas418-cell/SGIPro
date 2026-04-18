from fastapi import FastAPI
from app.database import engine, Base
import app.models  # Garante que todas as tabelas estão na metadata


def _run_migrations():
    """Adiciona colunas novas em tabelas existentes (sem Alembic)."""
    migrations = [
        ("clients", "organization_id", "INTEGER REFERENCES organizations(id)"),
        ("properties", "organization_id", "INTEGER REFERENCES organizations(id)"),
        ("contracts", "organization_id", "INTEGER REFERENCES organizations(id)"),
    ]
    with engine.connect() as conn:
        for table, column, col_def in migrations:
            result = conn.execute(
                __import__("sqlalchemy").text(f"PRAGMA table_info({table})")
            )
            existing_columns = [row[1] for row in result.fetchall()]
            if column not in existing_columns:
                conn.execute(
                    __import__("sqlalchemy").text(
                        f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"
                    )
                )
                conn.commit()


# Cria as tabelas (se ainda não existirem) antes de rodar migrações
Base.metadata.create_all(bind=engine)
_run_migrations()

app = FastAPI(
    title="Sistema de Gestão Imobiliária (SGI)",
    description="API robusta para gestão de imóveis, clientes, contratos e financeiro.",
    version="1.0.0"
)

# Configurando rotas CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://victorcaldas418-cell.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SGI API is Running!"}

# Rotas existentes
from app.routes import clients, properties, contracts
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])

# Novas rotas de autenticação e usuários
from app.routes import auth, users
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
