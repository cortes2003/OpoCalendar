# 🔐 OpoCalendar - Guía de Seguridad

## Indice
1. [Seguridad Backend](#seguridad-backend)
2. [Seguridad Frontend](#seguridad-frontend)
3. [Seguridad Android](#seguridad-android)
4. [Configuración de Producción](#configuración-de-producción)
5. [Mejores Prácticas](#mejores-prácticas)

---

## Seguridad Backend

### 1. Autenticación JWT ✅
- **Tokens de acceso**: 30 minutos de duración
- **Tokens de refresco**: 7 días de duración
- **Algoritmo**: HS256 (HMAC-SHA256)
- **Ubicación**: Header `Authorization: Bearer <token>`

```python
# Ejemplo de uso
POST /auth/login
{
  "username": "usuario",
  "password": "contraseña"
}

# Respuesta
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 2. Rate Limiting ✅
Endpoints limitados por minuto:
- **Registro**: 5 intentos/minuto
- **Login**: 10 intentos/minuto
- **Tareas**: 20 intentos/minuto
- **IA**: 10 intentos/minuto

### 3. CORS Restrictivo ✅
- Solo `localhost:5173` en desarrollo
- Variable de entorno `FRONTEND_URL` en producción
- Headers específicos: `Content-Type`, `Authorization`

### 4. Headers de Seguridad ✅
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### 5. Validación de Entrada ✅
```python
# Validación de usuario
- Longitud: 3-50 caracteres
- Caracteres permitidos: [a-zA-Z0-9_]
- No permite inyecciones SQL ni XSS

# Validación de email
- Formato: RFC 5322 (básico)
- Longitud máxima: 255 caracteres

# Validación de contraseña
- Longitud mínima: 8 caracteres
- Hash: bcrypt (algoritmo seguro)
```

### 6. Encriptación ✅
```python
# Datos sensibles en reposo
from cryptography.fernet import Fernet
cipher_suite = Fernet(ENCRYPTION_KEY)
encrypted_data = cipher_suite.encrypt(data.encode())
```

### 7. Configuración de Base de Datos ✅
```python
# MySQL only (no SQLite en producción)
DATABASE_URL=mysql://user:password@host:3306/db_name

# Variables de entorno OBLIGATORIAS
- DB_USER
- DB_PASSWORD
- DB_HOST
```

---

## Seguridad Frontend

### 1. Almacenamiento Seguro de Tokens ✅
```typescript
// archivo: src/secureStorage.ts
- Token de acceso: sessionStorage (se borra al cerrar navegador)
- Token de refresco: localStorage (persiste)
- Obfuscación: Base64 encoding
- Expiración: Validada en cada uso
```

### 2. Sanitización XSS ✅
```typescript
// archivo: src/security.ts
- sanitizeHTML(): Limpia HTML potencialmente peligroso
- sanitizeAttribute(): Escapa atributos HTML
- sanitizeURL(): Previene javascript: y data: URLs
- validateInput(): Valida entrada de usuario
```

### 3. HTTPS Obligatorio ✅
```typescript
// En producción, solo permitir HTTPS
if (window.location.protocol !== 'https:' && !localhost) {
  // Redirigir a HTTPS
}
```

### 4. CSP (Content Security Policy) ✅
```html
<!-- Previene inyección de scripts -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">
```

### 5. Manejo Seguro de Refresh Tokens ✅
```typescript
// Refrescar automáticamente antes de expiración
if (isTokenAboutToExpire()) {
  const newToken = await refreshAccessToken();
  setAccessToken(newToken);
}
```

---

## Seguridad Android

### 1. Permisos Minimales ✅
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 2. Network Security Config ✅
```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
- Cleartext (HTTP) SOLO en desarrollo (localhost)
- HTTPS obligatorio en producción
- Certificate Pinning para dominios específicos
```

### 3. Ofuscación de Código ✅
```gradle
// android/app/build.gradle
minifyEnabled = true
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

### 4. Almacenamiento Seguro ✅
```typescript
// Usar EncryptedSharedPreferences en lugar de SharedPreferences
import { Preferences } from '@capacitor/preferences';

// Guardar token seguramente
await Preferences.set({
  key: 'auth_token',
  value: encryptedToken
});
```

### 5. Prevención de Debugging ✅
```gradle
// En release builds
debuggable = false
minifyEnabled = true
```

### 6. Protección contra Root/Jailbreak ✅
Considera agregar verificación:
```typescript
// Detectar si el dispositivo está rooteado
import { RootChecker } from '@capacitor-community/rootchecker';
const isRooted = await RootChecker.check();
if (isRooted) {
  console.warn('Dispositivo potencialmente comprometido');
}
```

---

## Configuración de Producción

### 1. Variables de Entorno ✅
```bash
# Crear archivo .env.local (NUNCA commitear)
cp .env.example .env.local

# Generar SECRET_KEY seguro
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generar ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. HTTPS Setup ✅
```bash
# Usar certificados SSL válidos
# Opciones:
# - Let's Encrypt (gratuito)
# - AWS ACM
# - Sectigo
# - DigiCert

# En FastAPI
from fastapi.middleware import HTTPSMiddleware
app.add_middleware(HTTPSMiddleware, enforce_https_redirect=True)
```

### 3. Database Hardening ✅
```sql
-- Crear usuario con permisos limitados
CREATE USER 'opocalendar'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON opocalendar_db.* TO 'opocalendar'@'localhost';
FLUSH PRIVILEGES;

-- Usar conexión SSL
REQUIRE SSL;
```

### 4. Logging y Monitoreo ✅
```python
# Implementar logging de auditoría
import logging
audit_logger = logging.getLogger('audit')

# Log de eventos importantes
audit_logger.info(f'Usuario {user_id} ha iniciado sesión')
audit_logger.warning(f'Intento fallido de login para {username}')
audit_logger.error(f'Acceso no autorizado a recurso {resource_id}')
```

### 5. Firewall y Networking ✅
```bash
# Firewall (UFW en Linux)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirige a HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3306/tcp    # MySQL (solo desde app server)
sudo ufw enable
```

### 6. Backup y Disaster Recovery ✅
```bash
# Backup diario de base de datos
mysqldump -u opocalendar -p opocalendar_db > backup_$(date +%Y%m%d).sql

# Almacenar en location seguro (S3, Google Drive, etc.)
```

---

## Mejores Prácticas

### 1. Contraseñas Fuertes ✅
- Mínimo 8 caracteres
- Incluir mayúsculas, minúsculas, números, símbolos
- Usar bcrypt para hash (nunca almacenar en plain text)

### 2. 2FA (Two-Factor Authentication) 🔄
Implementación futura recomendada:
```python
# Usar TOTP (Time-based One-Time Password)
from pyotp import TOTP

secret = pyotp.random_base32()
totp = TOTP(secret)
current_code = totp.now()  # Código actual
```

### 3. Auditoría Completa ✅
```python
# Log de todas las acciones críticas
- Login/Logout
- Cambios de contraseña
- Actualización de datos sensibles
- Errores de autenticación
```

### 4. Renovación de Secretos 🔄
```bash
# Cada 90 días
- Regenerar SECRET_KEY
- Rotar ENCRYPTION_KEY
- Renovar certificados SSL
```

### 5. Dependencias Actualizadas ✅
```bash
# Verificar vulnerabilidades
pip audit                  # Python
npm audit                  # JavaScript

# Actualizar regularmente
pip install --upgrade pip
npm update
```

### 6. Testing de Seguridad ✅
```bash
# OWASP ZAP
zaproxy.sh -cmd -quickurl http://localhost:8000 -quickout report.html

# Bandit (Python security)
bandit -r backend/

# npm audit
npm audit fix
```

### 7. GDPR/Privacidad ✅
- [ ] Consentimiento de cookies
- [ ] Derecho al olvido (RTBF - Right to be Forgotten)
- [ ] Dato access requests
- [ ] Política de privacidad clara
- [ ] Encriptación de datos personales

### 8. Incident Response ✅
Plan de respuesta a incidentes:
1. **Detectar**: Monitoreo 24/7
2. **Contener**: Aislar instancia comprometida
3. **Investigar**: Logs y análisis
4. **Remediar**: Parchear vulnerabilidades
5. **Aprender**: Post-mortem y mejoras

---

## Comando de Inicio Seguro

```bash
# Backend
export SECRET_KEY="tu_clave_secreta_larga"
export ENCRYPTION_KEY="tu_clave_fernet"
export DB_USER="opocalendar"
export DB_PASSWORD="contraseña_segura"
uvicorn main:app --host 127.0.0.1 --port 8000 --ssl-keyfile=key.pem --ssl-certfile=cert.pem

# Frontend
npm run build
npm run preview  # Producción local para testing
```

---

## Checklist de Seguridad Pre-Producción

- [ ] SECRET_KEY generado y en variable de entorno
- [ ] ENCRYPTION_KEY configurado
- [ ] Database con usuario limitado
- [ ] HTTPS certificado instalado
- [ ] CORS restrictivo configurado
- [ ] Rate limiting activo
- [ ] Logging y monitoreo configurado
- [ ] Backups automáticos habilitados
- [ ] Firewall configurado
- [ ] Dependencias auditadas y actualizadas
- [ ] Tests de seguridad ejecutados
- [ ] Android APK ofuscado y firmado
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados

---

## Recursos Adicionales

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- Android Security: https://developer.android.com/training/articles/security-tips
- PortSwigger Web Security Academy: https://portswigger.net/web-security

---

**Última actualización**: 2026-03-06
**Versión**: 2.0.0 - Segura y Android-Ready
