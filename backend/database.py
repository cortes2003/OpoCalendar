from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env (solo en desarrollo)
load_dotenv()

# Obtener DATABASE_URL desde variable de entorno
# Railway provee DATABASE_URL automáticamente, pero usa formato PostgreSQL
# Para MySQL en Railway, la variable será diferente o necesitarás construirla
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+mysqlconnector://root:1234@localhost:3306/opoflow_db"  # Fallback para desarrollo
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()