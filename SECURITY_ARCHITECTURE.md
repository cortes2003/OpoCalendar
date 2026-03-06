# 🔐 OpoCalendar v2.0 - Arquitectura de Seguridad

## Flujo de Autenticación JWT

```
USER (FRONTEND)
    │
    ├─ [1] Login/Register
    │   └─> POST /auth/login { username, password }
    │
    ▼
BACKEND (FastAPI)
    │
    ├─ [2] Validar Credenciales
    │   ├─> Lookup usuario en DB
    │   └─> bcrypt.verify(password, hash)
    │
    ├─ [3] Generar Tokens
    │   ├─> Access Token (30 min, HS256)
    │   └─> Refresh Token (7 días, HS256)
    │
    ▼
RESPONSE
    │
    ├─ access_token: "eyJ0eXAi..."
    ├─ refresh_token: "eyJ0eXAi..."
    └─ token_type: "bearer"
    │
    ▼
CLIENT STORAGE
    │
    ├─ sessionStorage
    │   ├─ auth_token (obfuscado Base64)
    │   └─ token_expiry (timestamp)
    │
    └─ localStorage
        ├─ refresh_token (obfuscado Base64)
        └─ user_data (obfuscado Base64)


## Token Refresh Automático

FRONTEND (api.ts)
    │
    ├─ Verificar expiración
    │   └─ if (Date.now() > expiry)
    │
    ├─ SI: Refresh automático
    │   ├─> POST /auth/refresh { Bearer: refresh_token }
    │   └─> Nuevo access_token
    │
    └─ NO: Continuar normal


## Flujo de Solicitud Autenticada

REQUEST FRONTEND
    │
    ├─ GET /tasks
    │   ├─ Header: Authorization: Bearer {access_token}
    │   ├─ Header: Content-Type: application/json
    │   └─ Header: X-Requested-With: XMLHttpRequest
    │
    ▼
BACKEND MIDDLEWARE
    │
    ├─ CORS VALIDATION
    │   └─ if (origin != allowed) → 403
    │
    ├─ TRUSTED HOST CHECK
    │   └─ if (host != trusted) → 403
    │
    ├─ RATE LIMIT CHECK
    │   └─ if (requests > limit) → 429
    │
    ├─ SECURITY HEADERS
    │   └─ Add (X-Content-Type, X-Frame, HSTS, etc.)
    │
    ▼
JWT VALIDATION
    │
    ├─ Parse token
    ├─ Verify signature (SECRET_KEY)
    ├─ Check expiration
    └─ Extract user_id
        │
        └─ if invalid → 401 Unauthorized
    │
    ▼
BUSINESS LOGIC
    │
    ├─ Verificar owner de recurso
    │   └─ tasks.user_id == current_user.id
    │
    ├─ Ejecutar lógica
    └─ Sanitizar respuesta
    │
    ▼
RESPONSE
    │
    └─ 200 OK + data


## Protecciones en Capas

```
CAPA 1: NETWORK
├─ HTTPS/TLS 1.2+ (producción)
├─ Certificate Pinning (Android)
└─ Firewall (ufw)

CAPA 2: CORS/ORIGINS
├─ Whitelist de orígenes
├─ Trusted hosts
└─ Preflight validation

CAPA 3: AUTENTICACIÓN
├─ JWT Bearer tokens
├─ Refresh token rotation
└─ Token expiration

CAPA 4: AUTORIZACIÓN
├─ user_id validation
├─ Resource ownership check
└─ Role-based access (futuro)

CAPA 5: VALIDACIÓN
├─ Input sanitization
├─ Type checking (Pydantic)
└─ SQL parameter binding

CAPA 6: ENCRIPTACIÓN
├─ Fernet (datos en reposo)
├─ bcrypt (passwords)
├─ HS256 (JWT signing)
└─ HTTPS (datos en tránsito)

CAPA 7: OBSERVABILIDAD
├─ Audit logging
├─ Error logging
├─ Rate limit tracking
└─ Security events
```


## Validación de Input - Pipeline

```
USER INPUT
    │
    ├─ [1] Type Check (Pydantic)
    │   └─ str, int, date, time → error si no coincide
    │
    ├─ [2] Length Validation
    │   └─ min_length, max_length → error si fuera de rango
    │
    ├─ [3] Format Validation
    │   ├─ Email: RFC 5322 regex
    │   ├─ Username: [a-zA-Z0-9_]{3,50}
    │   ├─ Password: >= 8 chars
    │   └─ Time: HH:MM:SS format
    │
    ├─ [4] Pattern Detection
    │   ├─ XSS patterns: <script, javascript:, onerror=
    │   ├─ SQL injection: ', --,  /*  */
    │   └─ Command injection: ;, |, &&
    │
    ├─ [5] Sanitization
    │   ├─ Strip whitespace
    │   ├─ HTML entity escaping
    │   └─ Normalize case
    │
    └─ [6] Custom Business Rules
        ├─ User exists check
        ├─ Task overlap validation
        └─ Status enum validation
            │
            ▼
        SAFE TO USE


## Encriptación de Datos Sensibles

```
DATOS EN REPOSO (Base de Datos)
├─ Contraseñas: bcrypt hash
├─ Números sensibles: Fernet cipher
└─ Tokens: Hash (no reversible)

DATOS EN TRÁNSITO
├─ HTTP: HTTPS/TLS 1.2+
├─ Payload: JSON (no sensible por defecto)
└─ Tokens: Signed JWT (no encriptado, oculto)

DATOS EN CLIENTE
├─ Access Token: sessionStorage (expira)
├─ Refresh Token: localStorage (persistente)
├─ User Data: sessionStorage (obfuscado)
└─ Credenciales: NUNCA guardar
```


## Rate Limiting por Endpoint

```
/auth/register ........... 5 req/min
/auth/login .............. 10 req/min
/auth/refresh ............ 30 req/min
/auth/logout ............. 10 req/min

/tasks (GET) ............. 30 req/min
/tasks (POST) ............ 20 req/min
/tasks/{id} (PUT) ........ 20 req/min
/tasks/{id} (DELETE) ..... 20 req/min

/optimize/calculate ..... 10 req/min
/optimize/apply ......... 10 req/min

/health .................. ∞ (no limit)
```


## Android Security Layers

```
NIVEL 1: SISTEMA OPERATIVO
├─ Permisos declarados en AndroidManifest.xml
├─ Runtime permissions (Android 6+)
└─ Sandbox de aplicación

NIVEL 2: NETWORK
├─ Network Security Config
│   ├─ cleartext: false (producción)
│   ├─ HTTPS: true
│   ├─ Domain specific policies
│   └─ Certificate pinning
│
└─ TLS 1.2+ obligatorio

NIVEL 3: ALMACENAMIENTO
├─ sessionStorage (Cache)
├─ EncryptedSharedPreferences
└─ KeyStore del sistema

NIVEL 4: CÓDIGO
├─ ProGuard obfuscación
├─ Resource shrinking
├─ Debuggable: false
└─ Release signing

NIVEL 5: COMUNICACIÓN
├─ JWT Bearer tokens
├─ HTTPS only
├─ Certificate validation
└─ No hardcoding de secrets
```


## Security Headers Implementados

```
HEADER                          VALOR
────────────────────────────────────────────────────────────────
X-Content-Type-Options         nosniff
X-Frame-Options                DENY
X-XSS-Protection               1; mode=block
Strict-Transport-Security      max-age=31536000; includeSubDomains
Content-Security-Policy        default-src 'self'; script-src 'self'
Referrer-Policy                strict-origin-when-cross-origin
Access-Control-Allow-Origin    [whitelisted origins]
Access-Control-Allow-Methods   GET, POST, PUT, DELETE
Access-Control-Allow-Headers   Content-Type, Authorization
Access-Control-Max-Age         3600
```


## Diagrama de Amenazas Mitigadas

```
AMENAZA                         MITIGACIÓN
────────────────────────────────────────────────────────────────
SQL Injection                   Pydantic validation + ORM
XSS Attack                      Input sanitization + CSP
CSRF                            JWT + same-site cookies
brute force                      Rate limiting
Token theft                      sessionStorage + HTTPS
Man-in-the-Middle              HTTPS/TLS + HSTS
Unauthorized access             JWT + ownership check
Buffer overflow                 Language: Python (memory safe)
DDoS                            Rate limiting + Fail2Ban
Reverse engineering              ProGuard obfuscation
Data exposure                   Encryption at rest + TLS
Privilege escalation            No hardcoded credentials
Race condition                  Database transactions
API abuse                       Rate limiting + API keys
Malicious APK                   Code signing + ProGuard
Development mode enabled        Debuggable: false (release)
```


## Ejemplo de Request Seguro

```http
POST /tasks HTTP/1.1
Host: api.opocalendar.com
Scheme: https
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
X-Requested-With: XMLHttpRequest

{
  "title": "Estudiar Math - Capitulo 5",
  "description": "Ejercicios del 1 al 20",
  "type": "study",
  "priority": "high",
  "date": "2026-03-07",
  "start_time": "09:00:00",
  "end_time": "11:00:00",
  "duration": 120,
  "is_fixed": false,
  "email_reminder": true
}

RESPUESTA:
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'

{
  "id": 42,
  "user_id": 7,
  "title": "Estudiar Math - Capitulo 5",
  ...
}
```


## Flujo de Logout Seguro

```
POST /auth/logout
    │
    ├─ Valida access token
    │
    ├─ Log auditoría (user logout)
    │
    ├─ En futuro: agregar token a blacklist
    │   (Implementar con Redis para invalidar inmediatamente)
    │
    └─ Respuesta: 200 OK

CLIENTE (Frontend):
    │
    ├─ Limpia sessionStorage
    │   ├─ auth_token
    │   ├─ token_expiry
    │   └─ user_data
    │
    ├─ Limpia localStorage
    │   └─ refresh_token
    │
    └─ Redirige a /login
```

---

**Próximas mejoras de seguridad:**
- [ ] 2FA (TOTP) implementation
- [ ] OAuth2 integration
- [ ] API key management para mobile
- [ ] WebSocket secure auth
- [ ] Rate limit with Redis
- [ ] Token blacklist service
- [ ] Security audit logging
- [ ] Penetration testing
