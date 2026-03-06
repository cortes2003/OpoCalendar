# 📅 OpoCalendar -- Planificador Inteligente para Opositores

**OpoCalendar** es una aplicación Full Stack diseñada para optimizar el tiempo de estudio de opositores y estudiantes. Utiliza un motor de Inteligencia Artificial (Python) para reorganizar automáticamente la agenda diaria, rellenando huecos libres con tareas de estudio mientras respeta horarios fijos (clases, comidas) y descansos.

![Estado](https://img.shields.io/badge/Estado-v2.0_Segura-green)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)
![Stack](https://img.shields.io/badge/Stack-Python_React_Android-orange)
![Seguridad](https://img.shields.io/badge/Seguridad-JWT_HTTPS_Android-red)

------------------------------------------------------------------------

## 🚀 Características Principales

* **🧠 IA de Optimización (Gap Filling):** Algoritmo en Python que calcula automáticamente dónde encajar tus sesiones de estudio basándose en tu disponibilidad, prioridad de la tarea y duración.
* **📅 Calendario Interactivo:** Visualización mensual completa y vista de agenda diaria ("Timeline").
* **🎨 Interfaz Moderna y Responsiva:** Diseñada con un enfoque *mobile-first* pero con un panel de control completo para escritorio (Dashboard a pantalla completa).
* **⚡ Persistencia Real:** Base de datos MySQL conectada mediante API REST (FastAPI).
* **🔔 Sistema de Notificaciones:** Alertas en el navegador y simulador de envío de correos.
* **⚙️ Configuración Personalizada:** Define tu horario de sueño/actividad y preferencias personales.
* **🔐 Seguridad Enterprise:** JWT, HTTPS, Rate Limiting, XSS Protection, CORS Restrictivo.
* **📱 Soporte Android:** App nativa con Capacitor, lista para Play Store.

------------------------------------------------------------------------

## 🔐 Seguridad (v2.0 - Actualización)

La aplicación ahora cumple con estándares de seguridad internacionales:

- ✅ **Autenticación JWT** con tokens de acceso (30min) y refresco (7 días)
- ✅ **Encriptación** de datos sensibles en tránsito y en reposo
- ✅ **Rate Limiting** por endpoint (5-30 intentos/minuto)
- ✅ **CORS Restrictivo** - solo orígenes autorizados
- ✅ **Validación y Sanitización** contra SQL Injection y XSS
- ✅ **Headers de Seguridad** (HSTS, CSP, X-Frame-Options, etc.)
- ✅ **Almacenamiento Seguro** de tokens en el cliente
- ✅ **Network Security** en Android (Certificate Pinning, cleartext disabled)
- ✅ **Ofuscación de Código** en APK de producción

📖 Ver [SECURITY.md](SECURITY.md) para detalles completos.

------------------------------------------------------------------------

## 📱 Android (NEW!)

OpoCalendar ahora es nativa en Android usando Capacitor:

- 📦 **APK de Producción** con ofuscación ProGuard
- 🔒 **Almacenamiento Seguro** de tokens con EncryptedSharedPreferences
- 🌐 **Network Security** restrictivo (HTTPS only en producción)
- 📋 **Permisos Minimales** (solo los necesarios)
- 🚀 **Lista para Play Store**

### Quick Start Android
```bash
cd frontend
npm run build
npm run cap:add:android    # Primera vez
npm run cap:run:android    # En emulador
npm run cap:build:android  # Build APK
```

O usar el script de setup:
```bash
./setup-android.sh         # Linux/macOS
.\\setup-android.bat       # Windows
```

------------------------------------------------------------------------

## 🛠️ Stack Tecnológico

El proyecto sigue una arquitectura de **Monorepo** dividida en dos servicios:

### 🖥️ Frontend (La Interfaz)
* **Framework:** React 18 + TypeScript
* **Build Tool:** Vite
* **Estilos:** Tailwind CSS v4
* **UI Components:** Lucide React (Iconos)
* **Mobile:** Capacitor para iOS/Android
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
    ├── frontend/
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
uvicorn main:app --reload --reload-exclude='venv/*'
```

El servidor estará escuchando en: http://127.0.0.1:8000

------------------------------------------------------------------------

### 3. Paso 3: Arrancar el Frontend
Abre otra terminal nueva en la raíz del proyecto:

``` bash
cd frontend

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
