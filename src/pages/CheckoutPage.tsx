import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';
import { 
  validateName, 
  validateEmail, 
  validatePhone, 
  validateAddress, 
  validateBarrio 
} from '../utils/validators';
import './CheckoutPage.css';

const CheckoutPage: React.FC = () => {
  const { items, getTotalPrice } = useCartStore();
  const createOrder = useOrderStore(state => state.createOrder);
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  const schedule = useOrderStore(state => state.schedule);
  const navigate = useNavigate();

  // Estados de inputs del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    ciudad: 'Bucaramanga',
    barrio: '',
    direccion: '',
    detalles: '',
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
      case 'privacyAccepted':
        return value ? '' : 'Debes aceptar los términos y el tratamiento de datos.';
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
      privacyAccepted: validateField('privacyAccepted', formData.privacyAccepted, isPickup)
    };

    setErrors(newErrors);
    setTouched({
      nombre: true,
      correo: true,
      telefono: true,
      barrio: true,
      direccion: true,
      privacyAccepted: true
    });

    const hasErrors = Object.values(newErrors).some(err => Boolean(err));
    return !hasErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateAll()) {
      toast.error('Por favor completa los datos obligatorios marcados en rojo.');
      return;
    }

    // Rate limiting para evitar spam o saturación de pedidos (máx 3 pedidos cada 2 min)
    const rateLimit = checkRateLimit('create_order', 3, 120000);
    if (!rateLimit.allowed) {
      toast.error(`Por seguridad y para no saturar la cocina, por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otro pedido.`);
      return;
    }

    setIsSubmitting(true);
    const fullAddress = isPickup 
      ? 'Recoge en Tienda (Sablée Pastelería)' 
      : `${formData.direccion.trim()} (Barrio: ${formData.barrio.trim()})`;

    try {
      const orderId = createOrder({
        customer: {
          name: formData.nombre.trim(),
          email: formData.correo.trim(),
          phone: formData.telefono.trim(),
          address: fullAddress,
          details: formData.detalles.trim(),
          city: formData.ciudad,
        },
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal: total,
        tax: 0,
        total,
        status: 'Pendiente de pago',
        channel: 'Web / QR'
      });

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
      status: 'Pendiente de pago',
      channel: 'WhatsApp'
    });

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
                  placeholder="Ej. Ana Pérez" 
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
                    placeholder="ana@email.com" 
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
                    placeholder="Ej. 312 345 6789" 
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
                      placeholder="Ej. Cabecera, Provenza, Cañaveral..." 
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
                    placeholder="Ej. Cra 35 # 48-12 / Casa / Manzana / Conjunto" 
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
                  placeholder="Torre, apto, indicaciones especiales para el domiciliario (opcional)" 
                />
              </div>
            </section>

            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="privacy" 
                  name="privacyAccepted"
                  checked={formData.privacyAccepted}
                  onChange={handleChange}
                  onBlur={() => handleBlur('privacyAccepted')}
                  style={{ marginTop: '5px', transform: 'scale(1.2)', cursor: 'pointer' }} 
                />
                <label htmlFor="privacy" style={{ fontSize: '0.9rem', color: 'var(--wine)', lineHeight: '1.4', cursor: 'pointer' }}>
                  Acepto los <a href="/terms" target="_blank" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 'bold' }}>Términos y Condiciones</a> y doy mi <a href="/privacy-policy" target="_blank" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 'bold' }}>Autorización para el Tratamiento de Datos Personales</a>.
                </label>
              </div>
              {touched.privacyAccepted && errors.privacyAccepted && (
                <span className="input-error-text" style={{ marginLeft: '26px', marginTop: '6px' }}>
                  <AlertCircle size={14} />
                  {errors.privacyAccepted}
                </span>
              )}
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
                  borderRadius: '99px',
                  fontWeight: 600,
                  fontSize: '1.05rem',
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
            <h2 className="d">Resumen de Orden</h2>
            <ul className="summary-items">
              {items.map(item => (
                <li key={item.id}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCOP(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="summary-totals">
              <div className="tot-row main-total d" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span>Total a Pagar</span>
                <span>{formatCOP(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

