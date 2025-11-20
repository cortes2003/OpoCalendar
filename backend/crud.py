from sqlalchemy.orm import Session
import models, schemas

# --- LEER ---
def get_tasks(db: Session):
    return db.query(models.Task).all()

def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()

# --- CREAR ---
def create_task(db: Session, task: schemas.TaskCreate):
    # Convertimos el esquema de Pydantic al modelo de SQLAlchemy
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# --- BORRAR ---
def delete_task(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

# --- ACTUALIZAR ---
def update_task(db: Session, task_id: int, task_update: schemas.TaskCreate):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        return None
    
    # Actualizamos campo a campo
    task_data = task_update.dict(exclude_unset=True)
    for key, value in task_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task