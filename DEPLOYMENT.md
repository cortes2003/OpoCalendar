# 🚀 OpoCalendar - Guía de Deployment

## Tabla de Contenidos
1. [Prerequisites](#prerequisites)
2. [Backend Setup (Linux/Ubuntu)](#backend-setup)
3. [Frontend & Android Setup](#frontend-setup)
4. [Configuración de Seguridad](#configuración-de-seguridad)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Monitoreo](#monitoreo)

---

## Prerequisites

### Requisitos Globales
- **OS**: Linux (Ubuntu 20.04+) recomendado para producción
- **Docker** (opcional pero recomendado)
- **Git**
- **Python 3.11+** con pip
- **Node.js 18+** con npm
- **MySQL 8.0+**
- **SSL Certificate** (Let's Encrypt gratuito)

### En Windows (Desarrollo Local)
- **Python 3.11+**
- **Node.js 18+**
- **XAMPP** o MySQL Server local
- **Android Studio** (para emulación)
- **Git Bash** o WSL2

---

## Backend Setup (Linux/Ubuntu)

### 1. Clonar Repositorio
```bash
cd /opt
git clone https://github.com/tu-usuario/opocalendar.git
cd opocalendar
```

### 2. Crear Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar Dependencias
```bash
pip install -r backend/requirements.txt
```

### 4. Configurar Variables de Entorno
```bash
# Crear archivo .env en raíz del proyecto
cp .env.example .env
nano .env  # Editar con los valores de producción

# Valores obligatorios:
SECRET_KEY=tu_clave_secreta_muy_larga_min_32_caracteres
ENCRYPTION_KEY=tu_clave_fernet_generada
DATABASE_URL=mysql://opocalendar:password@localhost:3306/opocalendar_db
FRONTEND_URL=https://app.tudominio.com
NODE_ENV=production
```

### 5. Crear Base de Datos MySQL
```bash
mysql -u root -p << EOF
CREATE DATABASE opocalendar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'opocalendar'@'localhost' IDENTIFIED BY 'contraseña_segura_aqui';
GRANT SELECT, INSERT, UPDATE, DELETE ON opocalendar_db.* TO 'opocalendar'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 6. Verificar Conexión de Base de Datos
```bash
cd backend
python -c "from database import engine; engine.execute('SELECT 1')"
```

### 7. Desplegar con Gunicorn + Nginx

#### Instalar Gunicorn
```bash
pip install gunicorn
```

#### Crear Systemd Service
```bash
sudo nano /etc/systemd/system/opocalendar-backend.service
```

Contenido:
```ini
[Unit]
Description=OpoCalendar Backend API
After=network.target

[Service]
User=opocalendar
WorkingDirectory=/opt/opocalendar
Environment="PATH=/opt/opocalendar/venv/bin"
EnvironmentFile=/opt/opocalendar/.env
ExecStart=/opt/opocalendar/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 backend.main:app
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s TERM $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Habilitar y Arrancar
```bash
sudo systemctl daemon-reload
sudo systemctl enable opocalendar-backend
sudo systemctl start opocalendar-backend
sudo systemctl status opocalendar-backend
```

---

## Frontend Setup

### 1. Instalar Dependencias
```bash
cd frontend
npm install
```

### 2. Configurar Variables de Entorno
```bash
# Crear .env.local
echo "VITE_API_URL=https://api.tudominio.com" > .env.local
```

### 3. Build de Producción
```bash
npm run build
```

Esto crea la carpeta `dist/` lista para servir.

### 4. Servir con Nginx

```bash
sudo nano /etc/nginx/sites-available/opocalendar-frontend
```

Contenido:
```nginx
server {
    listen 443 ssl http2;
    server_name app.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/app.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.tudominio.com/privkey.pem;

    # Seguridad SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de seguridad
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /opt/opocalendar/frontend/dist;
    index index.html;

    # SPA routing - redirigir URLs no encontradas a index.html
    location / {
        try_files $uri /index.html;
    }

    # Caché estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Denegar acceso a archivos sensibles
    location ~ /\. {
        deny all;
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name app.tudominio.com;
    return 301 https://$server_name$request_uri;
}
```

#### Proxy hacia Backend
```bash
sudo nano /etc/nginx/sites-available/opocalendar-api
```

Contenido:
```nginx
server {
    listen 443 ssl http2;
    server_name api.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Headers de seguridad
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support si es necesario
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name api.tudominio.com;
    return 301 https://$server_name$request_uri;
}
```

#### Habilitar Sitios
```bash
sudo ln -s /etc/nginx/sites-available/opocalendar-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/opocalendar-api /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

---

## Android Setup

### 1. Requisitos
```bash
# Android Studio 2023.1+
# SDK 21-34
# Gradle 8.0+
```

### 2. Configuración
```bash
cd frontend

# Ejecutar setup script
./setup-android.sh          # Linux/macOS
.\\setup-android.bat        # Windows
```

### 3. Build de Producción
```bash
npm run build
npx cap sync android

cd android
./gradlew bundleRelease  # Para Play Store
# o
./gradlew assembleRelease  # Para APK directo
```

### 4. Firmar APK para Play Store
```bash
# Generar keystore si no existe
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias opocalendar_key

# Firmar AAB
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.keystore \
  app/build/outputs/bundle/release/app-release.aab \
  opocalendar_key

# Zipalign (optimización)
zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release.apk
```

---

## Configuración de Seguridad

### 1. SSL/TLS con Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d app.tudominio.com -d api.tudominio.com
sudo certbot renew --dry-run  # Verificar renovación automática
```

### 2. Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Fail2Ban para Protección DDoS
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Copias de Seguridad Automáticas
```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-opocalendar.sh
```

Contenido:
```bash
#!/bin/bash
BACKUP_DIR=/backups/opocalendar
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
mysqldump -u opocalendar -p'$DB_PASSWORD' opocalendar_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Mantener últimos 30 días
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completado: $DATE" >> /var/log/opocalendar-backup.log
```

```bash
sudo chmod +x /usr/local/bin/backup-opocalendar.sh
sudo crontab -e
# Agregar línea:
# 0 3 * * * /usr/local/bin/backup-opocalendar.sh
```

---

## Testing

### Backend
```bash
cd backend
python -m pytest test_main.py -v
```

### Frontend
```bash
cd frontend
npm run test
```

### Load Testing
```bash
# Instalar k6
curl https://dl.k6.io/release/linux/x86_64/k6-latest-linux-x86_64.tar.gz | tar xz
sudo mv k6-*/k6 /usr/local/bin/

# Test básico
k6 run frontend/load-test.js
```

---

## Deployment Checklist

- [ ] Secret Key generado y seguro
- [ ] Base de datos configurada y respaldada
- [ ] SSL certificado instalado
- [ ] Nginx configurado correctamente
- [ ] Gunicorn funcionando
- [ ] Firewall activado
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado
- [ ] Logs configurados
- [ ] Email de alertas configurado
- [ ] APK Android firmado para Play Store
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados

---

## Monitoreo

### Logs
```bash
# Backend
sudo systemctl status opocalendar-backend
sudo journalctl -u opocalendar-backend -f

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Check Automático
```bash
# Cron job cada 5 minutos
*/5 * * * * curl -f https://api.tudominio.com/health || systemctl restart opocalendar-backend
```

### Monitoreo Avanzado (Opcional)
```bash
# Instalar Prometheus + Grafana
# Ver: https://prometheus.io/docs/prometheus/latest/installation/

# O usar servicios de terceros:
# - DataDog
# - New Relic
# - Sentry (para error tracking)
```

---

## Troubleshooting

### Backend no inicia
```bash
# Verificar logs
sudo journalctl -u opocalendar-backend -n 50

# Verificar puerto 8000
lsof -i :8000

# Verificar conexión DB
mysql -u opocalendar -p -h localhost opocalendar_db -e "SELECT 1"
```

### CORS errors
```bash
# Revisar FRONTEND_URL en .env
# Verificar Access-Control-Allow-Origin en response headers
curl -H "Origin: https://app.tudominio.com" -v https://api.tudominio.com/tasks
```

### SSL Certificate renewal fallido
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Post-Deployment

1. **Monitoreo Continuo**: Configurar alertas
2. **Actualizaciones**: Plan de actualización automática de dependencias
3. **Backup Regular**: Verificar respaldos semanales
4. **Seguridad**: Auditoría de seguridad cada trimestre
5. **Performance**: Optimizar based en métricas

---

**Última actualización**: 2026-03-06
**Versión**: 2.0.0 - Production Ready
