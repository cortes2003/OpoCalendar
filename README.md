# 📅 OpoCalendar - Planificador Inteligente para Opositores

**OpoCalendar** es una aplicación Full Stack diseñada para optimizar el tiempo de estudio. Utiliza un algoritmo inteligente (IA) para reorganizar automáticamente la agenda diaria, respetando descansos, prioridades y horas fijas, ayudando a opositores y estudiantes a maximizar su productividad sin estrés.

![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)

## 🚀 Características Principales

* **📅 Calendario Interactivo:** Vista mensual y diaria detallada.
* **🤖 IA de Optimización (Python):** Algoritmo de "Gap Filling" que reorganiza tareas flexibles en los huecos libres, respetando tu horario de sueño.
* **🎨 Interfaz Moderna:** Diseño responsivo (Móvil/Escritorio) con Tailwind CSS, modo pantalla completa y UX cuidada.
* **⚡ Persistencia Real:** Base de datos MySQL conectada mediante API REST.
* **⚙️ Configuración Personalizada:** Define tu horario de disponibilidad y preferencias de notificaciones.

## 🛠️ Stack Tecnológico

El proyecto sigue una arquitectura de **Monorepo** dividida en dos servicios:

### Backend (El Cerebro)
* **Lenguaje:** Python 3.11+
* **Framework:** FastAPI
* **ORM:** SQLAlchemy
* **Base de Datos:** MySQL
* **Librerías IA:** Pandas, NumPy (Lógica de optimización horaria)

### Frontend (La Interfaz)
* **Framework:** React 18 + TypeScript
* **Build Tool:** Vite
* **Estilos:** Tailwind CSS v4
* **Componentes:** Lucide React (Iconos), Date-fns (Gestión de fechas)

## 📦 Estructura del Proyecto

```text
OpoCalendar/
├── backend/      # API REST en Python (FastAPI)
├── opoflow/      # Cliente Web en React
└── README.md     # Este archivo
