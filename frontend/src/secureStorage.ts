/**
 * Almacenamiento seguro de tokens y datos sensibles
 * Implementa encriptación básica y gestión de ciclo de vida
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const STORAGE_EXPIRY_KEY = 'token_expiry';

/**
 * Función simple de obfuscación (Para mayor seguridad en producción, usar crypto.js)
 * Esta es una capa básica de seguridad
 */
const obfuscate = (str: string): string => {
  return btoa(str); // Base64 encode
};

const deobfuscate = (str: string): string => {
  try {
    return atob(str); // Base64 decode
  } catch (e) {
    console.error('Error decoding token');
    return '';
  }
};

/**
 * Establecer token de acceso con expiración
 */
export const setAccessToken = (token: string, expiresIn: number = 30) => {
  const expiryTime = Date.now() + expiresIn * 60 * 1000; // expiresIn en minutos
  sessionStorage.setItem(TOKEN_KEY, obfuscate(token));
  sessionStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());
};

/**
 * Obtener token de acceso (validando expiración)
 */
export const getAccessToken = (): string | null => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(STORAGE_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Verificar expiración
  if (Date.now() > parseInt(expiry)) {
    clearTokens();
    return null;
  }

  return deobfuscate(token);
};

/**
 * Establecer refresh token (más seguro, con caducidad extendida)
 */
export const setRefreshToken = (token: string) => {
  // Usar localStorage para refresh token (persiste entre sesiones)
  localStorage.setItem(REFRESH_TOKEN_KEY, obfuscate(token));
};

/**
 * Obtener refresh token
 */
export const getRefreshToken = (): string | null => {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  return token ? deobfuscate(token) : null;
};

/**
 * Establecer datos de usuario
 */
export const setUser = (user: any) => {
  sessionStorage.setItem(USER_KEY, obfuscate(JSON.stringify(user)));
};

/**
 * Obtener datos de usuario
 */
export const getUser = (): any | null => {
  const user = sessionStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(deobfuscate(user));
  } catch (e) {
    return null;
  }
};

/**
 * Limpiar tokens (logout)
 */
export const clearTokens = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Verificar si hay una sesión activa
 */
export const isTokenValid = (): boolean => {
  const token = getAccessToken();
  return token !== null;
};
