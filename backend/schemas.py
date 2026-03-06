from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import datetime
from models import TaskType, Priority
from pydantic import ConfigDict

# ============== ESQUEMAS DE USUARIO ==============

class UserRegister(BaseModel):
    """Esquema para registrar un nuevo usuario"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
class UserLogin(BaseModel):
    """Esquema para login"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str

class TokenResponse(BaseModel):
    """Respuesta de autenticación"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


# ============== ESQUEMAS DE TAREAS ==============

# Esquema base (datos comunes)
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    type: TaskType
    priority: Priority
    
    # Usamos datetime.date para diferenciarlo del campo 'date'
    date: datetime.date 
    start_time: datetime.time
    end_time: datetime.time
    
    duration: int = Field(..., ge=1, le=1440)  # Entre 1 minuto y 24 horas
    is_fixed: bool = False
    email_reminder: bool = True
    repeat_weekly: bool = False
    completed: bool = False

# Esquema para CREAR
class TaskCreate(TaskBase):
    pass

# Esquema para ACTUALIZAR (parcial)
class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[TaskType] = None
    priority: Optional[Priority] = None
    
    # Aquí estaba el error, ahora usamos datetime.date
    date: Optional[datetime.date] = None 
    start_time: Optional[datetime.time] = None
    end_time: Optional[datetime.time] = None
    
    duration: Optional[int] = Field(None, ge=1, le=1440)
    is_fixed: Optional[bool] = None
    email_reminder: Optional[bool] = None
    repeat_weekly: Optional[bool] = None
    completed: Optional[bool] = None

# Esquema para LEER
class Task(TaskBase):
    id: int
    user_id: int
    
    # Sintaxis moderna V2
    model_config = ConfigDict(from_attributes=True)


# Esquema para un Descanso (Input del usuario)
class BreakInterval(BaseModel):
    start_time: str # "HH:MM"
    end_time: str   # "HH:MM"

# Esquema para la Petición de Optimización
class OptimizationRequest(BaseModel):
    day_start: str
    day_end: str
    breaks: list[BreakInterval] = []

# Esquema para la Propuesta de Cambio (Respuesta de la IA)
class TaskProposal(BaseModel):
    task_id: int
    title: str
    old_start: Optional[datetime.time]
    new_start: datetime.time
    new_end: datetime.time