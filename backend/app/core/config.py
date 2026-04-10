from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    SECRET_KEY: str = "sgi-pro-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    SUPER_ADMIN_EMAIL: str = "admin@sgipro.com.br"
    SUPER_ADMIN_NAME: str = "Administrador Master"
    SUPER_ADMIN_PASSWORD: str = "Admin@SGI2024!"
    MASTER_ORG_NAME: str = "Escritório Victor Caldas"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@sgipro.com.br"
    SMTP_FROM_NAME: str = "SGI Pro"

    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
