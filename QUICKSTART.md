# ⚡ OpoCalendar - Quick Start Guide (v2.0 Segura + Android)

## 🔐 Cambios de Seguridad Implementados

### Backend
✅ Autenticación JWT con tokens de acceso y refresco
✅ Rate limiting por endpoint
✅ CORS restrictivo
✅ Headers de seguridad avanzados
✅ Validación y sanitización mejorada
✅ Encriptación de datos sensibles (Fernet)
✅ Endpoint de logout
✅ Logging de auditoría

### Frontend
✅ Almacenamiento seguro de tokens (sessionStorage + localStorage)
✅ Sanitización XSS completa
✅ Validación de inputs
✅ Manejo automático de renovación de tokens
✅ Protección contra CSRF
✅ API mejorada con autenticación

### Android
✅ Capacitor configurado
✅ AndroidManifest.xml con permisos minimales
✅ Network Security Config (HTTPS only en prod)
✅ Gradle con ProGuard ofuscación
✅ Scripts de setup (Windows & Linux)
✅ Keystore para firma de APK

---

## 🚀 Inicio Rápido - Windows

### 1. Backend
```powershell
# Generar claves de seguridad
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

# Copiar y editar .env
copy .env.example .env
# Editar:
# - SECRET_KEY (del comando anterior)
# - ENCRYPTION_KEY (del comando anterior)
# - DB_USER, DB_PASSWORD, DB_HOST

# Crea BD en MySQL (XAMPP Control Panel)

# Instalar dependencias
cd backend
python -m venv venv
.\\venv\\Scripts\\activate
pip install -r requirements.txt

# Iniciar backend
uvicorn main:app --reload --reload-exclude 'venv/*'
# http://127.0.0.1:8000/docs - API Docs
```

### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 3. Android (Emulador)
```powershell
# Instalar Capacitor (primera vez)
npm run build
npm run cap:add:android

# Correr en emulador
npm run cap:run:android

# O abrir en Android Studio
npm run cap:open:android
```

---

## 🚀 Inicio Rápido - Linux/macOS

### 1. Backend
```bash
# Claves de seguridad
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

# .env
cp .env.example .env
nano .env  # Editar valores

# Instalar
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Iniciar
uvicorn main:app --reload --reload-exclude 'venv/*'
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Android
```bash
npm run build
chmod +x ../setup-android.sh
../setup-android.sh
```

---

## 📖 Documentación Importante

| Archivo | Contenido |
|---------|-----------|
| [SECURITY.md](SECURITY.md) | Todos los detalles de seguridad, mejores prácticas, checklist |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guía completa para producción (Linux, Nginx, SSL, etc.) |
| [.env.example](.env.example) | Template de variables de entorno |

---

## 🔑 Variables de Entorno Obligatorias

```bash
# SEGURIDAD
SECRET_KEY=tu_clave_secreta_larga_minimo_32_caracteres
ENCRYPTION_KEY=tu_clave_fernet_de_cryptography
NODE_ENV=development  # o "production"

# BASE DE DATOS
DB_USER=opocalendar
DB_PASSWORD=contraseña_segura
DB_HOST=localhost
DB_PORT=3306
DB_NAME=opocalendar_db

# URLs
VITE_API_URL=http://localhost:8000          # development
# VITE_API_URL=https://api.tudominio.com   # production

FRONTEND_URL=http://localhost:5173          # backend CORS
# FRONTEND_URL=https://app.tudominio.com   # production
```

---

## 🧪 Testing

### Backend (pytest)
```bash
cd backend
python -m pytest test_main.py -v
```

### Frontend (vitest)
```bash
cd frontend
npm run test
```

---

## 🔍 Health Check

```bash
# Backend
curl http://localhost:8000/health

# API Docs interactivos
http://localhost:8000/docs

# Frontend
http://localhost:5173
```

---

## 📱 APK para Producción

### Firmar APK
```bash
cd frontend/android

# Si no existe keystore
keytool -genkey -v -keystore release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias opocalendar_key

# Build release
./gradlew assembleRelease

# Firmar
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.jks \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  opocalendar_key

# Optimizar
zipalign -v 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  app-release.apk

# Subir a Play Store Console
# https://console.cloud.google.com/
```

---

## 🐛 Troubleshooting

### Token expirado
```
Automático - frontend renovará el token antes de expiración
Si aún así expira, haz logout y login de nuevo
```

### CORS Error
```
Verifica FRONTEND_URL en .env backend
Debe coincidir con URL actual del navegador
```

### Base de datos no conecta
```
Verifica XAMPP Control Panel está arriba (MySQL)
Revisa credenciales en .env
mysql -u opocalendar -p opocalendar_db -e "SELECT 1"
```

### Android no conecta a API
```
En emulador: usa API_URL=http://10.0.2.2:8000
En dispositivo real: usa IP local (192.168.x.x)
Verifica Network Security Config XML
```

---

## 🔐 Seguridad - Checklist para Producción

- [ ] Generar SECRET_KEY fuerte
- [ ] Generar ENCRYPTION_KEY
- [ ] Cambiar credenciales DB default
- [ ] Habilitar HTTPS (Let's Encrypt)
- [ ] Configurar CORS para dominios reales
- [ ] Implementar backups automáticos
- [ ] Configurar firewall (UFW)
- [ ] Habilitar rate limiting
- [ ] Revisar logs regularmente
- [ ] Auditar dependencias (pip audit, npm audit)

---

## 📞 Soporte

**Documentación detallada:**
- SECURITY.md - Seguridad
- DEPLOYMENT.md - Producción
- Backend docs: http://localhost:8000/docs

**Recursos externos:**
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Capacitor: https://capacitorjs.com/
- Android: https://developer.android.com/

---

**Última actualización:** 2026-03-06
**Versión:** 2.0.0 - Segura y Android-Ready
