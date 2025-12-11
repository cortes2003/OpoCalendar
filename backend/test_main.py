from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date

from database import Base, get_db
from main import app

# --- CONFIGURACIÓN DB PRUEBAS (SQLite Memoria) ---
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

def setup_module(module):
    Base.metadata.create_all(bind=engine)

# --- TESTS ---

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["estado"] == "Funcionando 🚀"

def test_create_task_happy_path():
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
    response = client.post("/tasks", json={
        "description": "Sin título",
        "type": "study"
    })
    assert response.status_code == 422

def test_read_tasks():
    response = client.get("/tasks")
    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_update_task_success():
    response = client.put("/tasks/1", json={
        "title": "Estudiar Modificado",
        "completed": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Estudiar Modificado"
    assert data["completed"] == True

def test_update_task_not_found():
    response = client.put("/tasks/999", json={"title": "Fantasma"})
    assert response.status_code == 404

def test_optimize_endpoint_structure():
    today = str(date.today())
    payload = {
        "day_start": "08:00",
        "day_end": "22:00",
        "breaks": [{"start_time": "14:00", "end_time": "15:00"}]
    }
    response = client.post(f"/optimize/calculate/{today}", json=payload)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_optimize_apply_changes():
    # Enviar propuesta válida según schema TaskProposal
    propuesta = [{
        "task_id": 1,
        "title": "Estudiar Modificado",
        "old_start": "09:00:00",
        "new_start": "10:00:00",
        "new_end": "11:00:00"
    }]
    response = client.post("/optimize/apply", json=propuesta)
    assert response.status_code == 200
    
    # Verificar cambio
    task_res = client.get("/tasks")
    # Buscamos la tarea 1
    task = next(t for t in task_res.json() if t["id"] == 1)
    # Nota: La API devuelve HH:MM (sin segundos) por el helper de api.ts, 
    # pero aquí probamos el backend directo que devuelve HH:MM:SS.
    assert task["start_time"] == "10:00:00"

def test_delete_task_success():
    response = client.delete("/tasks/1")
    assert response.status_code == 200

def test_delete_task_not_found():
    response = client.delete("/tasks/1")
    assert response.status_code == 404