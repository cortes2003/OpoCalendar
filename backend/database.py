from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base # <--- Cambio aquí

# TUS CREDENCIALES
USUARIO = "root"
PASSWORD = "1234"
HOST = "localhost"
PUERTO = "3306"
BASE_DATOS = "opoflow_db"

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{USUARIO}:{PASSWORD}@{HOST}:{PUERTO}/{BASE_DATOS}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()