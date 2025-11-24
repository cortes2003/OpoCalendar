from pydantic import BaseModel
from typing import Optional
import datetime
from models import TaskType, Priority

# Esquema base (datos comunes)
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: TaskType
    priority: Priority
    
    # Usamos datetime.date para diferenciarlo del campo 'date'
    date: datetime.date 
    start_time: datetime.time
    end_time: datetime.time
    
    duration: int
    is_fixed: bool = False
    email_reminder: bool = True
    repeat_weekly: bool = False
    completed: bool = False

# Esquema para CREAR
class TaskCreate(TaskBase):
    pass

# Esquema para ACTUALIZAR (parcial)
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[TaskType] = None
    priority: Optional[Priority] = None
    
    # Aquí estaba el error, ahora usamos datetime.date
    date: Optional[datetime.date] = None 
    start_time: Optional[datetime.time] = None
    end_time: Optional[datetime.time] = None
    
    duration: Optional[int] = None
    is_fixed: Optional[bool] = None
    email_reminder: Optional[bool] = None
    repeat_weekly: Optional[bool] = None
    completed: Optional[bool] = None

# Esquema para LEER
class Task(TaskBase):
    id: int

    class Config:
        from_attributes = True