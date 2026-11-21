/**
 * Utilidades de validación y sanitización de entradas de usuario para Sablée Pastelería.
 * Proporciona protección contra ataques XSS, inyección, spam y archivos maliciosos.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Detecta si una cadena contiene patrones sospechosos de ataque (XSS, SQLi, scripts).
 */
export const isSuspiciousPayload = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;

  const suspiciousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onmouseover\s*=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /document\.cookie/i,
    /window\.location/i,
    /eval\s*\(/i,
    /union\s+select/i,
    /drop\s+table/i,
    /--\s*$/m
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitiza texto corto de una sola línea (nombres, direcciones, barrios, etc.).
 * Elimina etiquetas HTML, scripts, caracteres de control peligrosos y trunca al límite.
 */
export const sanitizeTextInput = (input: string, maxLength: number = 200): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    // Eliminar etiquetas HTML
    .replace(/<[^>]*>/g, '')
    // Eliminar prefijos de protocolo de script
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    // Eliminar caracteres de control excepto espacios y saltos simples
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar espacios múltiples
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

/**
 * Sanitiza texto multilínea (notas, comentarios adicionales, dedicatorias).
 */
export const sanitizeMultilineInput = (input: string, maxLength: number = 500): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
};

/**
 * Valida de forma estricta los archivos subidos (ej. comprobantes de pago).
 * Protege contra extensiones dobles, ejecutables camuflados y archivos excesivos.
 */
export const validateFileUpload = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No se ha seleccionado ningún archivo.' };
  }

  // 1. Validar tamaño (máximo 5 MB)
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    return { isValid: false, error: 'El comprobante supera los 5 MB. Por favor sube una imagen más ligera.' };
  }

  // 2. Validar tamaño mínimo (evitar archivos corruptos de 0 bytes)
  if (file.size < 100) {
    return { isValid: false, error: 'El archivo parece estar vacío o dañado.' };
  }

  // 3. Validar tipo MIME
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return { isValid: false, error: 'Formato no permitido. Solo se aceptan imágenes en JPG, PNG o WEBP.' };
  }

  // 4. Validar extensión en el nombre del archivo
  const fileName = file.name.toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExt) {
    return { isValid: false, error: 'La extensión del archivo no coincide con un formato de imagen válido.' };
  }

  // 5. Detectar extensiones dobles o intentos de inyección (ej: exploit.php.jpg, invoice.exe.png)
  const dangerousPatterns = /\.(php|phtml|exe|sh|bat|cmd|vbs|js|html|htm|svg|cgi|py)\./i;
  if (dangerousPatterns.test(fileName)) {
    return { isValid: false, error: 'Nombre de archivo potencialmente inseguro. Renombra tu foto antes de subirla.' };
  }

  // 6. Prevenir caracteres de escape de directorios en el nombre
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { isValid: false, error: 'Nombre de archivo inválido.' };
  }

  return { isValid: true };
};

/**
 * Valida nombre completo del cliente.
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Por favor ingresa tu nombre completo.' };
  }
  if (isSuspiciousPayload(trimmed)) {
    return { isValid: false, error: 'El nombre contiene caracteres o expresiones no permitidas.' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  }
  if (trimmed.length > 70) {
    return { isValid: false, error: 'El nombre no puede superar los 70 caracteres.' };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(trimmed)) {
    return { isValid: false, error: 'El nombre solo debe contener letras.' };
  }
  return { isValid: true };
};

/**
 * Valida correo electrónico con formato estándar.
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'El correo electrónico es obligatorio.' };
  }
  if (isSuspiciousPayload(trimmed)) {
    return { isValid: false, error: 'El correo electrónico contiene caracteres no permitidos.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Ingresa un correo electrónico válido (ej: ana@gmail.com).' };
  }
  return { isValid: true };
};

/**
 * Valida número de teléfono celular colombiano.
 * - Acepta 10 dígitos (ej: 3125473848) o con prefijo (+57).
 */
export const validatePhone = (phone: string): ValidationResult => {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'El número de teléfono es obligatorio.' };
  }
  const cleanDigits = trimmed.replace(/\D/g, '');
  const normalized = (cleanDigits.length === 12 && cleanDigits.startsWith('57'))
    ? cleanDigits.slice(2)
    : cleanDigits;

  if (normalized.length !== 10) {
    return { isValid: false, error: 'El celular debe tener 10 dígitos (ej: 312 345 6789).' };
  }
  if (!normalized.startsWith('3')) {
    return { isValid: false, error: 'El celular colombiano debe iniciar con el número 3.' };
  }
  return { isValid: true };
};

/**
 * Valida la dirección exacta de entrega domiciliaria.
 */
export const validateAddress = (address: string, isPickup: boolean = false): ValidationResult => {
  if (isPickup) return { isValid: true };
  const trimmed = address.trim();
  if (!trimmed) {
    return { isValid: false, error: 'La dirección exacta de entrega es obligatoria.' };
  }
  if (isSuspiciousPayload(trimmed)) {
    return { isValid: false, error: 'La dirección contiene caracteres no permitidos.' };
  }
  if (trimmed.length < 6) {
    return { isValid: false, error: 'Ingresa una dirección completa (ej: Cra 35 # 48-12).' };
  }
  return { isValid: true };
};

/**
 * Valida barrio o sector de entrega.
 */
export const validateBarrio = (barrio: string, isPickup: boolean = false): ValidationResult => {
  if (isPickup) return { isValid: true };
  const trimmed = barrio.trim();
  if (!trimmed) {
    return { isValid: false, error: 'El barrio o sector es obligatorio para el domicilio.' };
  }
  if (isSuspiciousPayload(trimmed)) {
    return { isValid: false, error: 'El barrio contiene caracteres no permitidos.' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Ingresa un barrio o sector válido (mínimo 3 letras).' };
  }
  return { isValid: true };
};

