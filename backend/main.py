from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, crud, ai_service
from database import engine, get_db
from datetime import date
from typing import List

# Crear tablas al inicio
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="OpoFlow API")

@app.get("/")
def read_root():
    return {"mensaje": "¡Hola desde el Backend de OpoFlow!", "estado": "Funcionando 🚀"}

# CORS (Permitir que React hable con Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS (ENDPOINTS) ---

# 1. Obtener todas las tareas
@app.get("/tasks", response_model=List[schemas.Task])
def read_tasks(db: Session = Depends(get_db)):
    return crud.get_tasks(db)

# 2. Crear una tarea
@app.post("/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db=db, task=task)

# 3. Borrar una tarea
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"message": "Tarea eliminada"}

# 4. Actualizar una tarea (Editar / Completar)
@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)): # <--- OJO: TaskUpdate
    updated_task = crud.update_task(db, task_id, task)
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return updated_task

# 5. Endpoint de IA
@app.post("/optimize/{target_date}")
def optimize_schedule(
    target_date: date, 
    day_start: str = "08:00", # Valores por defecto por seguridad
    day_end: str = "22:00", 
    db: Session = Depends(get_db)
):
    return ai_service.optimize_day(db, target_date, day_start, day_end)

# 1. Endpoint para CALCULAR (Simulación)
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