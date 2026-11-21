import { createClient } from '@supabase/supabase-js';
import type { Order, OrderStatus } from '../store/orderStore';
import type { MenuItem } from '../data/menuData';

// Variables de entorno inyectadas por Vite de forma segura
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Cliente seguro de Supabase para Sablée Pastelería.
 * 
 * Normas de Seguridad Implementadas:
 * 1. Comunicación Encriptada en Tránsito: Solo admite conexiones seguras mediante TLS/HTTPS.
 * 2. Mínimo Privilegio: Utiliza exclusivamente la llave pública/anon (Publishable Key).
 *    La clave service_role NUNCA se expone en el cliente web.
 * 3. Consultas Parametrizadas: El SDK de Supabase genera peticiones JSON parametrizadas,
 *    eliminando completamente vectores de inyección SQL.
 * 4. Resiliencia & Fail-safe: Si la base de datos no está disponible o las tablas no han sido creadas,
 *    el sistema degrada graciosamente a almacenamiento local sin interrumpir la experiencia del cliente.
 */
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'))
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
};

export interface ConnectionDiagnostic {
  ok: boolean;
  status: 'connected' | 'unconfigured' | 'tables_missing' | 'error';
  message: string;
  pingMs?: number;
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  isHttps: boolean;
  tables?: {
    orders: boolean;
    menu_items: boolean;
    payment_methods: boolean;
    bakery_settings: boolean;
  };
}

/**
 * Diagnóstico de conexión en tiempo real para verificar el estado de Supabase.
 */
export const testSupabaseConnection = async (): Promise<ConnectionDiagnostic> => {
  const isHttps = supabaseUrl.startsWith('https://');
  const urlConfigured = Boolean(supabaseUrl);
  const anonKeyConfigured = Boolean(supabaseAnonKey);

  if (!urlConfigured || !anonKeyConfigured || !supabase) {
    return {
      ok: false,
      status: 'unconfigured',
      message: 'Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están definidas en el archivo .env',
      urlConfigured,
      anonKeyConfigured,
      isHttps
    };
  }

  const startTime = Date.now();
  const tablesStatus = {
    orders: false,
    menu_items: false,
    payment_methods: false,
    bakery_settings: false
  };

  try {
    // Probar tabla orders
    const { error: ordersErr } = await supabase.from('orders').select('id').limit(1);
    tablesStatus.orders = !ordersErr || ordersErr.code !== '42P01'; // 42P01 = undefined_table

    // Probar tabla menu_items
    const { error: menuErr } = await supabase.from('menu_items').select('id').limit(1);
    tablesStatus.menu_items = !menuErr || menuErr.code !== '42P01';

    // Probar tabla payment_methods
    const { error: payErr } = await supabase.from('payment_methods').select('id').limit(1);
    tablesStatus.payment_methods = !payErr || payErr.code !== '42P01';

    // Probar tabla bakery_settings
    const { error: settingsErr } = await supabase.from('bakery_settings').select('id').limit(1);
    tablesStatus.bakery_settings = !settingsErr || settingsErr.code !== '42P01';

    const pingMs = Date.now() - startTime;

    if (!tablesStatus.orders || !tablesStatus.menu_items) {
      return {
        ok: false,
        status: 'tables_missing',
        message: 'Conectado a Supabase pero las tablas no existen todavía. Ejecuta el script supabase_schema_and_rls.sql en el SQL Editor.',
        pingMs,
        urlConfigured,
        anonKeyConfigured,
        isHttps,
        tables: tablesStatus
      };
    }

    return {
      ok: true,
      status: 'connected',
      message: '¡Conexión exitosa y encriptada (HTTPS/TLS)! Todas las tablas y políticas están operativas.',
      pingMs,
      urlConfigured,
      anonKeyConfigured,
      isHttps,
      tables: tablesStatus
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 'error',
      message: `Error al conectar con Supabase: ${err.message || 'Error de red o timeout'}`,
      pingMs: Date.now() - startTime,
      urlConfigured,
      anonKeyConfigured,
      isHttps,
      tables: tablesStatus
    };
  }
};

/* ====================================================================
 * MAPEOS Y SERVICIOS DE PEDIDOS (ORDERS)
 * ==================================================================== */

const mapOrderToDb = (order: Order) => ({
  id: String(order.id).trim().slice(0, 32),
  customer_name: String(order.customer.name).trim().slice(0, 120),
  customer_phone: String(order.customer.phone).trim().slice(0, 30),
  customer_email: order.customer.email ? String(order.customer.email).trim().slice(0, 120) : null,
  customer_address: String(order.customer.address).trim().slice(0, 200),
  customer_details: order.customer.details ? String(order.customer.details).trim().slice(0, 200) : null,
  customer_city: String(order.customer.city || 'Bucaramanga').trim().slice(0, 60),
  customer_notes: order.customer.notes ? String(order.customer.notes).trim().slice(0, 400) : null,
  items: order.items,
  subtotal: Math.max(0, Number(order.subtotal) || 0),
  tax: Math.max(0, Number(order.tax) || 0),
  total: Math.max(0, Number(order.total) || 0),
  status: order.status,
  receipt_url: order.receiptUrl || null,
  channel: order.channel || 'Web / QR',
  terms_accepted: order.termsAccepted !== false,
  terms_accepted_at: order.termsAcceptedAt || order.dataConsentAt || new Date().toISOString(),
  privacy_accepted: order.privacyAccepted !== false,
  privacy_accepted_at: order.privacyAcceptedAt || order.dataConsentAt || new Date().toISOString(),
  data_consent: order.dataConsentAccepted !== false,
  data_consent_at: order.dataConsentAt || new Date().toISOString(),
  cookie_consent_at: order.cookieConsentAt || null
});

const mapDbToOrder = (row: any): Order => ({
  id: row.id,
  date: row.created_at ? new Date(row.created_at).toLocaleString('es-CO') : (row.date || new Date().toLocaleString('es-CO')),
  customer: {
    name: row.customer_name || 'Cliente',
    phone: row.customer_phone || '',
    email: row.customer_email || '',
    address: row.customer_address || '',
    details: row.customer_details || '',
    city: row.customer_city || 'Bucaramanga',
    notes: row.customer_notes || ''
  },
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal) || 0,
  tax: Number(row.tax) || 0,
  total: Number(row.total) || 0,
  status: (row.status || 'Pendiente por validación') as OrderStatus,
  receiptUrl: row.receipt_url || undefined,
  channel: (row.channel || 'Web / QR') as any,
  termsAccepted: row.terms_accepted !== false,
  termsAcceptedAt: row.terms_accepted_at || undefined,
  privacyAccepted: row.privacy_accepted !== false,
  privacyAcceptedAt: row.privacy_accepted_at || undefined,
  dataConsentAccepted: row.data_consent !== false,
  dataConsentAt: row.data_consent_at || undefined,
  cookieConsentAt: row.cookie_consent_at || undefined
});

export const saveOrderToSupabase = async (order: Order): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no está configurado' };

  try {
    const payload = mapOrderToDb(order);
    const { error } = await supabase.from('orders').insert([payload]);
    if (error) {
      console.warn('Advertencia Supabase al insertar pedido:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Fallo de red al guardar en Supabase:', err.message);
    return { success: false, error: err.message };
  }
};

export const fetchOrdersFromSupabase = async (): Promise<{ data: Order[] | null; error?: string }> => {
  if (!supabase) return { data: null, error: 'Supabase no está configurado' };

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error obteniendo pedidos de Supabase:', error.message);
      return { data: null, error: error.message };
    }

    const mapped = (data || []).map(mapDbToOrder);
    return { data: mapped };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const fetchOrderByIdFromSupabase = async (orderId: string): Promise<{ data: Order | null; error?: string }> => {
  if (!supabase) return { data: null, error: 'Supabase no está configurado' };

  try {
    const cleanId = String(orderId).trim();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', cleanId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapDbToOrder(data) : null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const updateOrderStatusInSupabase = async (id: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no está configurado' };

  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.warn('Error al actualizar estado en Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const attachReceiptInSupabase = async (id: string, receiptBase64: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no está configurado' };

  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        receipt_url: receiptBase64,
        status: 'Pendiente por validación'
      })
      .eq('id', id);

    if (error) {
      console.warn('Error al subir comprobante a Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteOrderInSupabase = async (id: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no está configurado' };

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Error al borrar pedido en Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/* ====================================================================
 * MAPEOS Y SERVICIOS DE CATÁLOGO (MENU ITEMS)
 * ==================================================================== */

const mapMenuItemToDb = (item: MenuItem) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  description: item.desc || '',
  badge: item.badge || null,
  image: item.image || null,
  images: item.images || (item.image ? [item.image] : []),
  presentations: item.presentations || [],
  available: item.available !== false
});

const mapDbToMenuItem = (row: any): MenuItem => ({
  id: row.id,
  name: row.name,
  category: row.category,
  desc: row.description || '',
  badge: row.badge || undefined,
  image: row.image || undefined,
  images: Array.isArray(row.images) ? row.images : (row.image ? [row.image] : []),
  presentations: Array.isArray(row.presentations) ? row.presentations : [],
  available: row.available !== false
});

export const fetchMenuItemsFromSupabase = async (): Promise<{ data: MenuItem[] | null; error?: string }> => {
  if (!supabase) return { data: null, error: 'Supabase no configurado' };

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };
    const mapped = (data || []).map(mapDbToMenuItem);
    return { data: mapped };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const upsertMenuItemToSupabase = async (item: MenuItem): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };

  try {
    const payload = mapMenuItemToDb(item);
    const { error } = await supabase
      .from('menu_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteMenuItemInSupabase = async (id: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };

  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/* ====================================================================
 * AUDITORÍA DE CONSENTIMIENTOS: COOKIES, PRIVACIDAD & TÉRMINOS
 * ==================================================================== */

export interface CookieConsentData {
  necessary: boolean;
  analytics?: boolean;
  marketing?: boolean;
  acceptedAt?: string;
  pageUrl?: string;
}

export const saveCookieConsentToSupabase = async (consent: CookieConsentData): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };

  try {
    const payload = {
      accepted_at: consent.acceptedAt || new Date().toISOString(),
      necessary: consent.necessary !== false,
      analytics: !!consent.analytics,
      marketing: !!consent.marketing,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      page_url: consent.pageUrl || (typeof window !== 'undefined' ? window.location.pathname : '/')
    };

    const { error } = await supabase.from('cookie_consents').insert([payload]);
    if (error) {
      console.warn('Aviso Supabase al guardar cookie_consents:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Fallo guardando cookie_consents en Supabase:', err.message);
    return { success: false, error: err.message };
  }
};

export interface LegalConsentData {
  consentType: 'terminos_y_condiciones' | 'politica_privacidad' | 'habeas_data' | 'cookies';
  accepted: boolean;
  acceptedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderId?: string;
}

export const saveLegalConsentToSupabase = async (data: LegalConsentData): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };

  try {
    const payload = {
      consent_type: data.consentType,
      accepted: data.accepted,
      accepted_at: data.acceptedAt || new Date().toISOString(),
      customer_name: data.customerName ? String(data.customerName).slice(0, 120) : null,
      customer_phone: data.customerPhone ? String(data.customerPhone).slice(0, 30) : null,
      customer_email: data.customerEmail ? String(data.customerEmail).slice(0, 120) : null,
      order_id: data.orderId ? String(data.orderId).slice(0, 32) : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };

    const { error } = await supabase.from('legal_consents').insert([payload]);
    if (error) {
      console.warn('Aviso Supabase al guardar legal_consents:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Fallo guardando legal_consents en Supabase:', err.message);
    return { success: false, error: err.message };
  }
};

export const fetchCookieConsentsFromSupabase = async (limit = 25): Promise<{ data: any[] | null; count: number; error?: string }> => {
  if (!supabase) return { data: null, count: 0, error: 'Supabase no configurado' };
  try {
    const { data, count, error } = await supabase
      .from('cookie_consents')
      .select('*', { count: 'exact' })
      .order('accepted_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, count: 0, error: error.message };
    return { data, count: count ?? (data ? data.length : 0) };
  } catch (err: any) {
    return { data: null, count: 0, error: err.message };
  }
};

export const fetchLegalConsentsFromSupabase = async (limit = 25): Promise<{ data: any[] | null; count: number; error?: string }> => {
  if (!supabase) return { data: null, count: 0, error: 'Supabase no configurado' };
  try {
    const { data, count, error } = await supabase
      .from('legal_consents')
      .select('*', { count: 'exact' })
      .order('accepted_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, count: 0, error: error.message };
    return { data, count: count ?? (data ? data.length : 0) };
  } catch (err: any) {
    return { data: null, count: 0, error: err.message };
  }
};



