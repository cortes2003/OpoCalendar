from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Enum
from database import Base
import enum

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

# Tabla de Tareas
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
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