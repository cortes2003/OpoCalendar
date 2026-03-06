"""
OpoCalendar Authentication Module
Maneja autenticación JWT y gestión de usuarios con cifrado de datos sensibles
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import re

# Configuración de seguridad
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise ValueError("⚠️ CRITICAL: SECRET_KEY debe estar en variable de entorno y tener más de 32 caracteres")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())  # Generar si no existe

# Contexto de hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Encriptación Fernet
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

# Bearer token security
security = HTTPBearer()

class TokenData:
    def __init__(self, sub: str, user_id: int, exp: datetime):
        self.sub = sub
        self.user_id = user_id
        self.exp = exp

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT de acceso."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Crea un token JWT de refresco."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> dict:
    """
    Valida el token JWT y retorna los datos del usuario.
    Levanta HTTPException si el token es inválido.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"user_id": user_id, "username": payload.get("username")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado o inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_input(value: str, field_name: str, max_length: int = 255) -> str:
    """
    Valida y sanitiza entrada de usuario.
    Previene inyecciones SQL, XSS y otros ataques.
    """
    if not value or not isinstance(value, str):
        raise ValueError(f"{field_name} inválido")
    
    # Limita longitud
    if len(value) > max_length:
        raise ValueError(f"{field_name} excede longitud máxima de {max_length}")
    
    # Validar email si es campo email
    if field_name == "Email":
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise ValueError("Email inválido")
    
    # Validar username (alfanumérico + guiones bajos)
    if field_name == "Usuario":
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', value):
            raise ValueError("Usuario debe contener solo letras, números y guiones bajos")
    
    # Elimina caracteres peligrosos comunes
    dangerous_patterns = [
        r"('"|\")",  # Comillas
        r"(--|;)",    # SQL comments
        r"(\*/|/\*)",  # Block comments
        r"(xp_|sp_)",  # SQL Server procs
        r"(<script|javascript:|onerror=)",  # XSS
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, value, re.IGNORECASE):
            raise ValueError(f"{field_name} contiene caracteres no permitidos")
    
    return value.strip()

def encrypt_sensitive(data: str) -> str:
    """Encripta datos sensibles"""
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_sensitive(encrypted_data: str) -> str:
    """Desencripta datos sensibles"""
    return cipher_suite.decrypt(encrypted_data.encode()).decode()
