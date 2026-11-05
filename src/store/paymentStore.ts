import { create } from 'zustand';

export interface PaymentMethod {
  id: string;
  name: string; // ej: Nequi, Bancolombia QR, Daviplata
  bank: string; // Banco o billetera
  accountType: string; // Ahorros, Celular, Billetera digital
  accountNumber: string; // Número de cuenta o celular
  holderName: string; // Titular
  holderId?: string; // Documento o NIT
  qrImage?: string; // Imagen Base64 del código QR
  instructions?: string;
  enabled: boolean;
}

interface PaymentStore {
  methods: PaymentMethod[];
  addMethod: (data: Omit<PaymentMethod, 'id'>) => void;
  updateMethod: (id: string, data: Partial<PaymentMethod>) => void;
  deleteMethod: (id: string) => void;
  toggleMethod: (id: string) => void;
  uploadQrImage: (id: string, base64: string) => void;
}

const STORAGE_KEY = 'sablee_payment_methods_v1';

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-nequi',
    name: 'Nequi',
    bank: 'Nequi',
    accountType: 'Celular / Billetera Digital',
    accountNumber: '312 547 3848',
    holderName: 'Sablée Pastelería',
    instructions: 'Abre tu app Nequi, envía dinero a este número o escanea el código QR y adjunta tu comprobante.',
    enabled: true
  },
  {
    id: 'pm-bancolombia',
    name: 'Bancolombia',
    bank: 'Bancolombia',
    accountType: 'Cuenta de Ahorros',
    accountNumber: 'Pendiente por definir',
    holderName: 'Sablée Pastelería',
    instructions: 'Transfiere desde tu app Bancolombia o Bancolombia a la Mano y sube el comprobante.',
    enabled: true
  },
  {
    id: 'pm-daviplata',
    name: 'Daviplata',
    bank: 'Daviplata',
    accountType: 'Celular / Billetera Digital',
    accountNumber: '312 547 3848',
    holderName: 'Sablée Pastelería',
    instructions: 'Transfiere a través de Daviplata a este número celular y sube el comprobante.',
    enabled: true
  }
];

const loadInitialMethods = (): PaymentMethod[] => {
  if (typeof window === 'undefined') return DEFAULT_METHODS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_METHODS;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error cargando medios de pago desde localStorage:', e);
  }
  return DEFAULT_METHODS;
};

export const usePaymentStore = create<PaymentStore>((set, get) => {
  const initialMethods = loadInitialMethods();

  const save = (methods: PaymentMethod[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
    }
  };

  return {
    methods: initialMethods,

    addMethod: (data) => {
      const newMethod: PaymentMethod = {
        ...data,
        id: `pm-${Date.now()}`
      };
      const updated = [...get().methods, newMethod];
      save(updated);
      set({ methods: updated });
    },

    updateMethod: (id, data) => {
      const updated = get().methods.map(m => m.id === id ? { ...m, ...data } : m);
      save(updated);
      set({ methods: updated });
    },

    deleteMethod: (id) => {
      const updated = get().methods.filter(m => m.id !== id);
      save(updated);
      set({ methods: updated });
    },

    toggleMethod: (id) => {
      const updated = get().methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
      save(updated);
      set({ methods: updated });
    },

    uploadQrImage: (id, base64) => {
      const updated = get().methods.map(m => m.id === id ? { ...m, qrImage: base64 } : m);
      save(updated);
      set({ methods: updated });
    }
  };
});

