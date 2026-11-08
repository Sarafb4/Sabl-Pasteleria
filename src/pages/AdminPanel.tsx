import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useOrderStore, OrderStatus, playOrderChime, DaySchedule, DEFAULT_DAYS } from '../store/orderStore';
import { usePaymentStore, PaymentMethod } from '../store/paymentStore';
import { useMenuStore } from '../store/menuStore';
import { MenuItem, Presentation } from '../data/menuData';
import { 
  Package, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Search, 
  Phone, 
  MapPin, 
  Trash2, 
  LogOut, 
  Lock, 
  MessageCircle, 
  Eye, 
  EyeOff,
  ShieldCheck,
  Check,
  Plus, 
  Bell, 
  BellRing, 
  Calendar,
  QrCode, 
  CreditCard, 
  Edit3, 
  Upload, 
  BookOpen, 
  RotateCcw,
  Mail,
  Send,
  Copy,
  Truck,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { sendTestEmailNotification } from '../services/emailService';
import { checkRateLimit } from '../utils/rateLimiter';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  'Pendiente por validación': { bg: '#fef3c7', text: '#92400e' },
  'Confirmado': { bg: '#d1ecf1', text: '#0c5460' },
  'En preparación': { bg: '#ffeeba', text: '#b86a04' },
  'En camino': { bg: '#e2e3e5', text: '#383d41' },
  'Entregado': { bg: '#d4edda', text: '#155724' },
  'Pago no validado': { bg: '#fee2e2', text: '#991b1b' }
};

const ALL_STATUS_OPTIONS: Array<{
  status: OrderStatus;
  label: string;
  badgeDesc: string;
  bg: string;
  text: string;
  icon: any;
}> = [
  {
    status: 'Pendiente por validación',
    label: 'Pendiente por validación',
    badgeDesc: 'Comprobante recibido para revisar',
    bg: '#fef3c7',
    text: '#92400e',
    icon: Clock
  },
  {
    status: 'Confirmado',
    label: 'Confirmado (Pago OK)',
    badgeDesc: 'Pago recibido y validado',
    bg: '#d1ecf1',
    text: '#0c5460',
    icon: CheckCircle
  },
  {
    status: 'En preparación',
    label: 'En preparación',
    badgeDesc: 'Horneando en cocina',
    bg: '#ffeeba',
    text: '#b86a04',
    icon: Package
  },
  {
    status: 'En camino',
    label: 'En camino / Enviado',
    badgeDesc: 'Con mensajero a domicilio',
    bg: '#e2e3e5',
    text: '#383d41',
    icon: Truck
  },
  {
    status: 'Entregado',
    label: 'Entregado con éxito',
    badgeDesc: 'Pedido recibido por cliente',
    bg: '#d4edda',
    text: '#155724',
    icon: CheckCircle
  },
  {
    status: 'Pago no validado',
    label: 'Pago no validado',
    badgeDesc: 'Transferencia no recibida / rechazada',
    bg: '#fee2e2',
    text: '#991b1b',
    icon: AlertTriangle
  }
];

const GOOGLE_SCRIPT_SNIPPET = `function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sin datos" })).setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    var recipient = payload.to || "safabu12@gmail.com";
    var subject = payload.subject || "Nuevo Pedido - Sablée Pastelería";
    var htmlBody = payload.html || "<p>Nuevo pedido</p>";

    GmailApp.sendEmail(recipient, subject, "", {
      htmlBody: htmlBody,
      name: "Sablée Pastelería Bucaramanga"
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Comanda enviada a " + recipient })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Servicio de comanda de Sablée Pastelería activo.");
}`;

const AdminPanel: React.FC = () => {
  const { 
    orders, 
    isAuthenticated, 
    login, 
    logout, 
    updateOrderStatus, 
    deleteOrder,
    createOrder,
    bakeryPhone,
    setBakeryPhone,
    schedule,
    emailConfig,
    changePassword,
    setSchedule,
    updateEmailConfig,
    toggleStoreOpen
  } = useOrderStore();

  const [pinInput, setPinInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [activeTab, setActiveTab] = useState<'pedidos' | 'carta' | 'pagos' | 'ajustes'>('pedidos');
  const [settingsSubTab, setSettingsSubTab] = useState<'horario' | 'correo' | 'seguridad'>('horario');
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);

  // Claves de almacenamiento para bloqueo persistente contra ataques de fuerza bruta
  const LOCKOUT_KEY = 'sablee_admin_lockout_until';
  const ATTEMPTS_KEY = 'sablee_admin_failed_attempts';

  const getInitialLockout = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const until = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || localStorage.getItem(LOCKOUT_KEY) || '0', 10);
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch {
      return 0;
    }
  };

  const getInitialAttempts = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      return parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10) || 0;
    } catch {
      return 0;
    }
  };

  // Estados de seguridad y bloqueo para el Login (Persistente incluso al refrescar)
  const [loginAttempts, setLoginAttempts] = useState(getInitialAttempts);
  const [lockoutTimer, setLockoutTimer] = useState(getInitialLockout);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Estados para cambiar contraseña
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Estados para horario de atención
  const [daysSchedule, setDaysSchedule] = useState<DaySchedule[]>(
    Array.isArray(schedule.days) && schedule.days.length > 0 ? schedule.days : DEFAULT_DAYS
  );
  const [noticeInput, setNoticeInput] = useState(schedule.notice);
  const [footerTextInput, setFooterTextInput] = useState(schedule.footerText || '');

  const handleToggleDay = (dayName: string) => {
    setDaysSchedule(prev => prev.map(d => {
      if (d.day === dayName) {
        const nextOpen = !d.isOpen;
        return {
          ...d,
          isOpen: nextOpen,
          hours: nextOpen && (!d.hours || d.hours === 'Cerrado') ? '8:00 AM - 7:00 PM' : d.hours
        };
      }
      return d;
    }));
  };

  const handleDayHoursChange = (dayName: string, newHours: string) => {
    setDaysSchedule(prev => prev.map(d => d.day === dayName ? { ...d, hours: newHours } : d));
  };

  const handleCopyHoursToAll = (sourceHours: string) => {
    if (!sourceHours || sourceHours === 'Cerrado') return;
    setDaysSchedule(prev => prev.map(d => d.isOpen ? { ...d, hours: sourceHours } : d));
    toast.success(`Horario "${sourceHours}" copiado a todos los días abiertos.`);
  };

  // Estados para alertas automáticas por Correo (Google Apps Script - Gmail Directo)
  const [emailEnabled, setEmailEnabled] = useState(emailConfig.enabled);
  const [emailOwner, setEmailOwner] = useState(emailConfig.ownerEmail || 'safabu12@gmail.com');
  const [emailScriptUrl, setEmailScriptUrl] = useState(emailConfig.scriptUrl || '');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setDaysSchedule(Array.isArray(schedule.days) && schedule.days.length > 0 ? schedule.days : DEFAULT_DAYS);
    setNoticeInput(schedule.notice);
    setFooterTextInput(schedule.footerText || '');
    
    setEmailEnabled(emailConfig.enabled);
    setEmailOwner(emailConfig.ownerEmail || 'safabu12@gmail.com');
    setEmailScriptUrl(emailConfig.scriptUrl || '');
  }, [schedule, emailConfig]);

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          const next = Math.max(prev - 1, 0);
          if (next === 0 && typeof window !== 'undefined') {
            sessionStorage.removeItem(LOCKOUT_KEY);
            localStorage.removeItem(LOCKOUT_KEY);
            sessionStorage.removeItem(ATTEMPTS_KEY);
            setLoginAttempts(0);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Cerrar selector de estado al hacer clic afuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setOpenStatusDropdownId(null);
      }
    };
    if (openStatusDropdownId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [openStatusDropdownId]);
  
  // Gestión de la carta / catálogo
  const {
    items: menuItems,
    addItem: addMenuItem,
    updateItem: updateMenuItem,
    deleteItem: deleteMenuItem,
    uploadItemImage,
    toggleAvailability,
    resetToDefault: resetMenuToDefault
  } = useMenuStore();

  const [menuFilterCategory, setMenuFilterCategory] = useState<'todas' | 'tortas' | 'postres' | 'galletas'>('todas');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Formulario modal de Producto
  const [itemCat, setItemCat] = useState<'tortas' | 'postres' | 'galletas'>('tortas');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemBadge, setItemBadge] = useState('');
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [itemPresentations, setItemPresentations] = useState<Presentation[]>([
    { label: '1/4 libra', portions: '8 porciones', price: 60000 },
    { label: '1/2 libra', portions: '16 porciones', price: 70000 }
  ]);

  const openCreateItemModal = () => {
    setEditingItem(null);
    setItemCat('tortas');
    setItemName('');
    setItemDesc('');
    setItemBadge('');
    setItemImages([]);
    setItemPresentations([
      { label: '1/4 libra', portions: '8 porciones', price: 60000 },
      { label: '1/2 libra', portions: '16 porciones', price: 70000 }
    ]);
    setShowItemModal(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemCat(item.category);
    setItemName(item.name);
    setItemDesc(item.desc);
    setItemBadge(item.badge || '');
    const currentImgs = Array.isArray(item.images) && item.images.length > 0 
      ? [...item.images] 
      : (item.image ? [item.image] : []);
    setItemImages(currentImgs);
    setItemPresentations(item.presentations.map(p => ({ ...p })));
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error('Por favor escribe el nombre del producto');
      return;
    }
    if (itemPresentations.length === 0) {
      toast.error('Debes incluir al menos una presentación con su precio');
      return;
    }

    if (editingItem) {
      updateMenuItem(editingItem.id, {
        name: itemName,
        category: itemCat,
        desc: itemDesc,
        badge: itemBadge.trim() || undefined,
        presentations: itemPresentations,
        image: itemImages[0] || undefined,
        images: itemImages
      });
      toast.success('¡Producto y fotos actualizados en la carta!');
    } else {
      addMenuItem({
        name: itemName,
        category: itemCat,
        desc: itemDesc,
        badge: itemBadge.trim() || undefined,
        presentations: itemPresentations,
        image: itemImages[0] || undefined,
        images: itemImages,
        available: true
      });
      toast.success('¡Nuevo producto añadido con éxito a la carta!');
    }

    setShowItemModal(false);
  };

  const handleItemPhotoUpload = (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadItemImage(itemId, base64);
      toast.success('¡Foto del producto actualizada y visible en la tienda!');
    };
    reader.readAsDataURL(file);
  };

  // Gestión de medios de pago & QR
  const { 
    methods: paymentMethods, 
    addMethod: addPaymentMethod, 
    updateMethod: updatePaymentMethod, 
    deleteMethod: deletePaymentMethod, 
    toggleMethod: togglePaymentMethod, 
    uploadQrImage 
  } = usePaymentStore();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Formulario modal de medios de pago
  const [pmName, setPmName] = useState('');
  const [pmBank, setPmBank] = useState('');
  const [pmType, setPmType] = useState('Celular / Billetera Digital');
  const [pmNumber, setPmNumber] = useState('');
  const [pmHolder, setPmHolder] = useState('Sablée Pastelería');
  const [pmInstructions, setPmInstructions] = useState('');

  const openCreatePaymentModal = () => {
    setEditingMethod(null);
    setPmName('');
    setPmBank('');
    setPmType('Celular / Billetera Digital');
    setPmNumber('');
    setPmHolder('Sablée Pastelería');
    setPmInstructions('');
    setShowPaymentModal(true);
  };

  const openEditPaymentModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setPmName(method.name);
    setPmBank(method.bank);
    setPmType(method.accountType);
    setPmNumber(method.accountNumber);
    setPmHolder(method.holderName);
    setPmInstructions(method.instructions || '');
    setShowPaymentModal(true);
  };

  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmName || !pmNumber) {
      toast.error('Por favor completa el nombre y número de cuenta/celular.');
      return;
    }

    if (editingMethod) {
      updatePaymentMethod(editingMethod.id, {
        name: pmName,
        bank: pmBank || pmName,
        accountType: pmType,
        accountNumber: pmNumber,
        holderName: pmHolder,
        instructions: pmInstructions
      });
      toast.success('¡Medio de pago actualizado correctamente!');
    } else {
      addPaymentMethod({
        name: pmName,
        bank: pmBank || pmName,
        accountType: pmType,
        accountNumber: pmNumber,
        holderName: pmHolder,
        instructions: pmInstructions,
        enabled: true
      });
      toast.success('¡Nuevo medio de pago añadido con éxito!');
    }

    setShowPaymentModal(false);
  };

  const handleQrUploadForMethod = (methodId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadQrImage(methodId, base64);
      toast.success('¡Código QR actualizado y visible para tus clientes!');
    };
    reader.readAsDataURL(file);
  };
  const [hasNotifPermission, setHasNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Escuchar pedidos entrantes en tiempo real (incluso desde otras pestañas)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sablee_orders_v1') {
        const saved = localStorage.getItem('sablee_orders_v1');
        if (saved) {
          useOrderStore.setState({ orders: JSON.parse(saved) });
          playOrderChime();
          toast.success('¡Nuevo pedido recibido en la tienda!');
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones de escritorio.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setHasNotifPermission(true);
        playOrderChime();
        toast.success('¡Alertas activadas! Te avisaremos con sonido y aviso en pantalla cada vez que entre un pedido.');
      } else {
        toast.error('Permiso denegado. Puedes activarlo en los ajustes de tu navegador.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Formulario manual
  const [manualClient, setManualClient] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualProduct, setManualProduct] = useState('');
  const [manualTotal, setManualTotal] = useState('');

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const formatPhoneDisplay = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('57') && clean.length === 12) {
      clean = clean.substring(2);
    }
    if (clean.length === 10) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    }
    return phone;
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneInput.trim()) {
      toast.error('Por favor escribe un número válido');
      return;
    }
    setBakeryPhone(newPhoneInput);
    toast.success('¡Número de WhatsApp de la dueña actualizado con éxito!');
    setShowPhoneModal(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) {
      toast.error(`Acceso restringido: Espera ${lockoutTimer}s para volver a intentar.`);
      return;
    }

    if (login(pinInput)) {
      toast.success('¡Bienvenida al Panel de Control de Sablée!');
      setPinInput('');
      setLoginAttempts(0);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LOCKOUT_KEY);
        sessionStorage.removeItem(ATTEMPTS_KEY);
        localStorage.removeItem(LOCKOUT_KEY);
      }
    } else {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ATTEMPTS_KEY, attempts.toString());
      }
      if (attempts >= 5) {
        const lockoutUntil = Date.now() + 60000;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
          localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
        }
        setLockoutTimer(60);
        toast.error('Demasiados intentos fallidos. Panel bloqueado por 60 segundos por seguridad.');
      } else {
        toast.error(`Clave incorrecta. Te quedan ${5 - attempts} intento(s) antes del bloqueo temporal.`);
      }
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    const openWeekdays = daysSchedule.filter(d => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(d.day) && d.isOpen);
    const sat = daysSchedule.find(d => d.day === 'Sábado');
    const sun = daysSchedule.find(d => d.day === 'Domingo');
    const fest = daysSchedule.find(d => d.day === 'Festivos');

    let weekdaysText = '';
    if (openWeekdays.length === 5) {
      weekdaysText = `Lunes a Viernes: ${openWeekdays[0].hours}`;
    } else if (openWeekdays.length === 0) {
      weekdaysText = 'Lunes a Viernes: Cerrado';
    } else {
      weekdaysText = `${openWeekdays.map(d => d.day).join(', ')}: ${openWeekdays[0].hours}`;
    }

    const saturdayText = sat?.isOpen ? `Sábados: ${sat.hours}` : 'Sábados: Cerrado';
    const sundayText = sun?.isOpen 
      ? `Domingos: ${sun.hours}${fest?.isOpen ? ` · Festivos: ${fest.hours}` : ''}`
      : (fest?.isOpen ? `Domingos: Cerrado · Festivos: ${fest.hours}` : 'Domingos y Festivos: Cerrado');

    const openDaysList = daysSchedule.filter(d => d.isOpen);
    let autoFooterText = footerTextInput.trim();
    if (!autoFooterText) {
      if (openDaysList.length === 8 || openDaysList.length === 7) {
        autoFooterText = 'Abierto todos los días';
      } else {
        autoFooterText = `Atendemos de ${openDaysList.map(d => d.day).join(', ')}`;
      }
    }

    setSchedule({
      days: daysSchedule,
      weekdays: weekdaysText,
      saturdays: saturdayText,
      sundays: sundayText,
      notice: noticeInput,
      footerText: autoFooterText
    });
    toast.success('¡Días y horarios de atención actualizados con éxito!');
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailConfig({
      enabled: emailEnabled,
      ownerEmail: emailOwner.trim(),
      scriptUrl: emailScriptUrl.trim()
    });
    toast.success('¡Configuración de Google Apps Script guardada con éxito!');
  };

  const handleTestEmail = async () => {
    // Rate limit para pruebas de correo (máximo 2 por minuto)
    const rateLimit = checkRateLimit('test_email', 2, 60000);
    if (!rateLimit.allowed) {
      toast.error(`Por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otra prueba de correo.`);
      return;
    }

    if (!emailScriptUrl.trim()) {
      toast.error('Por favor pega primero la URL de tu Google Apps Script antes de probar el envío.');
      return;
    }

    setIsSendingTestEmail(true);
    const toastId = toast.loading('Enviando comanda de prueba a tu Gmail...');
    try {
      const res = await sendTestEmailNotification({
        enabled: true,
        ownerEmail: emailOwner.trim(),
        scriptUrl: emailScriptUrl.trim()
      });
      if (res.success) {
        toast.success(`¡Comanda enviada con éxito! Revisa la bandeja de entrada de ${emailOwner}.`, { id: toastId });
      } else {
        toast.error(`${res.message}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Error al conectar con Google Apps Script. Verifica la URL.`, { id: toastId });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassInput.trim()) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      toast.error('La nueva contraseña y la confirmación no coinciden');
      return;
    }
    const result = changePassword(currentPassInput, newPassInput);
    if (result.success) {
      toast.success(result.message);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    } else {
      toast.error(result.message);
    }
  };

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    updateOrderStatus(id, newStatus);
    toast.success(`Orden ${id} actualizada a: ${newStatus}`);
  };

  const handleDelete = (id: string) => {
    setOrderToDelete(id);
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClient || !manualTotal) return;

    const totalNum = parseFloat(manualTotal.replace(/[^0-9]/g, '')) || 50000;
    createOrder({
      customer: {
        name: manualClient,
        phone: manualPhone || '3000000000',
        email: 'pedido.manual@sablee.com',
        address: manualAddress || 'Recoge en tienda',
        city: 'Bucaramanga'
      },
      items: [
        { id: 'manual-1', name: manualProduct || 'Pedido Especial en Tienda', price: totalNum, quantity: 1 }
      ],
      subtotal: totalNum,
      tax: 0,
      total: totalNum,
      status: 'Confirmado',
      channel: 'Web / QR'
    });

    toast.success('¡Pedido manual registrado con éxito!');
    setShowManualModal(false);
    setManualClient('');
    setManualPhone('');
    setManualAddress('');
    setManualProduct('');
    setManualTotal('');
  };

  // Si no está logueada, mostrar pantalla de inicio de sesión
  if (!isAuthenticated) {
    return (
      <div style={{ background: 'var(--blush)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: '120px' }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: '32px', 
            padding: '40px', 
            maxWidth: '420px', 
            width: '100%', 
            boxShadow: '0 20px 40px rgba(123, 26, 16, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '70px', 
              height: '70px', 
              borderRadius: '50%', 
              background: 'var(--petal)', 
              color: 'var(--wine)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Lock size={32} />
            </div>

            <h1 className="d" style={{ color: 'var(--wine)', fontSize: '2.2rem', marginBottom: '8px' }}>
              Portal Dueña
            </h1>
            <p style={{ color: '#666', fontSize: '1rem', marginBottom: '30px' }}>
              Ingresa tu clave de acceso para revisar y gestionar los pedidos de la pastelería.
            </p>

            {lockoutTimer > 0 && (
              <div style={{
                background: '#fff2f2',
                border: '1.5px solid #e05252',
                borderRadius: '16px',
                padding: '14px',
                color: '#b02a37',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '20px'
              }}>
                Acceso bloqueado temporalmente por seguridad.
                <div style={{ fontSize: '1.1rem', marginTop: '4px' }}>
                  Espera <strong>{lockoutTimer}s</strong> para reintentar.
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPass ? 'text' : 'password'}
                  placeholder="Ingresa tu clave de acceso"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  autoFocus
                  disabled={lockoutTimer > 0}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 45px 16px 20px',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(123, 26, 16, 0.2)',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: lockoutTimer > 0 ? '#f5f5f5' : '#fff'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showLoginPass ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showLoginPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={lockoutTimer > 0}
                style={{
                  background: lockoutTimer > 0 ? '#ccc' : 'var(--wine)',
                  color: 'var(--blush)',
                  padding: '16px',
                  borderRadius: '99px',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: lockoutTimer > 0 ? 'not-allowed' : 'pointer',
                  boxShadow: lockoutTimer > 0 ? 'none' : '0 6px 18px rgba(123, 26, 16, 0.25)',
                  transition: 'background 0.2s'
                }}
              >
                {lockoutTimer > 0 ? `Bloqueado (${lockoutTimer}s)` : 'Ingresar al Panel'}
              </button>
            </form>

            <div style={{ marginTop: '24px' }}>
              <Link to="/" style={{ color: 'var(--wine)', textDecoration: 'underline', fontSize: '0.95rem' }}>
                Volver a la tienda
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Métricas
  const totalOrdersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Pendiente por validación' || o.status === 'En preparación').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Entregado').length;

  // Filtrado
  const filteredOrders = orders.filter(o => {
    const matchesStatus = filterStatus === 'todos' || o.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const getOrderDateInfo = (dateStr: string) => {
    if (!dateStr) return { label: 'Sin Fecha', timestamp: 0 };
    
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (parts) {
        d = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
      }
    }

    if (isNaN(d.getTime())) return { label: 'Otros Pedidos', timestamp: 0 };

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return {
      label: `${month} ${year}`,
      timestamp: new Date(year, d.getMonth(), 1).getTime()
    };
  };

  const groupedOrdersByMonth = useMemo(() => {
    const groups: Record<string, { label: string; timestamp: number; orders: typeof orders; totalRevenue: number }> = {};

    filteredOrders.forEach(order => {
      const { label, timestamp } = getOrderDateInfo(order.date);
      if (!groups[label]) {
        groups[label] = {
          label,
          timestamp,
          orders: [],
          totalRevenue: 0
        };
      }
      groups[label].orders.push(order);
      groups[label].totalRevenue += order.total;
    });

    // Ordenar los meses del más reciente al más antiguo
    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredOrders]);

  const filteredMenuItems = menuItems.filter(item => {
    if (menuFilterCategory === 'todas') return true;
    return item.category === menuFilterCategory;
  });

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine2)', paddingBottom: '80px' }}>
      <Header />
      
      <div style={{ paddingTop: '140px', maxWidth: '1200px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* Barra superior con acciones unificadas y limpias */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px', 
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(123, 26, 16, 0.1)'
        }}>
          <div>
            <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.82rem', letterSpacing: '0.08em' }}>
              Panel de Administración
            </span>
            <h1 className="d" style={{ color: 'var(--wine)', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', margin: '2px 0 0', lineHeight: 1.1 }}>
              {activeTab === 'pedidos' ? 'Gestión de Pedidos' : 
               activeTab === 'carta' ? 'Catálogo & Menú' : 
               activeTab === 'pagos' ? 'Medios de Pago & QR' : 
               'Configuración & Horarios'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Teléfono de WhatsApp (Compacto y elegante) */}
            <button 
              type="button"
              onClick={() => {
                setNewPhoneInput(formatPhoneDisplay(bakeryPhone));
                setShowPhoneModal(true);
              }}
              title="Clic para cambiar el número de WhatsApp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                color: 'var(--wine)',
                border: '1px solid rgba(123, 26, 16, 0.2)',
                padding: '9px 16px',
                borderRadius: '99px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(123, 26, 16, 0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366' }} />
              <MessageCircle size={15} color="var(--wine)" />
              <span>{formatPhoneDisplay(bakeryPhone)}</span>
            </button>

            {/* Registrar Pedido Manual (Botón de acción principal) */}
            <button 
              onClick={() => setShowManualModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--wine)',
                color: 'var(--blush)',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '99px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(123, 26, 16, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Plus size={16} />
              <span>Nuevo Pedido</span>
            </button>

            {/* Cerrar Sesión (Discreto y sobrio) */}
            <button 
              onClick={logout}
              title="Cerrar sesión de administrador"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                color: '#666',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                padding: '9px 14px',
                borderRadius: '99px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={15} />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Barra de Pestañas Segmentada (Limpia, moderna y unificada) */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: '#ffffff', 
            padding: '5px', 
            borderRadius: '99px', 
            border: '1px solid rgba(123, 26, 16, 0.15)',
            boxShadow: '0 4px 16px rgba(123, 26, 16, 0.05)',
            gap: '4px',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              style={{
                padding: '10px 20px',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === 'pedidos' ? 'var(--wine)' : 'transparent',
                color: activeTab === 'pedidos' ? 'var(--blush)' : 'var(--wine2)',
                fontWeight: activeTab === 'pedidos' ? 700 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'pedidos' ? '0 3px 10px rgba(123, 26, 16, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Package size={16} />
              <span>Pedidos</span>
              <span style={{
                background: activeTab === 'pedidos' ? 'rgba(255,255,255,0.25)' : 'rgba(123, 26, 16, 0.08)',
                color: activeTab === 'pedidos' ? '#fff' : 'var(--wine)',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('carta')}
              style={{
                padding: '10px 20px',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === 'carta' ? 'var(--wine)' : 'transparent',
                color: activeTab === 'carta' ? 'var(--blush)' : 'var(--wine2)',
                fontWeight: activeTab === 'carta' ? 700 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'carta' ? '0 3px 10px rgba(123, 26, 16, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <BookOpen size={16} />
              <span>Menú & Carta</span>
              <span style={{
                background: activeTab === 'carta' ? 'rgba(255,255,255,0.25)' : 'rgba(123, 26, 16, 0.08)',
                color: activeTab === 'carta' ? '#fff' : 'var(--wine)',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {menuItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pagos')}
              style={{
                padding: '10px 20px',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === 'pagos' ? 'var(--wine)' : 'transparent',
                color: activeTab === 'pagos' ? 'var(--blush)' : 'var(--wine2)',
                fontWeight: activeTab === 'pagos' ? 700 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'pagos' ? '0 3px 10px rgba(123, 26, 16, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <QrCode size={16} />
              <span>Medios de Pago</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ajustes')}
              style={{
                padding: '10px 20px',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === 'ajustes' ? 'var(--wine)' : 'transparent',
                color: activeTab === 'ajustes' ? 'var(--blush)' : 'var(--wine2)',
                fontWeight: activeTab === 'ajustes' ? 700 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'ajustes' ? '0 3px 10px rgba(123, 26, 16, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <ShieldCheck size={16} />
              <span>Configuración</span>
            </button>
          </div>
        </div>

        {activeTab === 'pedidos' ? (
          <>
            {/* Tarjetas de Métricas (KPIs) con Estilo Sablée */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              {/* Total Pedidos */}
              <div style={{ 
                background: '#fff', 
                borderRadius: '24px', 
                padding: '22px 24px', 
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)', 
                border: '1px solid rgba(123, 26, 16, 0.08)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px' 
              }}>
                <div style={{ 
                  background: 'var(--petal)', 
                  color: 'var(--wine)', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Package size={26} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="lbl" style={{ margin: 0, fontSize: '0.78rem', color: '#888', fontWeight: 600, letterSpacing: '0.06em', display: 'block' }}>
                    Total Pedidos
                  </span>
                  <h3 className="d" style={{ margin: '4px 0 0', fontSize: '2.2rem', color: 'var(--wine)' }}>
                    {totalOrdersCount}
                  </h3>
                </div>
              </div>

              {/* Ventas Totales */}
              <div style={{ 
                background: '#fff', 
                borderRadius: '24px', 
                padding: '22px 24px', 
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)', 
                border: '1px solid rgba(123, 26, 16, 0.08)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px' 
              }}>
                <div style={{ 
                  background: 'var(--blush)', 
                  color: 'var(--wine)', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <DollarSign size={26} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="lbl" style={{ margin: 0, fontSize: '0.78rem', color: '#888', fontWeight: 600, letterSpacing: '0.06em', display: 'block' }}>
                    Ventas Totales
                  </span>
                  <h3 className="d" style={{ margin: '4px 0 0', fontSize: '1.9rem', color: 'var(--wine)' }}>
                    {formatCOP(totalRevenue)}
                  </h3>
                </div>
              </div>

              {/* Por Atender (En Horno) */}
              <div style={{ 
                background: '#fff', 
                borderRadius: '24px', 
                padding: '22px 24px', 
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)', 
                border: '1px solid rgba(123, 26, 16, 0.08)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px' 
              }}>
                <div style={{ 
                  background: '#FFF5EB', 
                  color: '#C05621', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={26} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="lbl" style={{ margin: 0, fontSize: '0.78rem', color: '#888', fontWeight: 600, letterSpacing: '0.06em', display: 'block' }}>
                    Por Atender
                  </span>
                  <h3 className="d" style={{ margin: '4px 0 0', fontSize: '2.2rem', color: '#C05621' }}>
                    {pendingOrdersCount}
                  </h3>
                </div>
              </div>

              {/* Entregados */}
              <div style={{ 
                background: '#fff', 
                borderRadius: '24px', 
                padding: '22px 24px', 
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)', 
                border: '1px solid rgba(123, 26, 16, 0.08)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px' 
              }}>
                <div style={{ 
                  background: '#F0F9F5', 
                  color: '#15803D', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle size={26} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="lbl" style={{ margin: 0, fontSize: '0.78rem', color: '#888', fontWeight: 600, letterSpacing: '0.06em', display: 'block' }}>
                    Entregados
                  </span>
                  <h3 className="d" style={{ margin: '4px 0 0', fontSize: '2.2rem', color: '#15803D' }}>
                    {completedOrdersCount}
                  </h3>
                </div>
              </div>
            </div>

        {/* Buscador y Filtros */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '24px', 
          padding: '20px 24px', 
          marginBottom: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
        }}>
          {/* Búsqueda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '260px', background: '#faf7f8', padding: '10px 18px', borderRadius: '99px', border: '1px solid rgba(123, 26, 16, 0.1)' }}>
            <Search size={18} color="#888" />
            <input 
              type="text" 
              placeholder="Buscar por ID, nombre o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
            />
          </div>

          {/* Filtros por pestaña */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['todos', 'Pendiente por validación', 'Confirmado', 'En preparación', 'En camino', 'Entregado', 'Pago no validado'].map(st => {
              const isSelected = filterStatus.toLowerCase() === st.toLowerCase();
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    border: isSelected ? 'none' : '1px solid #eee',
                    background: isSelected ? 'var(--wine)' : '#fdfdfd',
                    color: isSelected ? 'var(--blush)' : '#555',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {st === 'todos' ? 'Todos los pedidos' : st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listado de Pedidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '24px', padding: '60px 20px', textAlign: 'center', color: '#888' }}>
              <Package size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
              <h3 style={{ fontSize: '1.4rem', color: '#555' }}>No se encontraron órdenes</h3>
              <p>No hay pedidos con el filtro seleccionado.</p>
            </div>
          ) : (
            groupedOrdersByMonth.map(group => (
              <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {/* Cabecera del Mes */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: '#ffffff',
                  padding: '14px 22px',
                  borderRadius: '20px',
                  border: '1px solid rgba(123, 26, 16, 0.1)',
                  boxShadow: '0 4px 14px rgba(123, 26, 16, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      background: 'rgba(123, 26, 16, 0.08)',
                      color: 'var(--wine)',
                      padding: '8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--wine)', fontSize: '1.25rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                        {group.label}
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#777' }}>
                        {group.orders.length} {group.orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(123, 26, 16, 0.05)',
                    padding: '6px 14px',
                    borderRadius: '99px',
                    fontSize: '0.9rem',
                    color: 'var(--wine2)'
                  }}>
                    <span>Ventas del mes: </span>
                    <strong style={{ color: 'var(--wine)', fontFamily: 'Jost, sans-serif', fontSize: '1.05rem' }}>
                      {formatCOP(group.totalRevenue)}
                    </strong>
                  </div>
                </div>

                {/* Pedidos de este mes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {group.orders.map(order => {
                    const statusStyle = STATUS_COLORS[order.status] || { bg: '#eee', text: '#333' };
                    const cleanPhone = order.customer.phone.replace(/[^0-9]/g, '');
                    const waLink = `https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(order.customer.name)},%20te%20escribimos%20de%20Sabl%C3%A9e%20Pasteler%C3%ADa%20sobre%20tu%20pedido%20%23${order.id}`;

                    return (
                <div 
                  key={order.id} 
                  style={{ 
                    background: '#fff', 
                    borderRadius: '24px', 
                    padding: '24px 28px', 
                    boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)',
                    border: '1px solid rgba(123, 26, 16, 0.06)'
                  }}
                >
                  {/* Fila Cabecera de Orden */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 700, fontSize: '1.35rem', color: 'var(--wine)' }}>
                          #{order.id}
                        </span>
                        <span style={{ 
                          background: order.channel === 'WhatsApp' ? '#d4edda' : 'var(--petal)', 
                          color: order.channel === 'WhatsApp' ? '#155724' : 'var(--wine)', 
                          padding: '3px 10px', 
                          borderRadius: '99px', 
                          fontSize: '0.8rem', 
                          fontWeight: 600 
                        }}>
                          {order.channel}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', display: 'block' }}>
                        Fecha: {order.date}
                      </span>
                    </div>

                    {/* Selector de Estado y Acciones de Lujo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Estado:</span>
                      
                      <div className="status-dropdown-container" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusDropdownId(prev => prev === order.id ? null : order.id);
                          }}
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1.5px solid ${statusStyle.text}50`,
                            padding: '8px 16px',
                            borderRadius: '99px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusStyle.text, display: 'inline-block' }}></span>
                          <span>{order.status}</span>
                          <ChevronDown 
                            size={14} 
                            style={{ 
                              transform: openStatusDropdownId === order.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease'
                            }} 
                          />
                        </button>

                        {openStatusDropdownId === order.id && (
                          <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            background: '#ffffff',
                            borderRadius: '20px',
                            padding: '8px',
                            boxShadow: '0 14px 40px rgba(123, 26, 16, 0.16)',
                            border: '1.5px solid #eed6db',
                            zIndex: 100,
                            width: '270px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ padding: '8px 12px 6px', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: '#999' }}>
                              Cambiar estado de orden
                            </div>
                            {ALL_STATUS_OPTIONS.map(opt => {
                              const isCurrent = order.status === opt.status;
                              const IconComponent = opt.icon;
                              return (
                                <button
                                  key={opt.status}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(order.id, opt.status);
                                    setOpenStatusDropdownId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    borderRadius: '14px',
                                    border: isCurrent ? `1.5px solid ${opt.text}` : '1px solid transparent',
                                    background: isCurrent ? opt.bg : 'transparent',
                                    color: opt.text,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isCurrent) e.currentTarget.style.background = opt.bg;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isCurrent) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: opt.bg,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: opt.text,
                                      flexShrink: 0
                                    }}>
                                      <IconComponent size={14} />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.86rem', fontWeight: 700, lineHeight: 1.2 }}>
                                        {opt.label}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', opacity: 0.8, marginTop: '2px' }}>
                                        {opt.badgeDesc}
                                      </div>
                                    </div>
                                  </div>
                                  {isCurrent && <Check size={16} color={opt.text} style={{ flexShrink: 0, marginLeft: '6px' }} />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleDelete(order.id)}
                        title="Eliminar pedido"
                        style={{ background: 'var(--petal)', border: 'none', color: 'var(--wine)', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo: Datos del Cliente + Productos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    
                    {/* Datos del Cliente */}
                    <div style={{ background: '#faf7f8', padding: '16px 20px', borderRadius: '16px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--wine)', fontSize: '1.1rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>
                        {order.customer.name}
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#555' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={15} color="var(--wine)" />
                          <span>{order.customer.phone}</span>
                          <a 
                            href={waLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              background: 'var(--wine)', 
                              color: 'var(--blush)', 
                              padding: '2px 10px', 
                              borderRadius: '99px', 
                              fontSize: '0.78rem', 
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <MapPin size={15} color="var(--wine)" style={{ marginTop: '2px' }} />
                          <span>{order.customer.address} {order.customer.details ? `(${order.customer.details})` : ''} · {order.customer.city}</span>
                        </div>

                        {order.customer.notes && (
                          <div style={{ marginTop: '6px', padding: '8px', background: '#fff', borderRadius: '8px', borderLeft: '3px solid var(--wine)' }}>
                            <strong>Nota:</strong> {order.customer.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desglose de Productos */}
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--wine)', fontSize: '1.1rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>
                        Productos en la orden
                      </h4>

                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {order.items.map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                            <span><strong>{item.quantity}x</strong> {item.name}</span>
                            <span style={{ fontWeight: 600 }}>{formatCOP(item.price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '2px solid #eee' }}>
                        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--wine2)' }}>Total a cobrar:</span>
                        <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: 'var(--wine)' }}>
                          {formatCOP(order.total)}
                        </span>
                      </div>

                      {order.receiptUrl && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            onClick={() => setSelectedReceipt(order.receiptUrl || null)}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              background: '#e2e3e5', 
                              border: 'none', 
                              padding: '6px 14px', 
                              borderRadius: '99px', 
                              fontSize: '0.85rem', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Eye size={14} /> Ver comprobante de pago
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))
    )}
        </div>
      </>
    ) : activeTab === 'carta' ? (
      /* VISTA DE ACTUALIZAR LA CARTA */
      <div>
        {/* Cabecera de la Sección Carta */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)'
        }}>
          <div>
            <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.85rem' }}>Catálogo Oficial de Sablée</span>
            <h2 style={{ margin: '4px 0 8px', color: 'var(--wine)', fontSize: '1.8rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
              Actualizar Carta & Menú
            </h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.98rem', maxWidth: '640px' }}>
              Edita precios, porciones, descripciones o sube fotos para cada producto. Los cambios se sincronizan en vivo en las secciones de la tienda.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas restaurar la carta original de Sablée? Se restablecerán todos los productos y precios por defecto.')) {
                  resetMenuToDefault();
                  toast.success('¡Carta original de Sablée restaurada con éxito!');
                }
              }}
              style={{
                background: '#ffffff',
                color: 'var(--wine2)',
                border: '1.5px solid rgba(123, 26, 16, 0.2)',
                padding: '12px 20px',
                borderRadius: '99px',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={16} />
              <span>Restablecer Carta Original</span>
            </button>

            <button
              type="button"
              onClick={openCreateItemModal}
              style={{
                background: 'var(--wine)',
                color: 'var(--blush)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '99px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(123, 26, 16, 0.25)'
              }}
            >
              <Plus size={18} />
              <span>Añadir Producto a la Carta</span>
            </button>
          </div>
        </div>

        {/* Filtros por Categoría */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'todas', label: 'Todas las secciones', count: menuItems.length },
            { id: 'tortas', label: 'Tortas', count: menuItems.filter(i => i.category === 'tortas').length },
            { id: 'galletas', label: 'Galletas', count: menuItems.filter(i => i.category === 'galletas').length },
            { id: 'postres', label: 'Postres', count: menuItems.filter(i => i.category === 'postres').length }
          ].map(tab => {
            const isSelected = menuFilterCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMenuFilterCategory(tab.id as any)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '99px',
                  border: isSelected ? '1.5px solid var(--wine)' : '1px solid #ddd',
                  background: isSelected ? 'var(--wine)' : '#ffffff',
                  color: isSelected ? 'var(--blush)' : 'var(--wine2)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Grilla de Productos de la Carta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredMenuItems.map(item => (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)',
                border: item.available !== false ? '1.5px solid rgba(123, 26, 16, 0.12)' : '1.5px dashed #ccc',
                opacity: item.available !== false ? 1 : 0.68,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      background: 'var(--petal)', 
                      color: 'var(--wine)', 
                      padding: '3px 10px', 
                      borderRadius: '99px', 
                      fontSize: '0.78rem', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {item.category}
                    </span>
                    {item.badge && (
                      <span style={{ 
                        background: '#fff3cd', 
                        color: '#856404', 
                        padding: '3px 10px', 
                        borderRadius: '99px', 
                        fontSize: '0.78rem', 
                        fontWeight: 600 
                      }}>
                        ★ {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Toggle Disponibilidad */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleAvailability(item.id);
                      toast.success(item.available !== false ? `"${item.name}" marcado como agotado` : `"${item.name}" disponible en la carta`);
                    }}
                    style={{
                      background: item.available !== false ? '#d4edda' : '#fff3cd',
                      color: item.available !== false ? '#155724' : '#856404',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '99px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {item.available !== false ? '✓ Disponible' : 'Agotado hoy'}
                  </button>
                </div>

                {/* Título y Descripción */}
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--wine)', fontSize: '1.45rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                  {item.name}
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', color: '#665', lineHeight: 1.45 }}>
                  {item.desc}
                </p>

                {/* Sección de Foto del Producto */}
                <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--wine2)', display: 'block', marginBottom: '8px' }}>
                    Foto en la Tienda:
                  </span>

                  {item.image ? (
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '180px', 
                        height: '140px', 
                        borderRadius: '16px', 
                        overflow: 'hidden', 
                        border: '1.5px solid rgba(123, 26, 16, 0.15)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        background: 'var(--petal)'
                      }}>
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          color: 'var(--wine)',
                          border: '1px solid rgba(123, 26, 16, 0.25)',
                          padding: '5px 12px',
                          borderRadius: '99px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          <Upload size={13} />
                          <span>Cambiar foto</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleItemPhotoUpload(item.id, e.target.files[0]);
                            }} 
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            updateMenuItem(item.id, { image: undefined });
                            toast.success(`Foto de "${item.name}" eliminada`);
                          }}
                          style={{
                            background: 'transparent',
                            color: '#b02a37',
                            border: '1px solid rgba(176, 42, 55, 0.25)',
                            padding: '5px 10px',
                            borderRadius: '99px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '2px dashed rgba(123, 26, 16, 0.25)',
                      background: '#fafafa',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}>
                      <Upload size={26} color="var(--wine)" style={{ opacity: 0.6, marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)' }}>
                        Subir foto de este producto
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>
                        PNG o JPG desde tu dispositivo
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleItemPhotoUpload(item.id, e.target.files[0]);
                        }} 
                      />
                    </label>
                  )}
                </div>

                {/* Presentaciones y Precios */}
                <div style={{ background: '#faf7f8', padding: '14px 16px', borderRadius: '16px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--wine2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    Presentaciones y Precios:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {item.presentations.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem' }}>
                        <span>
                          <strong>{p.label}</strong> {p.portions && <small style={{ color: '#777' }}>({p.portions})</small>}
                        </span>
                        <strong style={{ color: 'var(--wine)', fontSize: '0.98rem' }}>
                          ${p.price.toLocaleString('es-CO')}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Acciones de la Tarjeta */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => openEditItemModal(item)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#faf7f8',
                    color: 'var(--wine2)',
                    border: '1px solid rgba(123, 26, 16, 0.15)',
                    padding: '9px 14px',
                    borderRadius: '99px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={15} />
                  <span>Editar Precios & Datos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Seguro que deseas eliminar "${item.name}" de la carta?`)) {
                      deleteMenuItem(item.id);
                      toast.success(`"${item.name}" eliminado de la carta`);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--petal)',
                    color: 'var(--wine)',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '99px',
                    cursor: 'pointer'
                  }}
                  title="Eliminar producto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : activeTab === 'pagos' ? (
      /* VISTA DE MEDIOS DE PAGO & CÓDIGOS QR */
      <div>
        {/* Cabecera de la Sección */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)'
        }}>
          <div>
            <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.85rem' }}>Configuración de Cobro</span>
            <h2 style={{ margin: '4px 0 8px', color: 'var(--wine)', fontSize: '1.8rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
              Medios de Pago & Códigos QR
            </h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.98rem', maxWidth: '600px' }}>
              Aquí puedes añadir tus cuentas bancarias, billeteras (Nequi, Bancolombia, Daviplata, etc.) y subir las fotos de tus códigos QR para que tus clientes puedan escanearlos directamente al pagar.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreatePaymentModal}
            style={{
              background: 'var(--wine)',
              color: 'var(--blush)',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '99px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(123, 26, 16, 0.25)'
            }}
          >
            <Plus size={18} />
            <span>Añadir Medio de Pago</span>
          </button>
        </div>

        {/* Grilla de Medios de Pago */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {paymentMethods.map(method => (
            <div 
              key={method.id}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)',
                border: method.enabled ? '1.5px solid rgba(123, 26, 16, 0.15)' : '1.5px dashed #ccc',
                opacity: method.enabled ? 1 : 0.65,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Encabezado de la tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{ 
                      background: 'var(--petal)', 
                      color: 'var(--wine)', 
                      padding: '3px 10px', 
                      borderRadius: '99px', 
                      fontSize: '0.78rem', 
                      fontWeight: 700 
                    }}>
                      {method.bank}
                    </span>
                    <h3 style={{ margin: '8px 0 2px', color: 'var(--wine)', fontSize: '1.4rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                      {method.name}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#777' }}>{method.accountType}</span>
                  </div>

                  {/* Botón Activar / Desactivar */}
                  <button
                    type="button"
                    onClick={() => togglePaymentMethod(method.id)}
                    style={{
                      background: method.enabled ? '#d4edda' : '#f0f0f0',
                      color: method.enabled ? '#155724' : '#666',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '99px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {method.enabled ? '✓ Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Datos de la cuenta */}
                <div style={{ background: '#faf7f8', padding: '14px 18px', borderRadius: '16px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Número de Cuenta / Celular:</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--wine)', letterSpacing: '0.02em', display: 'block', margin: '3px 0' }}>
                    {method.accountNumber}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: '#555', display: 'block' }}>
                    Titular: <strong>{method.holderName}</strong>
                  </span>
                </div>

                {/* Contenedor del Código QR */}
                <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine2)', display: 'block', marginBottom: '8px' }}>
                    Código QR de Pago:
                  </span>

                  {method.qrImage ? (
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '180px', 
                        height: '180px', 
                        borderRadius: '16px', 
                        overflow: 'hidden', 
                        border: '1.5px solid rgba(123, 26, 16, 0.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        background: '#fff'
                      }}>
                        <img src={method.qrImage} alt={`QR ${method.name}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          color: 'var(--wine)',
                          border: '1px solid rgba(123, 26, 16, 0.25)',
                          padding: '6px 14px',
                          borderRadius: '99px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          <Upload size={14} />
                          <span>Cambiar QR</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleQrUploadForMethod(method.id, e.target.files[0]);
                            }} 
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            updatePaymentMethod(method.id, { qrImage: undefined });
                            toast.success('Imagen QR eliminada');
                          }}
                          style={{
                            background: 'transparent',
                            color: '#b02a37',
                            border: '1px solid rgba(176, 42, 55, 0.25)',
                            padding: '6px 12px',
                            borderRadius: '99px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                      borderRadius: '16px',
                      border: '2px dashed rgba(123, 26, 16, 0.25)',
                      background: '#fafafa',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}>
                      <Upload size={30} color="var(--wine)" style={{ opacity: 0.6, marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--wine)' }}>
                        Subir imagen de tu código QR
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>
                        Captura o foto de tu QR Nequi, Bancolombia, etc.
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleQrUploadForMethod(method.id, e.target.files[0]);
                        }} 
                      />
                    </label>
                  )}
                </div>

                {method.instructions && (
                  <p style={{ fontSize: '0.85rem', color: '#666', background: '#fafafa', padding: '8px 12px', borderRadius: '10px', margin: '0 0 16px 0' }}>
                    ℹ️ {method.instructions}
                  </p>
                )}
              </div>

              {/* Acciones del pie de la tarjeta */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => openEditPaymentModal(method)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#faf7f8',
                    color: 'var(--wine2)',
                    border: '1px solid rgba(123, 26, 16, 0.15)',
                    padding: '8px 14px',
                    borderRadius: '99px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={15} />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deletePaymentMethod(method.id);
                    toast.success('Medio de pago eliminado');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--petal)',
                    color: 'var(--wine)',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '99px',
                    cursor: 'pointer'
                  }}
                  title="Eliminar medio de pago"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      /* VISTA DE HORARIO & SEGURIDAD */
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Cabecera de la Sección */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(123, 26, 16, 0.05)'
        }}>
          <div>
            <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.85rem' }}>Configuración del Negocio</span>
            <h2 style={{ margin: '4px 0 8px', color: 'var(--wine)', fontSize: '1.8rem', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
              Horario, Alertas & Seguridad
            </h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.98rem', maxWidth: '780px' }}>
              Personaliza tus horarios de atención, configura alertas directas a tu Gmail y define tu contraseña segura.
            </p>
          </div>
        </div>

        {/* Selector de Sección (Pestañas limpias y relajadas) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '28px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setSettingsSubTab('horario')}
            style={{
              padding: '12px 24px',
              borderRadius: '99px',
              border: 'none',
              background: settingsSubTab === 'horario' ? 'var(--wine)' : '#ffffff',
              color: settingsSubTab === 'horario' ? 'var(--blush)' : 'var(--wine)',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: settingsSubTab === 'horario' ? '0 4px 14px rgba(123, 26, 16, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={18} />
            <span>Horario de Atención</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsSubTab('correo')}
            style={{
              padding: '12px 24px',
              borderRadius: '99px',
              border: 'none',
              background: settingsSubTab === 'correo' ? 'var(--wine)' : '#ffffff',
              color: settingsSubTab === 'correo' ? 'var(--blush)' : 'var(--wine)',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: settingsSubTab === 'correo' ? '0 4px 14px rgba(123, 26, 16, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <Mail size={18} />
            <span>Alertas por Correo</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsSubTab('seguridad')}
            style={{
              padding: '12px 24px',
              borderRadius: '99px',
              border: 'none',
              background: settingsSubTab === 'seguridad' ? 'var(--wine)' : '#ffffff',
              color: settingsSubTab === 'seguridad' ? 'var(--blush)' : 'var(--wine)',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: settingsSubTab === 'seguridad' ? '0 4px 14px rgba(123, 26, 16, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={18} />
            <span>Seguridad & Contraseña</span>
          </button>
        </div>

        {/* Contenedor Centrado y Espacioso de una sola tarjeta a la vez */}
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          
          {/* SECCIÓN 1: HORARIO DE ATENCIÓN */}
          {settingsSubTab === 'horario' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(123, 26, 16, 0.06)',
              border: '1px solid rgba(123, 26, 16, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--petal)',
                  color: 'var(--wine)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--wine)', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                    Horario de Atención
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Visible en toda la tienda y en la pantalla de pago
                  </span>
                </div>
              </div>

              {/* Interruptor Estado de Tienda */}
              <div style={{
                background: schedule.isOpen ? '#f0fdf4' : '#fff5f5',
                border: schedule.isOpen ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: schedule.isOpen ? '#166534' : '#991b1b' }}>
                    {schedule.isOpen ? 'Tienda Abierta (Recibiendo pedidos)' : 'Tienda Cerrada / Pausada'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '2px' }}>
                    {schedule.isOpen 
                      ? 'Los clientes pueden pedir normalmente para despacho.' 
                      : 'Avisa a los clientes que los pedidos se hornearán al reabrir.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleStoreOpen();
                    toast.success(schedule.isOpen ? 'Pastelería puesta en modo descanso.' : '¡Pastelería abierta para recibir pedidos!');
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '99px',
                    border: 'none',
                    background: schedule.isOpen ? '#dc3545' : '#28a745',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {schedule.isOpen ? 'Pausar por Hoy' : 'Abrir Tienda Ahora'}
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Días y Horarios de Atención Personalizables */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--wine)' }}>
                        Días y Horarios de Atención
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#666' }}>
                        Haz clic en cada día para activar si atiendes o marcarlo como cerrado / día de descanso.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDaysSchedule(prev => prev.map(d => ({ ...d, isOpen: true })));
                          toast.success('Todos los días activados.');
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid rgba(123, 26, 16, 0.2)',
                          padding: '5px 12px',
                          borderRadius: '99px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--wine)',
                          cursor: 'pointer'
                        }}
                      >
                        Abrir todos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDaysSchedule(prev => prev.map(d => ({ ...d, isOpen: d.day !== 'Domingo' && d.day !== 'Festivos' })));
                          toast.success('Configurado: Lunes a Sábado abiertos, Domingos y Festivos cerrados.');
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid rgba(123, 26, 16, 0.2)',
                          padding: '5px 12px',
                          borderRadius: '99px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--wine)',
                          cursor: 'pointer'
                        }}
                      >
                        Lun a Sáb
                      </button>
                    </div>
                  </div>

                  {/* Lista de Días */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {daysSchedule.map((d) => (
                      <div 
                        key={d.day}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          background: d.isOpen ? '#ffffff' : '#fafafa',
                          border: d.isOpen ? '1.5px solid rgba(123, 26, 16, 0.18)' : '1px solid #e5e5e5',
                          boxShadow: d.isOpen ? '0 2px 8px rgba(123, 26, 16, 0.04)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Nombre del día e interruptor */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleDay(d.day)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '99px',
                              border: d.isOpen ? '1.5px solid #16a34a' : '1.5px solid #dc2626',
                              background: d.isOpen ? '#f0fdf4' : '#fef2f2',
                              color: d.isOpen ? '#15803d' : '#b91c1c',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: d.isOpen ? '#16a34a' : '#dc2626' 
                            }} />
                            <span>{d.isOpen ? 'Atiende' : 'Cerrado'}</span>
                          </button>

                          <strong style={{ fontSize: '1rem', color: d.isOpen ? 'var(--wine)' : '#888' }}>
                            {d.day}
                          </strong>
                        </div>

                        {/* Campo de horario o aviso de cerrado */}
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {d.isOpen ? (
                            <>
                              <input
                                type="text"
                                value={d.hours}
                                onChange={(e) => handleDayHoursChange(d.day, e.target.value)}
                                placeholder="Ej: 8:00 AM - 7:00 PM"
                                style={{
                                  width: '100%',
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  border: '1px solid #ccc',
                                  fontSize: '0.88rem',
                                  color: '#333'
                                }}
                              />
                              <button
                                type="button"
                                title="Copiar este horario a los demás días que atiendes"
                                onClick={() => handleCopyHoursToAll(d.hours)}
                                style={{
                                  background: 'rgba(123, 26, 16, 0.06)',
                                  border: 'none',
                                  color: 'var(--wine)',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Copiar a todos
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
                              Día de descanso (No se toman pedidos este día)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Aviso o Política de Entregas (Bucaramanga)
                  </label>
                  <textarea
                    rows={2}
                    value={noticeInput}
                    onChange={(e) => setNoticeInput(e.target.value)}
                    placeholder="Información sobre pedidos o domicilios..."
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'Jost, sans-serif' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Texto del Horario en el Pie de Página (Inicio)
                  </label>
                  <input
                    type="text"
                    value={footerTextInput}
                    onChange={(e) => setFooterTextInput(e.target.value)}
                    placeholder="Ej. Abierto todos los días desde las 7 am / Lunes a Sábado desde las 8 am"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                    Este texto se muestra automáticamente al final de la página principal (debajo del botón "¿Hambre? Pedir").
                  </span>
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    borderRadius: '99px',
                    border: 'none',
                    background: 'var(--wine)',
                    color: 'var(--blush)',
                    fontWeight: 600,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
                  }}
                >
                  Guardar Horario de Atención
                </button>
              </form>
            </div>
          )}

          {/* SECCIÓN 2: SEGURIDAD & CONTRASEÑA */}
          {settingsSubTab === 'seguridad' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(123, 26, 16, 0.06)',
              border: '1px solid rgba(123, 26, 16, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--petal)',
                  color: 'var(--wine)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--wine)', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                    Seguridad & Contraseña
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Crea tu propia clave para proteger las ventas de tu pastelería
                  </span>
                </div>
              </div>

              {/* Insignia de Protección */}
              <div style={{
                background: '#fdf7f8',
                border: '1px solid #eed6db',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '0.85rem',
                color: '#555',
                lineHeight: 1.45
              }}>
                <strong>Seguridad activa:</strong> Tu panel cuenta con bloqueo automático contra intentos repetidos de fuerza bruta. Solo tú podrás administrar los pedidos con tu contraseña.
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Contraseña Actual *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Ingresa tu clave actual"
                      required
                      style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Nueva Contraseña Personal *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: newPassInput.length >= 6 ? '#28a745' : '#888', marginTop: '4px' }}>
                    {newPassInput.length >= 6 ? '✓ Cumple con el mínimo de 6 caracteres' : '• Debe tener al menos 6 caracteres'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                  {confirmPassInput && (
                    <div style={{ fontSize: '0.78rem', color: newPassInput === confirmPassInput ? '#28a745' : '#dc3545', marginTop: '4px' }}>
                      {newPassInput === confirmPassInput ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    borderRadius: '99px',
                    border: 'none',
                    background: 'var(--wine)',
                    color: 'var(--blush)',
                    fontWeight: 600,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
                  }}
                >
                  Actualizar mi Contraseña
                </button>
              </form>

              <div style={{ marginTop: '24px', padding: '14px', background: '#fafafa', borderRadius: '14px', fontSize: '0.8rem', color: '#776' }}>
                <strong>Seguridad de Acceso:</strong> Conserva tu clave en un lugar seguro. Solo tú y el personal autorizado deben tener acceso a este panel.
              </div>
            </div>
          )}

          {/* SECCIÓN 3: ALERTAS POR CORREO */}
          {settingsSubTab === 'correo' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(123, 26, 16, 0.06)',
              border: '1px solid rgba(123, 26, 16, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--petal)',
                  color: 'var(--wine)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--wine)', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
                    Alertas a tu Gmail (Google Apps Script)
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Recibe la comanda de cada pedido directamente en tu cuenta de Gmail (safabu12@gmail.com) sin costo ni intermediarios.
                  </span>
                </div>
              </div>

              {/* Interruptor de Alertas de Correo */}
              <div style={{
                background: emailEnabled ? '#f0fdf4' : '#fafafa',
                border: emailEnabled ? '1.5px solid #86efac' : '1.5px solid #e0e0e0',
                borderRadius: '16px',
                padding: '16px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: emailEnabled ? '#166534' : '#666' }}>
                    {emailEnabled ? 'Notificaciones por Gmail Activas' : 'Notificaciones por Gmail Pausadas'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '2px' }}>
                    {emailEnabled 
                      ? 'Cada nuevo pedido enviará una comanda detallada directamente a tu bandeja de Gmail.' 
                      : 'Actívalo para recibir los pedidos directamente en tu Gmail.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !emailEnabled;
                    setEmailEnabled(next);
                    updateEmailConfig({ enabled: next });
                    toast.success(next ? 'Alertas por correo activadas.' : 'Alertas por correo pausadas.');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '99px',
                    border: 'none',
                    background: emailEnabled ? '#28a745' : '#888',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  {emailEnabled ? 'Activo' : 'Pausado'}
                </button>
              </div>

              <form onSubmit={handleSaveEmailConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    Tu Correo de Destino (Gmail) *
                  </label>
                  <input
                    type="email"
                    value={emailOwner}
                    onChange={(e) => setEmailOwner(e.target.value)}
                    placeholder="ej: safabu12@gmail.com"
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                    Aquí te llegarán las comandas completas con nombre, teléfono, dirección y lista de tortas.
                  </span>
                </div>

                {/* Instrucciones y código listo de Google Apps Script */}
                <div style={{
                  background: 'var(--blush)',
                  border: '1.5px solid #eed6db',
                  borderRadius: '16px',
                  padding: '20px',
                  lineHeight: 1.5
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--wine)' }}>
                        Paso a paso para conectar tu Gmail (100% Gratis - 500 pedidos/día):
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        Cero intermediarios (sin Brevo, ni Resend, ni EmailJS).
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(GOOGLE_SCRIPT_SNIPPET);
                        setCopiedScript(true);
                        toast.success('¡Código del script copiado al portapapeles!');
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '99px',
                        border: '1px solid var(--wine)',
                        background: '#ffffff',
                        color: 'var(--wine)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {copiedScript ? <Check size={14} color="#166534" /> : <Copy size={14} />}
                      <span>{copiedScript ? '¡Código Copiado!' : 'Copiar Código del Script'}</span>
                    </button>
                  </div>

                  <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.86rem', color: 'var(--wine2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      Abre en una pestaña: <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wine)', fontWeight: 700, textDecoration: 'underline' }}>script.google.com</a> con tu correo Gmail (safabu12@gmail.com).
                    </li>
                    <li>
                      Haz clic en el botón <strong>"+ Nuevo proyecto"</strong> (arriba a la izquierda).
                    </li>
                    <li>
                      Borra todo el texto del editor y pega el código (haz clic arriba en <strong>"Copiar Código del Script"</strong> o cópialo del archivo <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>google_script.js</code> de tu proyecto).
                    </li>
                    <li>
                      Arriba a la derecha haz clic en el botón azul <strong>"Implementar"</strong> &gt; <strong>"Nueva implementación"</strong>.
                    </li>
                    <li>
                      En el engranaje ⚙️ (Tipo), selecciona: <strong>"Aplicación web"</strong> y configura:
                      <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                        <li><strong>Descripción:</strong> Sablée Pedidos</li>
                        <li><strong>Ejecutar como:</strong> Yo (safabu12@gmail.com)</li>
                        <li><strong>Quién tiene acceso:</strong> Cualquier usuario (Anyone) <em>(necesario para que tu tienda web envíe los pedidos)</em></li>
                      </ul>
                    </li>
                    <li>
                      Haz clic en <strong>"Implementar"</strong>, autoriza los permisos de tu cuenta de Google, copia la <strong>"URL de la aplicación web"</strong> (termina en <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>/exec</code>) y pégala aquí abajo.
                    </li>
                  </ol>
                </div>

                {/* Campo URL de Google Apps Script */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                    URL de la Web App de Google Apps Script *
                  </label>
                  <input
                    type="url"
                    value={emailScriptUrl}
                    onChange={(e) => setEmailScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.88rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                    Pega aquí la URL que te genera Google terminada en <strong>/exec</strong>.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      borderRadius: '99px',
                      border: 'none',
                      background: 'var(--wine)',
                      color: 'var(--blush)',
                      fontWeight: 600,
                      fontSize: '0.94rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
                    }}
                  >
                    Guardar Configuración
                  </button>

                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={isSendingTestEmail}
                    style={{
                      padding: '14px 22px',
                      borderRadius: '99px',
                      border: '1.5px solid var(--wine)',
                      background: 'var(--petal)',
                      color: 'var(--wine)',
                      fontWeight: 600,
                      fontSize: '0.94rem',
                      cursor: isSendingTestEmail ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Send size={16} />
                    <span>{isSendingTestEmail ? 'Enviando...' : 'Probar Envío'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    )}
      </div>

      {/* Modal para ver comprobante */}
      {selectedReceipt && (
        <div 
          onClick={() => setSelectedReceipt(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <h3 className="d" style={{ marginBottom: '15px', color: 'var(--wine)' }}>Comprobante de Pago</h3>
            <img src={selectedReceipt} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px' }} />
            <button 
              onClick={() => setSelectedReceipt(null)}
              style={{ marginTop: '15px', background: 'var(--wine)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '99px', cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal para Crear Pedido Manual */}
      {showManualModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#fff', borderRadius: '28px', padding: '32px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 className="d" style={{ color: 'var(--wine)', marginBottom: '8px' }}>Registrar Pedido Manual</h2>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '20px' }}>Para pedidos tomados por teléfono, mostrador o WhatsApp.</p>

            <form onSubmit={handleCreateManualOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Nombre del Cliente:</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej. Sofía Martínez" 
                  value={manualClient}
                  onChange={(e) => setManualClient(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Teléfono WhatsApp:</label>
                <input 
                  type="tel" 
                  placeholder="300 000 0000" 
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Dirección de Entrega:</label>
                <input 
                  type="text" 
                  placeholder="Ej. Calle 10 # 40-20 o 'Recoge en tienda'" 
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Producto y Presentación:</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Torta Amapola 1/2 libra + 3 Galletas Nutella" 
                  value={manualProduct}
                  onChange={(e) => setManualProduct(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Total en Pesos ($ COP):</label>
                <input 
                  type="number" 
                  required
                  placeholder="Ej. 70000" 
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowManualModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '99px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '12px', borderRadius: '99px', border: 'none', background: 'var(--wine)', color: 'var(--blush)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar (Integrado al Sistema) */}
      {orderToDelete && (
        <div 
          onClick={() => setOrderToDelete(null)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(68, 14, 9, 0.45)', 
            backdropFilter: 'blur(3px)',
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: '#ffffff', 
              borderRadius: '28px', 
              padding: '36px', 
              maxWidth: '440px', 
              width: '100%', 
              textAlign: 'center', 
              boxShadow: '0 20px 50px rgba(68, 14, 9, 0.25)', 
              border: '1px solid rgba(123, 26, 16, 0.1)' 
            }}
          >
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'var(--petal, #FCE4E8)', 
              color: 'var(--wine, #7B1A10)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px' 
            }}>
              <Trash2 size={28} />
            </div>

            <h3 className="d" style={{ fontSize: '1.9rem', color: 'var(--wine, #7B1A10)', margin: '0 0 10px 0' }}>
              ¿Eliminar orden?
            </h3>
            <p style={{ color: '#665', fontSize: '1.05rem', lineHeight: 1.5, margin: '0 0 28px 0' }}>
              ¿Seguro que deseas eliminar la orden <strong>#{orderToDelete}</strong>? Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setOrderToDelete(null)}
                style={{ 
                  flex: 1, 
                  padding: '14px 20px', 
                  borderRadius: '99px', 
                  border: '1.5px solid rgba(123, 26, 16, 0.2)', 
                  background: '#faf7f8', 
                  color: 'var(--wine2, #440E09)', 
                  fontWeight: 600, 
                  fontSize: '1rem', 
                  cursor: 'pointer',
                  fontFamily: 'Jost, sans-serif'
                }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  deleteOrder(orderToDelete);
                  toast.success(`Orden #${orderToDelete} eliminada correctamente`);
                  setOrderToDelete(null);
                }}
                style={{ 
                  flex: 1, 
                  padding: '14px 20px', 
                  borderRadius: '99px', 
                  border: 'none', 
                  background: 'var(--wine, #7B1A10)', 
                  color: 'var(--blush, #FFF0F3)', 
                  fontWeight: 600, 
                  fontSize: '1rem', 
                  cursor: 'pointer',
                  fontFamily: 'Jost, sans-serif',
                  boxShadow: '0 4px 14px rgba(123, 26, 16, 0.3)'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de WhatsApp */}
      {showPhoneModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(68, 14, 9, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '36px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--petal)', color: 'var(--wine)', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <MessageCircle size={24} />
              </div>
              <h3 className="d" style={{ margin: 0, color: 'var(--wine)', fontSize: '1.7rem' }}>
                Número de WhatsApp
              </h3>
            </div>

            <p style={{ color: '#554', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '22px' }}>
              A este número de WhatsApp le llegarán las <strong>notificaciones automáticas de pedidos nuevos</strong> y cotizaciones de tortas personalizadas con el detalle de los productos y la dirección del cliente.
            </p>

            <form onSubmit={handleSavePhone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '6px' }}>
                  Número Celular (Colombia)
                </label>
                <input 
                  type="tel"
                  value={newPhoneInput}
                  onChange={(e) => setNewPhoneInput(e.target.value)}
                  placeholder="Ej: 312 5473848"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(123, 26, 16, 0.25)',
                    fontSize: '1.1rem',
                    fontFamily: 'Jost, sans-serif',
                    color: '#333',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginTop: '6px' }}>
                  El sistema añade el indicativo internacional (+57) automáticamente.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '99px',
                    border: '1.5px solid rgba(123, 26, 16, 0.2)',
                    background: '#faf7f8',
                    color: 'var(--wine2)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Jost, sans-serif'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '99px',
                    border: 'none',
                    background: 'var(--wine)',
                    color: 'var(--blush)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Jost, sans-serif',
                    boxShadow: '0 4px 12px rgba(123, 26, 16, 0.25)'
                  }}
                >
                  Guardar Número
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear o Editar Medio de Pago */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(68, 14, 9, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '36px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--petal)', color: 'var(--wine)', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="d" style={{ margin: 0, color: 'var(--wine)', fontSize: '1.6rem' }}>
                  {editingMethod ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  Aparecerá disponible para los clientes en la pantalla de pago.
                </span>
              </div>
            </div>

            <form onSubmit={handleSavePaymentMethod} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Nombre Visible *
                  </label>
                  <input 
                    type="text"
                    value={pmName}
                    onChange={(e) => setPmName(e.target.value)}
                    placeholder="Ej: Nequi, Bancolombia"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Banco / Entidad
                  </label>
                  <input 
                    type="text"
                    value={pmBank}
                    onChange={(e) => setPmBank(e.target.value)}
                    placeholder="Ej: Bancolombia"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Tipo de Cuenta
                  </label>
                  <select
                    value={pmType}
                    onChange={(e) => setPmType(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="Celular / Billetera Digital">Celular / Billetera Digital</option>
                    <option value="Cuenta de Ahorros">Cuenta de Ahorros</option>
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Llave Bre-B / Transfiya">Llave Bre-B / Transfiya</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Número de Cuenta / Celular *
                  </label>
                  <input 
                    type="text"
                    value={pmNumber}
                    onChange={(e) => setPmNumber(e.target.value)}
                    placeholder="Ej: 312 547 3848"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                  Nombre del Titular
                </label>
                <input 
                  type="text"
                  value={pmHolder}
                  onChange={(e) => setPmHolder(e.target.value)}
                  placeholder="Ej: Sablée Pastelería"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                  Instrucciones para el cliente (Opcional)
                </label>
                <input 
                  type="text"
                  value={pmInstructions}
                  onChange={(e) => setPmInstructions(e.target.value)}
                  placeholder="Ej: Escanea el QR o transfiere y adjunta tu comprobante"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '99px',
                    border: '1px solid #ccc',
                    background: '#fafafa',
                    color: '#555',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '99px',
                    border: 'none',
                    background: 'var(--wine)',
                    color: 'var(--blush)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(123, 26, 16, 0.25)'
                  }}
                >
                  {editingMethod ? 'Guardar Cambios' : 'Añadir Medio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear o Editar Producto de la Carta */}
      {showItemModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(68, 14, 9, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: 'var(--petal)', color: 'var(--wine)', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="d" style={{ margin: 0, color: 'var(--wine)', fontSize: '1.6rem' }}>
                  {editingItem ? 'Editar Producto' : 'Añadir a la Carta'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  Define el nombre, descripción y las presentaciones con sus precios.
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Nombre del Producto *
                  </label>
                  <input 
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ej: Torta de Amapola, Genovesa..."
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                    Sección / Categoría
                  </label>
                  <select
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="tortas">Tortas</option>
                    <option value="galletas">Galletas</option>
                    <option value="postres">Postres</option>
                  </select>
                </div>
              </div>

              {/* Subir y gestionar Galería de Fotos del Producto */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--wine)' }}>
                    Fotos del Producto ({itemImages.length})
                  </label>
                  <label 
                    htmlFor="modal-product-multiple-photos"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--wine)',
                      color: 'var(--blush)',
                      padding: '6px 14px',
                      borderRadius: '99px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(123, 26, 16, 0.2)'
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Subir Fotos (puedes elegir varias)</span>
                  </label>
                  <input 
                    type="file" 
                    id="modal-product-multiple-photos" 
                    multiple
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const fileArray = Array.from(files);
                        let loaded = 0;
                        const newImgs: string[] = [];
                        fileArray.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              newImgs.push(reader.result as string);
                            }
                            loaded++;
                            if (loaded === fileArray.length) {
                              setItemImages(prev => [...prev, ...newImgs]);
                              toast.success(`¡${newImgs.length} foto(s) añadida(s)! Recuerda guardar cambios.`);
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                  />
                </div>

                {itemImages.length > 0 ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', 
                    gap: '10px', 
                    background: '#fff7f8', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    border: '1.5px dashed #e2b4bb',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {itemImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                        <img src={img} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <span style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'var(--wine)', color: 'var(--blush)', fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setItemImages(itemImages.filter((_, i) => i !== idx));
                            toast.success('Foto eliminada');
                          }}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '13px',
                            lineHeight: 1
                          }}
                          title="Eliminar esta foto"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#fff7f8', padding: '18px', borderRadius: '12px', border: '1.5px dashed #e2b4bb', textAlign: 'center' }}>
                    <Upload size={28} style={{ color: 'var(--wine)', opacity: 0.5, marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#665' }}>
                      Aún no hay fotos añadidas. Haz clic en <strong>+ Subir Fotos</strong> para agregar una o varias a la vez.
                    </p>
                  </div>
                )}
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#776', marginTop: '6px' }}>
                  * La primera foto será la portada. Los clientes podrán deslizar y ver todas las fotos en la tienda.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                  Descripción Apetitosa
                </label>
                <textarea 
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Describe los ingredientes, texturas o sabor de esta delicia..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'Jost, sans-serif' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '4px' }}>
                  Etiqueta Especial (Opcional)
                </label>
                <input 
                  type="text"
                  value={itemBadge}
                  onChange={(e) => setItemBadge(e.target.value)}
                  placeholder="Ej: Favorito, Top ventas, Especialidad, Nuevo"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              {/* Presentaciones y Precios Dinámicos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--wine)' }}>
                    Presentaciones & Precios (COP) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setItemPresentations([
                        ...itemPresentations,
                        { label: 'Nueva presentación', portions: '', price: 50000 }
                      ]);
                    }}
                    style={{
                      background: 'var(--petal)',
                      color: 'var(--wine)',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '99px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Añadir Tamaño
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {itemPresentations.map((pres, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text"
                        placeholder="Ej: 1/4 libra"
                        value={pres.label}
                        onChange={(e) => {
                          const updated = [...itemPresentations];
                          updated[idx].label = e.target.value;
                          setItemPresentations(updated);
                        }}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.88rem' }}
                        required
                      />
                      <input 
                        type="text"
                        placeholder="8 porciones"
                        value={pres.portions || ''}
                        onChange={(e) => {
                          const updated = [...itemPresentations];
                          updated[idx].portions = e.target.value;
                          setItemPresentations(updated);
                        }}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.88rem' }}
                      />
                      <input 
                        type="number"
                        placeholder="Precio COP"
                        value={pres.price}
                        onChange={(e) => {
                          const updated = [...itemPresentations];
                          updated[idx].price = parseInt(e.target.value) || 0;
                          setItemPresentations(updated);
                        }}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.88rem', fontWeight: 600 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (itemPresentations.length <= 1) {
                            toast.error('Debe haber al menos una presentación');
                            return;
                          }
                          setItemPresentations(itemPresentations.filter((_, i) => i !== idx));
                        }}
                        style={{ background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '99px',
                    border: '1px solid #ccc',
                    background: '#fafafa',
                    color: '#555',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '99px',
                    border: 'none',
                    background: 'var(--wine)',
                    color: 'var(--blush)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(123, 26, 16, 0.25)'
                  }}
                >
                  {editingItem ? 'Guardar Cambios' : 'Añadir Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
