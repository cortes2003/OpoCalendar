@echo off
REM OpoCalendar Android Build & Setup Script (Windows)

setlocal enabledelayedexpansion

echo.
echo 🚀 OpoCalendar Android Setup ^(Windows^)
echo ======================================
echo.

REM Colores (limitados en Windows, usaremos símbolos)
REM Verificar requisitos
echo [INFO] Verificando requisitos...

REM Verificar Node.js
where /q node
if errorlevel 1 (
    echo [ERROR] Node.js no instalado
    echo Descarga desde: https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Verificar npm
where /q npm
if errorlevel 1 (
    echo [ERROR] npm no instalado
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Verificar ANDROID_HOME
if not defined ANDROID_HOME (
    echo [ERROR] ANDROID_HOME no definido
    echo Agrega a System Environment Variables:
    echo   ANDROID_HOME=C:\Android\sdk
    exit /b 1
)
echo [OK] Android SDK en %ANDROID_HOME%

REM Verificar Java
where /q java
if errorlevel 1 (
    echo [ERROR] Java no instalado
    exit /b 1
)
for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr /r "version"') do set JAVA_VERSION=%%i
echo [OK] Java %JAVA_VERSION%

echo.
echo [INFO] Instalando dependencias del frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Error al instalar dependencias
    exit /b 1
)

echo.
echo [INFO] Compilando frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Error al compilar frontend
    exit /b 1
)

echo.
echo [INFO] Instalando Capacitor CLI globalmente...
call npm install -g @capacitor/cli
if errorlevel 1 (
    echo [WARNING] Error al instalar Capacitor globalmente, continuando...
)

echo.
echo [INFO] Agregando plataforma Android...
if not exist "android" (
    call npx cap add android
    if errorlevel 1 (
        echo [ERROR] Error al agregar Android
        exit /b 1
    )
) else (
    echo [OK] Carpeta android ya existe
)

echo.
echo [INFO] Sincronizando proyecto Capacitor...
call npx cap sync
if errorlevel 1 (
    echo [ERROR] Error al sincronizar
    exit /b 1
)

echo.
echo [INFO] Configurando firma de APK...

REM Verificar si existe keystore
if not exist "android\app\opocalendar.jks" (
    echo [INFO] Generando keystore para firma...
    keytool -genkey -v -keystore android\app\opocalendar.jks ^
        -keyalg RSA -keysize 2048 -validity 10000 ^
        -alias opocalendar_key -dname "CN=OpoCalendar,OU=Dev,O=Personal,L=Spain,S=NA,C=ES"
    if errorlevel 1 (
        echo [WARNING] Error al generar keystore
    ) else (
        echo [OK] Keystore generado
    )
) else (
    echo [OK] Keystore ya existe
)

echo.
echo [INFO] Compilando APK...
cd android
call gradlew.bat build
if errorlevel 1 (
    echo [ERROR] Error al compilar APK
    exit /b 1
)

echo.
echo [OK] Setup completado!
echo.
echo Siguientes pasos:
echo 1. Abre Android Studio:
echo    npx cap open android
echo.
echo 2. O corre en emulador:
echo    npx cap run android
echo.
echo 3. O instala APK directamente:
echo    adb install app\build\outputs\apk\debug\app-debug.apk
echo.
echo Para producción ^(release APK^):
echo    cd android ^&^& gradlew assembleRelease
echo.

pause
