import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.opocalendar.app',
  appName: 'OpoCalendar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: process.env.NODE_ENV === 'development' ? true : false,
  },
  plugins: {
    // ✅ Almacenamiento seguro (Preferences)
    Preferences: {
      group: 'com.opocalendar.app',
    },
    // ✅ Plugin de notificaciones locales
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_small',
      iconColor: '#1f2937',
    },
    // ✅ Plugin de geolocalización (opcional)
    Geolocation: {},
    // ✅ Plugin de cámara (opcional para futuro)
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
  // ✅ Configuración de seguridad
  capture: {
    allowedMimeTypes: ['image/jpeg', 'image/png'],
  },
};

export default config;
