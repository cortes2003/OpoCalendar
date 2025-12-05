from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date, time

from database import Base, get_db
from main import app

# --- CONFIGURACIÓN DE BASE DE DATOS DE PRUEBA (SQLite en Memoria) ---
# Usamos SQLite en memoria para que sea ultra-rápido y no toque tu MySQL real
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Reiniciamos la BD antes de cada sesión de tests
def setup_module(module):
    Base.metadata.create_all(bind=engine)

# --- 1. TESTS DE CREACIÓN (CREATE) ---

def test_create_task_happy_path():
    """Prueba crear una tarea con todos los datos correctos"""
    response = client.post("/tasks", json={
        "title": "Estudiar Constitución",
        "description": "Artículos 1-10",
        "type": "study",
        "priority": "high",
        "date": str(date.today()),
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "duration": 60,
        "is_fixed": False,
        "email_reminder": True,
        "repeat_weekly": False,
        "completed": False
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Estudiar Constitución"
    assert data["id"] == 1

def test_create_task_missing_fields():
    """Prueba que falle si falta un campo obligatorio (ej: título)"""
    response = client.post("/tasks", json={
        "description": "Sin título",
        "type": "study",
        # Falta title, date, etc.
    })
    assert response.status_code == 422 # Unprocessable Entity

def test_create_task_invalid_types():
    """Prueba enviar un string donde va un booleano o fecha inválida"""
    response = client.post("/tasks", json={
        "title": "Error Fechas",
        "type": "study",
        "priority": "high",
        "date": "fecha-invalida", # ERROR
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "duration": 60
    })
    assert response.status_code == 422

# --- 2. TESTS DE LECTURA (READ) ---

def test_read_tasks():
    """Debe devolver la lista con la tarea creada antes"""
    response = client.get("/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Estudiar Constitución"

# --- 3. TESTS DE ACTUALIZACIÓN (UPDATE) ---

def test_update_task_success():
    """Modificar una tarea existente"""
    response = client.put("/tasks/1", json={
        "title": "Estudiar Modificado",
        "completed": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Estudiar Modificado"
    assert data["completed"] == True

def test_update_task_not_found():
    """Intentar modificar una tarea que no existe (ID 999)"""
    response = client.put("/tasks/999", json={"title": "Fantasma"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Tarea no encontrada"

# --- 4. TESTS DE IA (OPTIMIZE) ---

def test_optimize_endpoint_structure():
    """Verificar que el endpoint de cálculo responde al esquema correcto"""
    # Creamos una situación: Tarea existente hoy
    today = str(date.today())
    
    # Lanzamos el cálculo
    payload = {
        "day_start": "08:00",
        "day_end": "22:00",
        "breaks": [{"start_time": "14:00", "end_time": "15:00"}]
    }
    response = client.post(f"/optimize/calculate/{today}", json=payload)
    
    # Debe responder 200 OK y una lista (aunque esté vacía si ya está optimizado)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_optimize_apply_changes():
    """Simular aplicación de cambios de la IA"""
    propuesta = [{
        "task_id": 1,
        "title": "Estudiar Modificado",
        "old_start": "09:00:00",
        "new_start": "10:00:00",
        "new_end": "11:00:00"
    }]
    response = client.post("/optimize/apply", json=propuesta)
    assert response.status_code == 200
    
    # Verificar que se cambió en BD
    task_res = client.get("/tasks")
    task = next(t for t in task_res.json() if t["id"] == 1)
    assert task["start_time"] == "10:00:00"

# --- 5. TESTS DE BORRADO (DELETE) ---

def test_delete_task_success():
    """Borrar la tarea 1"""
    response = client.delete("/tasks/1")
    assert response.status_code == 200

def test_delete_task_not_found():
    """Intentar borrar la tarea 1 otra vez (ya no existe)"""
    response = client.delete("/tasks/1")
    assert response.status_code == 404