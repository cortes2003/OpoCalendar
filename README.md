# 📅 OpoCalendar -- Planificador Inteligente para Opositores

**OpoCalendar** es una aplicación Full Stack diseñada para optimizar el tiempo de estudio de opositores y estudiantes. Utiliza un motor de Inteligencia Artificial (Python) para reorganizar automáticamente la agenda diaria, rellenando huecos libres con tareas de estudio mientras respeta horarios fijos (clases, comidas) y descansos.

![Estado](https://img.shields.io/badge/Estado-Beta_Funcional-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)
![Stack](https://img.shields.io/badge/Stack-MERN_Hybrid-orange)

------------------------------------------------------------------------

## 🚀 Características Principales

* **🧠 IA de Optimización (Gap Filling):** Algoritmo en Python que calcula automáticamente dónde encajar tus sesiones de estudio basándose en tu disponibilidad, prioridad de la tarea y duración.
* **📅 Calendario Interactivo:** Visualización mensual completa y vista de agenda diaria ("Timeline").
* **🎨 Interfaz Moderna y Responsiva:** Diseñada con un enfoque *mobile-first* pero con un panel de control completo para escritorio (Dashboard a pantalla completa).
* **⚡ Persistencia Real:** Base de datos MySQL conectada mediante API REST (FastAPI).
* **🔔 Sistema de Notificaciones:** Alertas en el navegador y simulador de envío de correos.
* **⚙️ Configuración Personalizada:** Define tu horario de sueño/actividad y preferencias personales.

------------------------------------------------------------------------

## 🛠️ Stack Tecnológico

El proyecto sigue una arquitectura de **Monorepo** dividida en dos servicios:

### 🖥️ Frontend (La Interfaz)
* **Framework:** React 18 + TypeScript
* **Build Tool:** Vite
* **Estilos:** Tailwind CSS v4
* **UI Components:** Lucide React (Iconos)
* **Gestión de Fechas:** Date-fns

### 🧠 Backend (El Cerebro)
* **Lenguaje:** Python 3.11+
* **Framework API:** FastAPI
* **Servidor:** Uvicorn
* **Base de Datos:** MySQL
* **ORM:** SQLAlchemy
* **Ciencia de Datos:** Pandas, NumPy, Scikit-learn

------------------------------------------------------------------------

## 📦 Estructura del Proyecto

    OpoCalendar/
    ├── backend/  # Servidor Python, API y Lógica de IA
    │   ├── venv/  # Entorno virtual (no se sube a git)
    │   ├── main.py
    │   └── ...
    ├── opoflow/
    │   ├── src/
    │   └── ...
    └── README.md

------------------------------------------------------------------------

## 🏁 Guía de Instalación y Ejecución
Para ejecutar el sistema completo en local, necesitas tener instalados: Python, Node.js y MySQL.

### Paso 1: Configuración de Base de Datos
1. Abre tu gestor de MySQL (Workbench o Terminal).
2. Crea una base de datos vacía llamada opoflow_db.

``` sql
CREATE DATABASE opoflow_db;
```

### Paso 2: Arrancar el Backend
Abre una terminal en la raíz del proyecto:

``` bash
cd backend

# 1. Crear entorno virtual (solo la primera vez)
python -m venv venv

# 2. Activar entorno virtual
# Windows:
.\venv\Scripts\Activate
# Mac/Linux:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar conexión a BD
# Abre backend/database.py y edita la variable SQLALCHEMY_DATABASE_URL con tu contraseña de MySQL.

# 5. Iniciar servidor
uvicorn main:app --reload --reload-exclude 'venv/*'
```

El servidor estará escuchando en: http://127.0.0.1:8000

------------------------------------------------------------------------

### 3. Paso 3: Arrancar el Frontend
Abre otra terminal nueva en la raíz del proyecto:

``` bash
cd opoflow

# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Iniciar aplicación web
npm run dev
```

La web estará disponible en: http://localhost:5173

------------------------------------------------------------------------

## 🤖 Cómo Funciona la IA

El servicio de optimización (backend/ai_service.py) sigue esta lógica:

1. **Input**: Recibe el día objetivo y los límites horarios del usuario (ej: 09:00 - 21:00).
2. **Análisis**: Recupera todas las tareas de la base de datos para ese día.
3. **Clasificación**: Separa las tareas en Fijas (Inamovibles) y Flexibles (Reorganizables).
4. **Detección de Huecos**: Calcula los intervalos de tiempo libre entre las tareas fijas.
5. **Asignación**: Ordena las tareas flexibles por prioridad y duración, y las encaja en los huecos disponibles sin solaparse.
6. **Persistencia**: Guarda los nuevos horarios automáticamente en MySQL.

------------------------------------------------------------------------

## 📚 Documentación API

Puedes ver y probar los endpoints del backend (Crear tarea, Optimizar, etc.) accediendo a la documentación automática generada por Swagger:

👉 Ver Documentación API http://127.0.0.1:8000/docs (Solo con el backend encendido)

------------------------------------------------------------------------

## 👤 Autor

Desarrollado por **Alberto Cortés**.
