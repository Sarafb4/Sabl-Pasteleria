import { create } from 'zustand';
import { EmailConfig, DEFAULT_EMAIL_CONFIG, sendOrderEmailNotification } from '../services/emailService';
import {
  saveOrderToSupabase,
  fetchOrdersFromSupabase,
  updateOrderStatusInSupabase,
  attachReceiptInSupabase,
  deleteOrderInSupabase,
  isSupabaseConfigured
} from '../services/supabaseClient';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  details?: string;
  city: string;
  notes?: string;
}

export type OrderStatus = 'Pendiente por validación' | 'Confirmado' | 'En preparación' | 'En camino' | 'Entregado' | 'Pago no validado';

export interface Order {
  id: string;
  date: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  receiptUrl?: string;
  channel: 'Web / QR' | 'WhatsApp';
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  privacyAccepted?: boolean;
  privacyAcceptedAt?: string;
  dataConsentAccepted?: boolean;
  dataConsentAt?: string;
  cookieConsentAt?: string;
}

export const playOrderChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primer tono (campana dulce)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Segundo tono (armónico agudo)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.16);
    gain2.gain.setValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 1.2);
  } catch (e) {
    // sound prevented
  }
};

export const triggerSystemNotification = (title: string, body: string, url: string = '/admin') => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'sablee-order-' + Date.now()
      });
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    } catch (e) {
      console.log('System notification suppressed', e);
    }
  }
};

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  hours: string;
}

export interface BakerySchedule {
  isOpen: boolean;
  days: DaySchedule[];
  weekdays: string;
  saturdays: string;
  sundays: string;
  notice: string;
  footerText?: string;
}

interface OrderStore {
  orders: Order[];
  isAuthenticated: boolean;
  bakeryPhone: string;
  adminPassword: string;
  schedule: BakerySchedule;
  emailConfig: EmailConfig;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
  setBakeryPhone: (phone: string) => void;
  login: (pin: string) => boolean;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => { success: boolean; message: string };
  setSchedule: (updates: Partial<BakerySchedule>) => void;
  updateEmailConfig: (updates: Partial<EmailConfig>) => void;
  toggleStoreOpen: () => void;
  createOrder: (orderData: Omit<Order, 'id' | 'date'>) => string;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  attachReceipt: (id: string, receiptBase64: string) => void;
  deleteOrder: (id: string) => void;
}

const STORAGE_KEY = 'sablee_orders_v1';
const AUTH_KEY = 'sablee_admin_auth';
const SESSION_KEY = 'sablee_admin_session_v2';
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 horas de sesión protegida
const PHONE_KEY = 'sablee_bakery_phone';
const PASSWORD_KEY = 'sablee_admin_password_v1';
const SCHEDULE_KEY = 'sablee_bakery_schedule_v1';
const EMAIL_CONFIG_KEY = 'sablee_email_config_v1';
const DEFAULT_PHONE = '573125473848';
const DEFAULT_PASSWORD = 'sablee';

export const DEFAULT_DAYS: DaySchedule[] = [
  { day: 'Lunes', isOpen: true, hours: '8:00 AM - 7:00 PM' },
  { day: 'Martes', isOpen: true, hours: '8:00 AM - 7:00 PM' },
  { day: 'Miércoles', isOpen: true, hours: '8:00 AM - 7:00 PM' },
  { day: 'Jueves', isOpen: true, hours: '8:00 AM - 7:00 PM' },
  { day: 'Viernes', isOpen: true, hours: '8:00 AM - 7:00 PM' },
  { day: 'Sábado', isOpen: true, hours: '8:30 AM - 6:00 PM' },
  { day: 'Domingo', isOpen: true, hours: '9:00 AM - 2:00 PM' },
  { day: 'Festivos', isOpen: false, hours: 'Cerrado' }
];

const DEFAULT_SCHEDULE: BakerySchedule = {
  isOpen: true,
  days: DEFAULT_DAYS,
  weekdays: 'Lunes a Viernes: 8:00 AM - 7:00 PM',
  saturdays: 'Sábados: 8:30 AM - 6:00 PM',
  sundays: 'Domingos y Festivos: 9:00 AM - 2:00 PM',
  notice: 'Tomamos pedidos con entregas en Bucaramanga, Floridablanca, Girón y Piedecuesta.',
  footerText: 'Abierto todos los días desde las 7 am'
};

const INITIAL_ORDERS: Order[] = [
  {
    id: 'SAB-1024',
    date: new Date(Date.now() - 3600000 * 2).toLocaleString('es-CO'),
    customer: {
      name: 'Camila Restrepo',
      phone: '3157894512',
      email: 'camila.restrepo@gmail.com',
      address: 'Carrera 43A # 14-25',
      details: 'Apto 402, Torre Norte',
      city: 'Medellín',
      notes: 'Para cumpleaños, por favor incluir velita.'
    },
    items: [
      { id: 'torta-amapola-1-2-libra', name: 'Amapola · 1/2 libra (16 porciones)', price: 70000, quantity: 1 },
      { id: 'galleta-nutella-3x', name: 'Nutella · 3 Unidades (3x)', price: 22000, quantity: 1 }
    ],
    subtotal: 92000,
    tax: 0,
    total: 92000,
    status: 'En preparación',
    channel: 'Web / QR'
  },
  {
    id: 'SAB-1025',
    date: new Date(Date.now() - 3600000 * 5).toLocaleString('es-CO'),
    customer: {
      name: 'Mateo Valencia',
      phone: '3004561234',
      email: 'mvalencia@hotmail.com',
      address: 'Calle 10 # 32-15',
      city: 'Medellín',
      notes: 'Llamar al llegar.'
    },
    items: [
      { id: 'postre-genovesa-1-4-libra', name: 'Genovesa · 1/4 libra (8 porciones)', price: 55000, quantity: 1 }
    ],
    subtotal: 55000,
    tax: 0,
    total: 55000,
    status: 'Pendiente por validación',
    channel: 'WhatsApp'
  },
  {
    id: 'SAB-1023',
    date: new Date(Date.now() - 3600000 * 24).toLocaleString('es-CO'),
    customer: {
      name: 'Valentina Ospina',
      phone: '3206549870',
      email: 'vale.ospina@gmail.com',
      address: 'Circular 4 # 71-10',
      details: 'Casa esquinera reja blanca',
      city: 'Medellín'
    },
    items: [
      { id: 'galleta-mix-surtido-6x', name: 'Mix Surtido Sablée · Caja x6 (Surtida)', price: 45000, quantity: 2 }
    ],
    subtotal: 90000,
    tax: 0,
    total: 90000,
    status: 'Entregado',
    channel: 'Web / QR'
  }
];

export const useOrderStore = create<OrderStore>((set, get) => {
  // Cargar órdenes previas o usar iniciales con protección total contra JSON corrupto
  const loadInitialOrders = (): Order[] => {
    if (typeof window === 'undefined') return INITIAL_ORDERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return INITIAL_ORDERS;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((o: any) => {
          if (!o || typeof o !== 'object') return null;
          return {
            ...o,
            id: String(o.id || `SAB-${Math.floor(1000 + Math.random() * 9000)}`),
            customer: o.customer && typeof o.customer === 'object' ? {
              name: String(o.customer.name || 'Cliente'),
              phone: String(o.customer.phone || '3125473848'),
              email: String(o.customer.email || ''),
              address: String(o.customer.address || 'Recoge en Tienda'),
              details: o.customer.details ? String(o.customer.details) : '',
              city: String(o.customer.city || 'Bucaramanga'),
              notes: o.customer.notes ? String(o.customer.notes) : ''
            } : {
              name: 'Cliente',
              phone: '3125473848',
              email: '',
              address: 'Bucaramanga',
              city: 'Bucaramanga'
            },
            items: Array.isArray(o.items) ? o.items : [],
            subtotal: Number(o.subtotal) || Number(o.total) || 0,
            tax: Number(o.tax) || 0,
            total: Number(o.total) || 0,
            status: (o.status === 'Pendiente de pago' ? 'Pendiente por validación' : (o.status || 'Pendiente por validación')) as OrderStatus,
            channel: (o.channel || 'Web / QR') as any
          };
        }).filter(Boolean) as Order[];
      }
    } catch (e) {
      console.warn('Error cargando pedidos desde localStorage:', e);
    }
    return INITIAL_ORDERS;
  };

  const initialOrders: Order[] = loadInitialOrders();
  // Validación segura de sesión con expiración automática
  const checkInitialAuth = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (session && typeof session.expiresAt === 'number' && session.expiresAt > Date.now()) {
        return true;
      }
      // Sesión expirada: limpiar almacenamiento
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(AUTH_KEY);
      return false;
    } catch {
      return false;
    }
  };

  const isAuthSaved = checkInitialAuth();
  const savedPhone = (typeof window !== 'undefined' ? localStorage.getItem(PHONE_KEY) : null) || DEFAULT_PHONE;
  const savedPassword = (typeof window !== 'undefined' ? localStorage.getItem(PASSWORD_KEY) : null) || DEFAULT_PASSWORD;

  const loadSchedule = (): BakerySchedule => {
    if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
    try {
      const saved = localStorage.getItem(SCHEDULE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { 
            ...DEFAULT_SCHEDULE, 
            ...parsed,
            days: Array.isArray(parsed.days) && parsed.days.length > 0 ? parsed.days : DEFAULT_DAYS
          };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SCHEDULE;
  };
  const initialSchedule = loadSchedule();

  const loadEmailConfig = (): EmailConfig => {
    if (typeof window === 'undefined') return DEFAULT_EMAIL_CONFIG;
    try {
      const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_EMAIL_CONFIG, ...parsed };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMAIL_CONFIG;
  };
  const initialEmailConfig = loadEmailConfig();

  const saveOrders = (orders: Order[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (quotaError) {
        console.warn('Límite de localStorage alcanzado. Guardando pedidos optimizados sin imágenes pesadas:', quotaError);
        try {
          // Guardar sin los base64 pesados de comprobantes para evitar fallos de cuota en el navegador
          const optimized = orders.map(o => ({
            ...o,
            receiptUrl: (o.receiptUrl && o.receiptUrl.length > 500) ? 'receipt_stored' : o.receiptUrl
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(optimized));
        } catch {
          // Si la cuota sigue saturada, los pedidos se mantienen en el estado en memoria de Zustand
        }
      }
    }
  };

  const sanitizePhone = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '57' + clean;
    return clean || DEFAULT_PHONE;
  };

  return {
    orders: initialOrders,
    isAuthenticated: isAuthSaved,
    bakeryPhone: savedPhone,
    adminPassword: savedPassword,
    schedule: initialSchedule,
    emailConfig: initialEmailConfig,
    isSyncing: false,

    syncWithSupabase: async () => {
      if (!isSupabaseConfigured()) return;
      set({ isSyncing: true });
      try {
        const { data: remoteOrders, error } = await fetchOrdersFromSupabase();
        if (!error && Array.isArray(remoteOrders)) {
          // Fusionar pedidos locales con remotos sin duplicar
          const localOrders = get().orders;
          const remoteIds = new Set(remoteOrders.map(o => o.id));
          
          // Mantener locales recién creados que aún no estén en remoto
          const uniqueLocals = localOrders.filter(l => !remoteIds.has(l.id));
          const merged = [...uniqueLocals, ...remoteOrders];

          saveOrders(merged);
          set({ orders: merged });
        }
      } catch (e) {
        console.warn('Error sincronizando con Supabase:', e);
      } finally {
        set({ isSyncing: false });
      }
    },

    setBakeryPhone: (phone: string) => {
      const sanitized = sanitizePhone(phone);
      if (typeof window !== 'undefined') {
        localStorage.setItem(PHONE_KEY, sanitized);
      }
      set({ bakeryPhone: sanitized });
    },

    login: (pin: string) => {
      const trimmed = pin.trim();
      const currentPass = get().adminPassword.trim();

      // Control Estricto: Solo coincide con la contraseña configurada
      // Se eliminaron todas las claves genéricas o backdoors inseguros ('admin', '1234')
      if (trimmed === currentPass) {
        if (typeof window !== 'undefined') {
          const sessionPayload = {
            token: `sablee_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            expiresAt: Date.now() + SESSION_DURATION_MS,
            authenticatedAt: new Date().toISOString()
          };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        }
        set({ isAuthenticated: true });
        return true;
      }
      return false;
    },

    changePassword: (currentPass: string, newPass: string) => {
      const current = get().adminPassword.trim();
      
      // Verificación estricta contra la contraseña activa
      if (currentPass.trim() !== current) {
        return { success: false, message: 'La contraseña actual ingresada es incorrecta.' };
      }
      if (newPass.trim().length < 6) {
        return { success: false, message: 'La nueva contraseña debe tener mínimo 6 caracteres.' };
      }
      
      const newSecret = newPass.trim();
      if (typeof window !== 'undefined') {
        localStorage.setItem(PASSWORD_KEY, newSecret);
      }
      set({ adminPassword: newSecret });
      return { success: true, message: '¡Tu contraseña ha sido actualizada con éxito!' };
    },

    setSchedule: (updates) => {
      const updated = { ...get().schedule, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(updated));
      }
      set({ schedule: updated });
    },

    updateEmailConfig: (updates) => {
      const updated = { ...get().emailConfig, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(updated));
      }
      set({ emailConfig: updated });
    },

    toggleStoreOpen: () => {
      const updated = { ...get().schedule, isOpen: !get().schedule.isOpen };
      if (typeof window !== 'undefined') {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(updated));
      }
      set({ schedule: updated });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(AUTH_KEY);
      }
      set({ isAuthenticated: false });
    },

    createOrder: (orderData) => {
      const newId = `SAB-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();
      
      // Obtener fecha de aceptación de cookies si existe en este dispositivo
      let cookieConsentAt: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        try {
          const cookieRaw = localStorage.getItem('sablee_cookies_accepted');
          if (cookieRaw) {
            const parsed = JSON.parse(cookieRaw);
            cookieConsentAt = parsed.timestamp;
          }
        } catch {}
      }

      const newOrder: Order = {
        ...orderData,
        id: newId,
        date: new Date().toLocaleString('es-CO'),
        termsAccepted: orderData.termsAccepted !== false,
        termsAcceptedAt: orderData.termsAcceptedAt || nowIso,
        privacyAccepted: orderData.privacyAccepted !== false,
        privacyAcceptedAt: orderData.privacyAcceptedAt || nowIso,
        dataConsentAccepted: orderData.dataConsentAccepted !== false,
        dataConsentAt: orderData.dataConsentAt || nowIso,
        cookieConsentAt: orderData.cookieConsentAt || cookieConsentAt
      };

      const updated = [newOrder, ...get().orders];
      saveOrders(updated);
      set({ orders: updated });

      // Guardar ID en localStorage del dispositivo para seguimiento en tiempo real
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sablee_user_orders');
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(newId)) {
            list.unshift(newId);
            localStorage.setItem('sablee_user_orders', JSON.stringify(list));
          }
        } catch {}
      }

      // Notificación automática (Sonido + Web Push para la dueña)
      playOrderChime();
      triggerSystemNotification(
        `Sablée: ¡Nuevo pedido #${newId}!`,
        `Cliente: ${newOrder.customer.name} · Total: $${newOrder.total.toLocaleString('es-CO')} (${newOrder.customer.city})`,
        `/admin`
      );

      // Guardar de forma asíncrona y segura en Supabase (con encriptación TLS)
      saveOrderToSupabase(newOrder).catch(err => {
        console.warn('Respaldo en Supabase falló, orden preservada localmente:', err);
      });

      // Opción 2: Correo electrónico automático al celular de la dueña (EmailJS)
      sendOrderEmailNotification(newOrder, get().emailConfig).catch(err => {
        console.warn('Alerta EmailJS en segundo plano:', err);
      });

      return newId;
    },

    updateOrderStatus: (id, status) => {
      const updated = get().orders.map(o => o.id === id ? { ...o, status } : o);
      saveOrders(updated);
      set({ orders: updated });

      // Actualizar en Supabase
      updateOrderStatusInSupabase(id, status).catch(err => {
        console.warn('Error sincronizando estado con Supabase:', err);
      });
    },

    attachReceipt: (id, receiptBase64) => {
      const updated = get().orders.map(o => o.id === id ? { ...o, receiptUrl: receiptBase64, status: 'Pendiente por validación' as OrderStatus } : o);
      saveOrders(updated);
      set({ orders: updated });

      // Notificación automática de comprobante recibido para validar
      playOrderChime();
      triggerSystemNotification(
        `¡Nuevo comprobante #${id}!`,
        `El cliente subió su comprobante de pago. Pendiente por validación.`,
        `/admin`
      );

      // Guardar comprobante en Supabase
      attachReceiptInSupabase(id, receiptBase64).catch(err => {
        console.warn('Error subiendo comprobante a Supabase:', err);
      });
    },

    deleteOrder: (id) => {
      const updated = get().orders.filter(o => o.id !== id);
      saveOrders(updated);
      set({ orders: updated });

      // Eliminar en Supabase
      deleteOrderInSupabase(id).catch(err => {
        console.warn('Error eliminando pedido en Supabase:', err);
      });
    }
  };
});

// Sincronización automática no bloqueante en segundo plano al iniciar
if (typeof window !== 'undefined' && isSupabaseConfigured()) {
  setTimeout(() => {
    useOrderStore.getState().syncWithSupabase();
  }, 800);
}

