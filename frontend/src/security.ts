/**
 * Módulo de sanitización XSS
 * Previene ataques de Cross-Site Scripting
 */

/**
 * Sanitiza HTML eliminando scripts y contenido potencialmente peligroso
 */
export const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Sanitiza entrada de usuario para usar en atributos HTML
 */
export const sanitizeAttribute = (attr: string): string => {
  return attr
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza URLs (previene javascript: y data: URLs)
 */
export const sanitizeURL = (url: string): string => {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  return url;
};

/**
 * Valida entrada de datos
 */
export const validateInput = (
  value: string,
  fieldName: string,
  maxLength: number = 255
): { valid: boolean; error?: string } => {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} es requerido` };
  }

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} excede ${maxLength} caracteres` };
  }

  // Patrones peligrosos
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      return { valid: false, error: `${fieldName} contiene contenido no permitido` };
    }
  }

  return { valid: true };
};

/**
 * Escapa caracteres especiales para JSON
 */
export const escapeJSON = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(escapeJSON);
    }
    const escaped: any = {};
    for (const key in obj) {
      escaped[key] = escapeJSON(obj[key]);
    }
    return escaped;
  }
  return obj;
};
