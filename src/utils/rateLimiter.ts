/**
 * Utilidad de Rate Limiting para Sablée Pastelería.
 * Protege el sistema contra saturación de solicitudes, spam de pedidos,
 * exceso de consumo de cuota de EmailJS y ataques repetitivos.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const STORAGE_PREFIX = 'sablee_ratelimit_';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  message?: string;
}

/**
 * Evalúa y registra un intento de acción con límite de frecuencia por ventana de tiempo.
 *
 * @param action Identificador único de la acción protegida (ej: 'order_create', 'email_send', 'order_search')
 * @param maxAttempts Máximo de intentos permitidos dentro de la ventana de tiempo
 * @param windowMs Duración de la ventana en milisegundos (por defecto 60 segundos)
 * @returns {RateLimitResult} Objeto con `allowed` (true/false), intentos restantes y segundos de espera
 */
export const checkRateLimit = (
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): RateLimitResult => {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
  }

  const storageKey = `${STORAGE_PREFIX}${action}`;
  const now = Date.now();
  let record: RateLimitRecord = { timestamps: [] };

  try {
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (raw) {
      record = JSON.parse(raw);
    }
  } catch (e) {
    record = { timestamps: [] };
  }

  // Filtrar únicamente los intentos ocurridos dentro de la ventana actual
  const validTimestamps = record.timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfterMs = windowMs - (now - oldestTimestamp);
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSec,
      message: `Has superado el límite de intentos permitidos. Por favor espera ${retryAfterSec} segundos para no saturar el sistema.`
    };
  }

  // Registrar el intento actual
  validTimestamps.push(now);
  const updatedRecord: RateLimitRecord = { timestamps: validTimestamps };

  try {
    const serialized = JSON.stringify(updatedRecord);
    sessionStorage.setItem(storageKey, serialized);
    localStorage.setItem(storageKey, serialized);
  } catch (e) {
    // Si el almacenamiento está bloqueado o lleno, no interrumpir la navegación
  }

  return {
    allowed: true,
    remaining: maxAttempts - validTimestamps.length,
    retryAfterSec: 0
  };
};

/**
 * Resetea el historial de intentos para una acción específica.
 */
export const resetRateLimit = (action: string): void => {
  if (typeof window === 'undefined') return;
  const storageKey = `${STORAGE_PREFIX}${action}`;
  try {
    sessionStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey);
  } catch (e) {
    // Silencioso
  }
};

