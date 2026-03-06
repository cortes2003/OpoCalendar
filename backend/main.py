from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZIPMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List
import os
from datetime import timedelta
import logging

import models, schemas, crud, ai_service
from database import engine, get_db
from auth import get_current_user, create_access_token, create_refresh_token, validate_input
from auth import get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import date

# Configurar logging de auditoría
logging.basicConfig(level=logging.INFO)
audit_logger = logging.getLogger("audit")

# Crear tablas al inicio
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OpoCalendar API - Secured",
    description="Study planner with AI optimization - Production Ready",
    version="2.0.0"
)

# ✅ RATE LIMITING
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta más tarde.")

# ✅ CORS RESTRICTIVO (Solo localhost en dev, producción específica en prod)
allowed_origins = [
    "http://localhost:5173",      # Frontend desarrollo
    "http://localhost:3000",       # Alternativa
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),  # Variable de entorno
]

# Permitir orígenes adicionales desde variable de entorno
if os.getenv("ADDITIONAL_ORIGINS"):
    allowed_origins.extend(os.getenv("ADDITIONAL_ORIGINS", "").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # ✅ Métodos específicos
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],  # ✅ Headers específicos
    max_age=3600,  # Cache CORS 1 hora
    expose_headers=["X-Total-Count"],  # Headers expuestos al cliente
)

# ✅ TRUSTED HOSTS (Previene ataques de redirección)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", os.getenv("FRONTEND_HOST", "localhost")]
)

# ✅ GZIP COMPRESSION (Reduce tamaño de respuestas)
app.add_middleware(GZIPMiddleware, minimum_size=1000)

# ✅ SECURITY HEADERS (Middleware personalizado)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"  # Previene MIME type sniffing
    response.headers["X-Frame-Options"] = "DENY"  # Respuesta no puede ser framed
    response.headers["X-XSS-Protection"] = "1; mode=block"  # Protección XSS histórica
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"  # HSTS
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'"  # CSP
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.get("/")
def read_root():
    return {
        "mensaje": "¡OpoCalendar API v2 - Segura!",
        "estado": "Funcionando",
        "autenticacion": "Requerida",
        "version": "2.0.0"
    }

# ============== ENDPOINTS DE AUTENTICACIÓN ==============

@app.post("/auth/register", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")  # Máximo 5 registros por minuto
async def register(request, user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario"""
    try:
        # Validar inputs
        username = validate_input(user_data.username, "Usuario", max_length=50)
        email = validate_input(user_data.email, "Email", max_length=255)
        
        # Verificar si usuario existe
        existing_user = db.query(models.User).filter(
            (models.User.username == username) | (models.User.email == email)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Usuario o email ya registrado"
            )
        
        # Crear nuevo usuario
        hashed_pwd = get_password_hash(user_data.password)
        new_user = models.User(
            username=username,
            email=email,
            hashed_password=hashed_pwd
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generar tokens
        access_token = create_access_token(
            data={"sub": new_user.id, "username": new_user.username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(data={"sub": new_user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")  # Máximo 10 intentos por minuto
async def login(request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Autenticar usuario"""
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generar tokens
    access_token = create_access_token(
        data={"sub": user.id, "username": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/auth/refresh", response_model=schemas.TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refrescar token de acceso"""
    access_token = create_access_token(
        data={"sub": current_user["user_id"], "username": current_user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/auth/logout")
@limiter.limit("10/minute")
async def logout(request, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout del usuario - invalida sesión"""
    audit_logger.info(f"Usuario {current_user['user_id']} ha cerrado sesión")
    # En producción, guardarías el token en una blacklist
    return {"message": "Sesión cerrada exitosamente"}


# ============== ENDPOINTS DE TAREAS (AUTENTICADOS) ==============

# 1. Obtener tareas del usuario autenticado
@app.get("/tasks", response_model=List[schemas.Task])
@limiter.limit("30/minute")
async def read_tasks(request, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_tasks(db, user_id=current_user["user_id"])

# 2. Crear una tarea
@app.post("/tasks", response_model=schemas.Task)
@limiter.limit("20/minute")
async def create_task(request, task: schemas.TaskCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.create_task(db=db, task=task, user_id=current_user["user_id"])

# 3. Borrar una tarea
@app.delete("/tasks/{task_id}")
@limiter.limit("20/minute")
async def delete_task(request, task_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    success = crud.delete_task(db, task_id, user_id=current_user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"message": "Tarea eliminada"}

# 4. Actualizar una tarea
@app.put("/tasks/{task_id}", response_model=schemas.Task)
@limiter.limit("20/minute")
async def update_task(request, task_id: int, task: schemas.TaskUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    updated_task = crud.update_task(db, task_id, task, user_id=current_user["user_id"])
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    audit_logger.info(f"Usuario {current_user['user_id']} actualizó tarea {task_id}")
    return updated_task

# ============== HEALTH CHECK ==============
@app.get("/health")
async def health_check():
    """Verificar estado de la API"""
    return {"status": "healthy", "version": "2.0.0"}

# Endpoints de IA - con autenticación
@app.post("/optimize/calculate/{target_date}", response_model=List[schemas.TaskProposal])
@limiter.limit("10/minute")
async def calculate_optimization(
    request,
    target_date: date,
    req: schemas.OptimizationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ai_service.calculate_schedule(db, target_date, req, user_id=current_user["user_id"])

@app.post("/optimize/apply")
@limiter.limit("10/minute")
async def apply_optimization(request, proposals: List[schemas.TaskProposal], current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    count = 0
    for p in proposals:
        db_task = crud.get_task(db, p.task_id, user_id=current_user["user_id"])
        if db_task:
            db_task.start_time = p.new_start
            db_task.end_time = p.new_end
            count += 1
    db.commit()
    return {"message": f"{count} tareas actualizadas correctamente"}

# 4. Actualizar una tarea (Editar / Completar)
@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)): # <--- OJO: TaskUpdate
    updated_task = crud.update_task(db, task_id, task)
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return updated_task

# Endpoints de IA - orden importante: rutas específicas primero
@app.post("/optimize/calculate/{target_date}", response_model=List[schemas.TaskProposal])
def calculate_optimization(
    target_date: date, 
    request: schemas.OptimizationRequest,
    db: Session = Depends(get_db)
):
    return ai_service.calculate_schedule(db, target_date, request)

# 2. Endpoint para APLICAR (Guardar cambios)
@app.post("/optimize/apply")
def apply_optimization(proposals: List[schemas.TaskProposal], db: Session = Depends(get_db)):
    count = 0
    for p in proposals:
        db_task = crud.get_task(db, p.task_id)
        if db_task:
            db_task.start_time = p.new_start
            db_task.end_time = p.new_end
            count += 1
    db.commit()
    return {"message": f"{count} tareas actualizadas correctamente"}