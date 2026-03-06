from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

# Opciones fijas (Enums)
class TaskType(str, enum.Enum):
    study = "study"
    class_ = "class"
    personal = "personal"
    break_ = "break"

class Priority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

# 🔐 Tabla de Usuarios (Autenticación)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación con tareas
    tasks = relationship("Task", back_populates="user")

# Tabla de Tareas
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Selectores
    type = Column(Enum(TaskType), default=TaskType.study)
    priority = Column(Enum(Priority), default=Priority.medium)
    
    # Fechas
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration = Column(Integer, nullable=False)
    
    # Interruptores
    is_fixed = Column(Boolean, default=False)
    email_reminder = Column(Boolean, default=True)
    repeat_weekly = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)
    
    # Relación con usuario
    user = relationship("User", back_populates="tasks")