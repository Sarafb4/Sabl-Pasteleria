import React, { useState, useRef } from 'react';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import OvenIcon from '../components/OvenIcon';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';
import { saveLegalConsentToSupabase } from '../services/supabaseClient';
import { 
  validateName, 
  validateEmail, 
  validatePhone, 
  validateAddress, 
  validateBarrio,
  sanitizeTextInput,
  sanitizeMultilineInput,
  isSuspiciousPayload
} from '../utils/validators';
import './CheckoutPage.css';

const CheckoutPage: React.FC = () => {
  const { items, getTotalPrice } = useCartStore();
  const createOrder = useOrderStore(state => state.createOrder);
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  const schedule = useOrderStore(state => state.schedule);
  const navigate = useNavigate();

  // Protección anti-bot: campo trampa honeypot y tiempo de llenado
  const [honeypot, setHoneypot] = useState('');
  const formMountTime = useRef<number>(Date.now());

  // Estados de inputs del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    ciudad: 'Bucaramanga',
    barrio: '',
    direccion: '',
    detalles: '',
    termsAccepted: false,
    privacyAccepted: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = getTotalPrice();
  const isPickup = formData.ciudad === 'Recoger en Pastelería';

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const validateField = (field: string, value: any, pickup = isPickup): string => {
    switch (field) {
      case 'nombre':
        return validateName(String(value || '')).error || '';
      case 'correo':
        return validateEmail(String(value || '')).error || '';
      case 'telefono':
        return validatePhone(String(value || '')).error || '';
      case 'barrio':
        return validateBarrio(String(value || ''), pickup).error || '';
      case 'direccion':
        return validateAddress(String(value || ''), pickup).error || '';
      case 'termsAccepted':
        return value ? '' : 'Debes aceptar los Términos y Condiciones.';
      case 'privacyAccepted':
        return value ? '' : 'Debes autorizar el Tratamiento de Datos Personales.';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const nextVal = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    const updatedForm = { ...formData, [name]: nextVal };
    setFormData(updatedForm);

    const willBePickup = name === 'ciudad' ? nextVal === 'Recoger en Pastelería' : isPickup;

    if (touched[name]) {
      const err = validateField(name, nextVal, willBePickup);
      setErrors(prev => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, (formData as any)[field], isPickup);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {
      nombre: validateField('nombre', formData.nombre, isPickup),
      correo: validateField('correo', formData.correo, isPickup),
      telefono: validateField('telefono', formData.telefono, isPickup),
      barrio: validateField('barrio', formData.barrio, isPickup),
      direccion: validateField('direccion', formData.direccion, isPickup),
      termsAccepted: validateField('termsAccepted', formData.termsAccepted, isPickup),
      privacyAccepted: validateField('privacyAccepted', formData.privacyAccepted, isPickup)
    };

    setErrors(newErrors);
    setTouched({
      nombre: true,
      correo: true,
      telefono: true,
      barrio: true,
      direccion: true,
      termsAccepted: true,
      privacyAccepted: true
    });

    const hasErrors = Object.values(newErrors).some(err => Boolean(err));
    return !hasErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Detección de bots automatizados vía campo trampa Honeypot
    if (honeypot.trim() !== '') {
      // Bloqueo silencioso: si un bot llenó el campo oculto, simular salida sin crear pedido
      setIsSubmitting(true);
      setTimeout(() => {
        navigate('/');
      }, 400);
      return;
    }

    // 2. Detección de bots de velocidad ultra-rápida (< 1.2 segundos desde la carga)
    if (Date.now() - formMountTime.current < 1200) {
      toast.error('Por favor tómate un momento para revisar tus datos con calma.');
      return;
    }

    if (!validateAll()) {
      toast.error('Por favor completa los datos obligatorios marcados en rojo.');
      return;
    }

    // 3. Verificación de cargas maliciosas o inyecciones de script (Anti-XSS / SQLi)
    const inputsToCheck = [
      formData.nombre,
      formData.correo,
      formData.telefono,
      formData.barrio,
      formData.direccion,
      formData.detalles
    ];
    if (inputsToCheck.some(val => isSuspiciousPayload(val))) {
      toast.error('Se detectaron caracteres o secuencias de texto no permitidas por seguridad.');
      return;
    }

    // 4. Rate limiting para evitar spam o saturación de pedidos (máx 3 pedidos cada 2 min)
    const rateLimit = checkRateLimit('create_order', 3, 120000);
    if (!rateLimit.allowed) {
      toast.error(`Por seguridad y para no saturar la cocina, por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otro pedido.`);
      return;
    }

    // 5. Sanitización limpia de entradas
    const cleanName = sanitizeTextInput(formData.nombre, 70);
    const cleanEmail = sanitizeTextInput(formData.correo, 80);
    const cleanPhone = sanitizeTextInput(formData.telefono, 20);
    const cleanBarrio = sanitizeTextInput(formData.barrio, 80);
    const cleanDireccion = sanitizeTextInput(formData.direccion, 120);
    const cleanDetalles = sanitizeMultilineInput(formData.detalles, 300);

    setIsSubmitting(true);
    const fullAddress = isPickup 
      ? 'Recoge en Tienda (Sablée Pastelería)' 
      : `${cleanDireccion} (Barrio: ${cleanBarrio})`;

    try {
      const orderId = createOrder({
        customer: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          address: fullAddress,
          details: cleanDetalles,
          city: formData.ciudad,
        },
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal: total,
        tax: 0,
        total,
        status: 'Pendiente por validación',
        channel: 'Web / QR',
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        privacyAccepted: true,
        privacyAcceptedAt: new Date().toISOString(),
        dataConsentAccepted: true,
        dataConsentAt: new Date().toISOString()
      });

      // Guardar auditoría legal de consentimiento en Supabase
      const nowIso = new Date().toISOString();
      saveLegalConsentToSupabase({
        consentType: 'terminos_y_condiciones',
        accepted: true,
        acceptedAt: nowIso,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        orderId
      });
      saveLegalConsentToSupabase({
        consentType: 'politica_privacidad',
        accepted: true,
        acceptedAt: nowIso,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        orderId
      });
      saveLegalConsentToSupabase({
        consentType: 'habeas_data',
        accepted: true,
        acceptedAt: nowIso,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        orderId
      });

      // Guardar en el historial de pedidos de este dispositivo para seguimiento inmediato
      try {
        const raw = localStorage.getItem('sablee_user_orders');
        const userOrders: string[] = raw ? JSON.parse(raw) : [];
        if (!userOrders.includes(orderId)) {
          userOrders.unshift(orderId);
          localStorage.setItem('sablee_user_orders', JSON.stringify(userOrders));
        }
      } catch (e) {
        console.warn('No se pudo guardar en sablee_user_orders', e);
      }

      navigate(`/payment?id=${orderId}`);
    } catch (err) {
      console.error('[Error Checkout]:', err);
      setIsSubmitting(false);
      toast.error('Tuvimos un inconveniente al procesar tu orden. Por favor intenta de nuevo o escríbenos directamente a WhatsApp.');
    }
  };

  const handleWhatsAppOrder = () => {
    if (isSubmitting) return;

    if (!validateAll()) {
      toast.error('Por favor completa los datos requeridos antes de ir a WhatsApp.');
      return;
    }

    // Rate limiting para pedidos por WhatsApp
    const rateLimit = checkRateLimit('create_order', 3, 120000);
    if (!rateLimit.allowed) {
      toast.error(`Por seguridad y para no saturar la cocina, por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otro pedido.`);
      return;
    }

    setIsSubmitting(true);
    const fullAddress = isPickup 
      ? 'Recoge en Tienda (Sablée Pastelería)' 
      : `${formData.direccion.trim()} (Barrio: ${formData.barrio.trim()})`;

    const orderId = createOrder({
      customer: {
        name: formData.nombre.trim(),
        phone: formData.telefono.trim(),
        email: formData.correo.trim() || 'pedido.whatsapp@sablee.com',
        address: fullAddress,
        city: formData.ciudad
      },
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      subtotal: total,
      tax: 0,
      total,
      status: 'Pendiente por validación',
      channel: 'WhatsApp',
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      privacyAccepted: true,
      privacyAcceptedAt: new Date().toISOString(),
      dataConsentAccepted: true,
      dataConsentAt: new Date().toISOString()
    });

    // Guardar auditoría legal de consentimiento en Supabase
    const nowIso = new Date().toISOString();
    saveLegalConsentToSupabase({
      consentType: 'terminos_y_condiciones',
      accepted: true,
      acceptedAt: nowIso,
      customerName: formData.nombre.trim(),
      customerPhone: formData.telefono.trim(),
      customerEmail: formData.correo.trim(),
      orderId
    });
    saveLegalConsentToSupabase({
      consentType: 'politica_privacidad',
      accepted: true,
      acceptedAt: nowIso,
      customerName: formData.nombre.trim(),
      customerPhone: formData.telefono.trim(),
      customerEmail: formData.correo.trim(),
      orderId
    });
    saveLegalConsentToSupabase({
      consentType: 'habeas_data',
      accepted: true,
      acceptedAt: nowIso,
      customerName: formData.nombre.trim(),
      customerPhone: formData.telefono.trim(),
      customerEmail: formData.correo.trim(),
      orderId
    });

    // Guardar en el historial de pedidos de este dispositivo para seguimiento inmediato
    try {
      const raw = localStorage.getItem('sablee_user_orders');
      const userOrders: string[] = raw ? JSON.parse(raw) : [];
      if (!userOrders.includes(orderId)) {
        userOrders.unshift(orderId);
        localStorage.setItem('sablee_user_orders', JSON.stringify(userOrders));
      }
    } catch (e) {
      console.warn('No se pudo guardar en sablee_user_orders', e);
    }

    const itemsList = items.map(i => `• ${i.quantity}x ${i.name} - $${(i.price * i.quantity).toLocaleString('es-CO')}`).join('\n');
    const adminUrl = `${window.location.origin}/admin`;
    const message = 
`🍰 ¡Nuevo Pedido #${orderId} de Sablée Pastelería!
Cliente: ${formData.nombre.trim()} (Cel: ${formData.telefono.trim()})
Dirección: ${fullAddress} · ${formData.ciudad}
Productos:
${itemsList}
Total: ${formatCOP(total)} COP
Ver en Panel: ${adminUrl}`;

    window.open(`https://wa.me/${bakeryPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setIsSubmitting(false);
  };

  if (items.length === 0) {
    return (
      <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
        <Header />
        <div style={{ paddingTop: '150px', textAlign: 'center' }}>
          <h2 className="d">Tu horno está vacío</h2>
          <button onClick={() => navigate('/')} className="back-btn">
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
      <Header />
      <div className="checkout-container">
        <h1 className="d big" style={{ color: 'var(--wine)' }}>Checkout</h1>
        
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            {/* Campo trampa Honeypot anti-spam (invisible para humanos, detecta bots automáticos) */}
            <div style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
              <input
                type="text"
                name="empresa_website_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <section className="form-section">
              <h2 className="d">Datos de Contacto</h2>
              <div className="input-group">
                <label htmlFor="input-nombre">Nombre Completo *</label>
                <input 
                  id="input-nombre"
                  type="text" 
                  name="nombre" 
                  value={formData.nombre}
                  onChange={handleChange}
                  onBlur={() => handleBlur('nombre')}
                  className={touched.nombre && errors.nombre ? 'input-has-error' : ''}
                  placeholder="Ej. Nombre y Apellido" 
                />
                {touched.nombre && errors.nombre && (
                  <span className="input-error-text">
                    <AlertCircle size={14} />
                    {errors.nombre}
                  </span>
                )}
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="input-correo">Correo Electrónico *</label>
                  <input 
                    id="input-correo"
                    type="email" 
                    name="correo" 
                    value={formData.correo}
                    onChange={handleChange}
                    onBlur={() => handleBlur('correo')}
                    className={touched.correo && errors.correo ? 'input-has-error' : ''}
                    placeholder="ejemplo@mail.com" 
                  />
                  {touched.correo && errors.correo && (
                    <span className="input-error-text">
                      <AlertCircle size={14} />
                      {errors.correo}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="input-telefono">Teléfono Celular *</label>
                  <input 
                    id="input-telefono"
                    type="tel" 
                    name="telefono" 
                    value={formData.telefono}
                    onChange={handleChange}
                    onBlur={() => handleBlur('telefono')}
                    className={touched.telefono && errors.telefono ? 'input-has-error' : ''}
                    placeholder="000 000 0000" 
                  />
                  {touched.telefono && errors.telefono && (
                    <span className="input-error-text">
                      <AlertCircle size={14} />
                      {errors.telefono}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2 className="d">Dirección de Entrega</h2>

              {/* Horario de Atención en Vivo */}
              <div style={{
                background: schedule.isOpen ? '#f0fdf4' : '#fff5f5',
                border: schedule.isOpen ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                borderRadius: '16px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px'
              }}>
                <Clock size={22} color={schedule.isOpen ? '#166534' : '#991b1b'} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.88rem', color: '#333', lineHeight: 1.4 }}>
                  <div>
                    <strong style={{ color: schedule.isOpen ? '#166534' : '#991b1b' }}>
                      {schedule.isOpen ? 'Pastelería Abierta (Horneando hoy)' : 'En Horario de Descanso'}
                    </strong> · {schedule.weekdays} · Sáb: {schedule.saturdays}
                  </div>
                  {!schedule.isOpen && (
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '2px' }}>
                      Puedes completar tu pedido ahora; lo prepararemos con prioridad a primera hora en cuanto abramos.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Aviso de Cobertura Metropolitana */}
              <div style={{
                background: 'rgba(123, 26, 16, 0.05)',
                border: '1.5px solid rgba(123, 26, 16, 0.18)',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <MapPin size={24} color="var(--wine)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--wine2)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--wine)' }}>Zona de Cobertura Exclusiva:</strong> Envíos disponibles únicamente en <strong>Bucaramanga, Floridablanca, Girón y Piedecuesta</strong> para asegurar que tus tortas y postres lleguen frescos e intactos.
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="input-ciudad">Municipio / Área de Cobertura *</label>
                  <select 
                    id="input-ciudad"
                    name="ciudad" 
                    value={formData.ciudad} 
                    onChange={handleChange}
                  >
                    <option value="Bucaramanga">Bucaramanga</option>
                    <option value="Floridablanca">Floridablanca (Cañaveral, etc.)</option>
                    <option value="Girón">Girón</option>
                    <option value="Piedecuesta">Piedecuesta</option>
                    <option value="Recoger en Pastelería">Recoger en Pastelería (Sin costo de domicilio)</option>
                  </select>
                </div>

                {!isPickup && (
                  <div className="input-group">
                    <label htmlFor="input-barrio">Barrio / Sector *</label>
                    <input 
                      id="input-barrio"
                      type="text" 
                      name="barrio" 
                      value={formData.barrio}
                      onChange={handleChange}
                      onBlur={() => handleBlur('barrio')}
                      className={touched.barrio && errors.barrio ? 'input-has-error' : ''}
                      placeholder="Ej. Barrio / Sector" 
                    />
                    {touched.barrio && errors.barrio && (
                      <span className="input-error-text">
                        <AlertCircle size={14} />
                        {errors.barrio}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isPickup ? (
                <div className="input-group">
                  <label htmlFor="input-direccion">Dirección exacta de entrega *</label>
                  <input 
                    id="input-direccion"
                    type="text" 
                    name="direccion" 
                    value={formData.direccion}
                    onChange={handleChange}
                    onBlur={() => handleBlur('direccion')}
                    className={touched.direccion && errors.direccion ? 'input-has-error' : ''}
                    placeholder="Ej. Calle 00 # 00 - 00, Apto 000" 
                  />
                  {touched.direccion && errors.direccion && (
                    <span className="input-error-text">
                      <AlertCircle size={14} />
                      {errors.direccion}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ background: '#fdf7f8', border: '1px solid #eed6db', borderRadius: '12px', padding: '14px', fontSize: '0.9rem', color: 'var(--wine)' }}>
                  <strong>Punto de Retiro:</strong> Tu orden estará lista para recoger fresca en nuestro taller de Sablée Pastelería en Bucaramanga.
                </div>
              )}

              <div className="input-group">
                <label htmlFor="input-detalles">Detalles adicionales para la entrega</label>
                <input 
                  id="input-detalles"
                  type="text" 
                  name="detalles" 
                  value={formData.detalles}
                  onChange={handleChange}
                  placeholder="Ej. Apto 000, Torre 0, dejar en portería" 
                />
              </div>
            </section>

            {/* Casillas de Verificación Separadas: Términos y Tratamiento de Datos */}
            <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Casilla 1: Términos y Condiciones */}
              <div style={{
                background: '#ffffff',
                border: touched.termsAccepted && errors.termsAccepted ? '1.5px solid #dc2626' : '1px solid rgba(123, 26, 16, 0.12)',
                borderRadius: '14px',
                padding: '14px 16px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="termsAccepted" 
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    onBlur={() => handleBlur('termsAccepted')}
                    style={{ width: '20px', height: '20px', minWidth: '20px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--wine)', touchAction: 'manipulation' }} 
                  />
                  <label htmlFor="termsAccepted" style={{ fontSize: '0.9rem', color: 'var(--wine)', lineHeight: '1.45', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation' }}>
                    He leído y acepto los <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 700 }}>Términos y Condiciones</a> del servicio de compra y entrega en Sablée Pastelería.
                  </label>
                </div>
                {touched.termsAccepted && errors.termsAccepted && (
                  <span className="input-error-text" style={{ marginLeft: '32px', marginTop: '6px' }}>
                    <AlertCircle size={14} />
                    {errors.termsAccepted}
                  </span>
                )}
              </div>

              {/* Casilla 2: Tratamiento de Datos Personales (Habeas Data) */}
              <div style={{
                background: '#ffffff',
                border: touched.privacyAccepted && errors.privacyAccepted ? '1.5px solid #dc2626' : '1px solid rgba(123, 26, 16, 0.12)',
                borderRadius: '14px',
                padding: '14px 16px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="privacyAccepted" 
                    name="privacyAccepted"
                    checked={formData.privacyAccepted}
                    onChange={handleChange}
                    onBlur={() => handleBlur('privacyAccepted')}
                    style={{ width: '20px', height: '20px', minWidth: '20px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--wine)', touchAction: 'manipulation' }} 
                  />
                  <label htmlFor="privacyAccepted" style={{ fontSize: '0.9rem', color: 'var(--wine)', lineHeight: '1.45', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation' }}>
                    Autorizo expresamente el <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 700 }}>Tratamiento de mis Datos Personales</a> conforme a la Política de Privacidad y la Ley 1581 de 2012 (Habeas Data).
                  </label>
                </div>
                {touched.privacyAccepted && errors.privacyAccepted && (
                  <span className="input-error-text" style={{ marginLeft: '32px', marginTop: '6px' }}>
                    <AlertCircle size={14} />
                    {errors.privacyAccepted}
                  </span>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? 'Procesando tu pedido...' : 'Ir a Pagar'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={handleWhatsAppOrder}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--wine, #7B1A10)',
                  border: '2px solid var(--wine, #7B1A10)',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '1.02rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{isSubmitting ? 'Procesando...' : 'Pedir directamente por WhatsApp'}</span>
              </button>
            </div>
          </form>

          <aside className="checkout-summary">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1.5px dashed rgba(123, 26, 16, 0.15)', paddingBottom: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--petal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <OvenIcon size={20} color="var(--wine)" />
              </div>
              <div>
                <h2 className="d" style={{ margin: 0, fontSize: '1.35rem', color: 'var(--wine)', border: 'none', padding: 0 }}>
                  Resumen de Orden
                </h2>
                <span style={{ fontSize: '0.74rem', color: '#776', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Sablée Bucaramanga
                </span>
              </div>
            </div>

            <ul className="summary-items">
              {items.map(item => (
                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.94rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--wine)', marginRight: '6px' }}>{item.quantity}x</span>
                    <span style={{ color: 'var(--wine2)', fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--wine)', whiteSpace: 'nowrap' }}>{formatCOP(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="summary-totals">
              <div style={{
                background: 'var(--petal)',
                padding: '14px 18px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--wine)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total a Pagar
                </span>
                <span className="d" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--wine)' }}>
                  {formatCOP(total)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

