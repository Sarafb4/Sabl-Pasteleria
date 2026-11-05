/**
 * Utilidades de validación de entradas de usuario (Inputs) para Sablée Pastelería.
 * Proporciona validación estricta y amigable para nombres, teléfonos, correos y direcciones.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida nombre completo del cliente.
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Por favor ingresa tu nombre completo.' };
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
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Ingresa un barrio o sector válido (mínimo 3 letras).' };
  }
  return { isValid: true };
};

