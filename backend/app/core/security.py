from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_google_token(token: str) -> Optional[dict]:
    """Verifica o ID token retornado pelo Google Identity Services."""
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        return idinfo
    except Exception as e:
        print(f"[GOOGLE AUTH ERROR] {type(e).__name__}: {e}")
        print(f"[GOOGLE AUTH ERROR] Expected audience (GOOGLE_CLIENT_ID): {settings.GOOGLE_CLIENT_ID[:30]}...")
        return None


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Dependency: retorna o usuário logado ou lança 401."""
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado. Faça login para continuar.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    print("--- HEADERS RECEIVED ---")
    for k, v in request.headers.items():
        print(f"{k}: {v}")
    print("------------------------")

    if not token:
        print("get_current_user: no token provided (token is None)")
        print("get_current_user: no token provided")
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        print("get_current_user: payload is None (decode failed)")
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        print("get_current_user: sub not found in payload")
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if user is None:
        print(f"get_current_user: user not found or inactive. id={user_id}")
        raise credentials_exception

    return user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Dependency: retorna o usuário logado ou None (sem obrigar autenticação)."""
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None


async def get_current_org_id(
    token: Optional[str] = Depends(oauth2_scheme),
) -> int:
    """Dependency: extrai org_id do JWT. Exige que o usuário tenha uma org selecionada."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Faça login para continuar.",
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )
    org_id = payload.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma organização selecionada. Faça login novamente e selecione uma organização.",
        )
    return int(org_id)


def require_role(*roles):
    """Dependency factory: exige que o usuário tenha um dos roles especificados."""
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role.value not in [r if isinstance(r, str) else r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para acessar este recurso."
            )
        return current_user
    return role_checker
