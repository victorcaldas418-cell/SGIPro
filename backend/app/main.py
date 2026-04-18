from fastapi import FastAPI
from app.database import engine, Base
import app.models  # Garante que todas as tabelas estão na metadata


def _run_migrations():
    """Adiciona colunas/valores novos sem perder dados existentes."""
    db_url = str(engine.url)

    # Migração PostgreSQL: adiciona novos valores ao enum contractstatus
    if not db_url.startswith("sqlite"):
        from sqlalchemy import text
        new_values = ["Em Elaboração", "Encaminhado para Assinatura"]
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            for val in new_values:
                try:
                    conn.execute(text(f"ALTER TYPE contractstatus ADD VALUE IF NOT EXISTS '{val}'"))
                except Exception as e:
                    print(f"[MIGRATION PG] enum note: {e}")
        return

    if not db_url.startswith("sqlite"):
        return

    from sqlalchemy import text
    migrations = [
        ("clients", "organization_id", "INTEGER REFERENCES organizations(id)"),
        ("properties", "organization_id", "INTEGER REFERENCES organizations(id)"),
        ("contracts", "organization_id", "INTEGER REFERENCES organizations(id)"),
    ]
    with engine.connect() as conn:
        for table, column, col_def in migrations:
            table_exists = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"),
                {"t": table}
            ).fetchone()
            if not table_exists:
                continue

            existing_columns = [
                row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            ]
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
                conn.commit()


# Cria as tabelas (se ainda não existirem) antes de rodar migrações
Base.metadata.create_all(bind=engine)
_run_migrations()

# Garante que o SUPER_ADMIN e a org master existem (idempotente)
def _seed_on_startup():
    from app.database import SessionLocal
    from app.services.auth_service import seed_super_admin
    from app.core.config import settings
    try:
        db = SessionLocal()
        result = seed_super_admin(db)
        db.close()
        print(f"[STARTUP SEED] {result}")
    except Exception as e:
        print(f"[STARTUP SEED ERROR] {type(e).__name__}: {e}")
    print(f"[STARTUP] GOOGLE_CLIENT_ID configured: {bool(settings.GOOGLE_CLIENT_ID)} (len={len(settings.GOOGLE_CLIENT_ID)})")

_seed_on_startup()

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
from app.routes import auth, users, settings, audit
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
