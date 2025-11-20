from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- TUS CREDENCIALES ---
# IMPORTANTE: Cambia 'TU_CONTRASEÑA' por la que usas para entrar a MySQL Workbench.
# Si tu usuario no es 'root', cámbialo también.
USUARIO = "root"
PASSWORD = "1234"
HOST = "localhost"
PUERTO = "3306"
BASE_DATOS = "opoflow_db"

# Creamos la URL de conexión para MySQL
SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{USUARIO}:{PASSWORD}@{HOST}:{PUERTO}/{BASE_DATOS}"

# Creamos el motor (el coche que lleva los datos)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Creamos la sesión (la carretera)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para nuestros modelos
Base = declarative_base()

# Función para usar la base de datos en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()