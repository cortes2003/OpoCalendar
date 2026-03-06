#!/bin/bash

# 🔐 OpoCalendar Android Build & Setup Script
# Este script configura e instala la aplicación en Android

set -e

echo "🚀 OpoCalendar Android Setup"
echo "=============================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar requisitos
echo -e "${BLUE}Verificando requisitos...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no instalado${NC}"
    echo "Descarga desde: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Verificar Android SDK
if [ ! -d "$ANDROID_HOME" ]; then
    echo -e "${RED}❌ ANDROID_SDK_ROOT no está configurado${NC}"
    echo "Configura: export ANDROID_HOME=/path/to/android-sdk"
    exit 1
fi
echo -e "${GREEN}✅ Android SDK encontrado${NC}"

# Verificar Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java no instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Java $(java -version 2>&1 | head -n 1)${NC}"

echo ""
echo -e "${BLUE}Instalando dependencias del frontend...${NC}"
cd frontend
npm install

echo ""
echo -e "${BLUE}Compilando frontend...${NC}"
npm run build

echo ""
echo -e "${BLUE}Instalando Capacitor CLI globalmente...${NC}"
npm install -g @capacitor/cli

echo ""
echo -e "${BLUE}Agregando plataforma Android...${NC}"
if [ ! -d "android" ]; then
    npx cap add android
else
    echo -e "${GREEN}✅ Carpeta android ya existe${NC}"
fi

echo ""
echo -e "${BLUE}Sincronizando proyecto Capacitor...${NC}"
npx cap sync

echo ""
echo -e "${BLUE}Configurando firma de APK...${NC}"

# Verificar si existe keystore
if [ ! -f "android/app/opocalendar.jks" ]; then
    echo -e "${BLUE}Generando keystore para firma...${NC}"
    keytool -genkey -v -keystore android/app/opocalendar.jks \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -alias opocalendar_key -dname "CN=OpoCalendar,OU=Dev,O=Personal,L=Spain,S=NA,C=ES"
    echo -e "${GREEN}✅ Keystore generado${NC}"
else
    echo -e "${GREEN}✅ Keystore ya existe${NC}"
fi

echo ""
echo -e "${BLUE}Compilando APK...${NC}"
cd android
./gradlew build

echo ""
echo -e "${GREEN}✅ Setup completado!${NC}"
echo ""
echo "Siguientes pasos:"
echo "1. Abre Android Studio:"
echo "   npx cap open android"
echo ""
echo "2. O corre en emulador:"
echo "   npx cap run android"
echo ""
echo "3. O instala APK directamente:"
echo "   adb install app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Para producción (release APK):"
echo "   cd android && ./gradlew assembleRelease"
echo ""
echo "Para firmar release APK:"
echo "   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\"
echo "     -keystore app/opocalendar.jks app/build/outputs/apk/release/app-release-unsigned.apk opocalendar_key"
echo ""
