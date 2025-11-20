from pydantic import BaseModel
from typing import Optional
from datetime import date, time
from models import TaskType, Priority

# Esquema base (datos comunes)
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: TaskType
    priority: Priority
    date: date
    start_time: time
    end_time: time
    duration: int
    is_fixed: bool = False
    email_reminder: bool = True
    repeat_weekly: bool = False
    completed: bool = False

# Esquema para CREAR (lo que recibimos del frontend)
class TaskCreate(TaskBase):
    pass

# Esquema para LEER (lo que enviamos al frontend, incluye el ID)
class Task(TaskBase):
    id: int

    class Config:
        from_attributes = True # Esto permite leer desde SQLAlchemy