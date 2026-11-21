import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { usePaymentStore } from '../store/paymentStore';
import { Copy, Check, Upload, CreditCard, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import OvenIcon from '../components/OvenIcon';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';
import { validateFileUpload } from '../utils/validators';

const PaymentPage: React.FC = () => {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const attachReceipt = useOrderStore(state => state.attachReceipt);
  const orders = useOrderStore(state => state.orders);
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  const allPaymentMethods = usePaymentStore(state => state.methods);
  const paymentMethods = allPaymentMethods.filter(m => m.enabled);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id') || searchParams.get('orderId') || '';
  
  // Buscar si la orden ya existe en el sistema
  const existingOrder = orders.find(o => o.id === orderId);
  const activeOrderId = orderId || existingOrder?.id || 'SAB-1024';

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleccionar por defecto el primer medio de pago activo
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods.length > 0 ? paymentMethods[0].id : ''
  );

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];
  const total = existingOrder ? existingOrder.total : getTotalPrice();

  // Lista de ítems para la facturita
  const orderItems = existingOrder && Array.isArray(existingOrder.items) && existingOrder.items.length > 0
    ? existingOrder.items
    : items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      }));

  const customer = existingOrder?.customer;
  const subtotal = existingOrder ? existingOrder.subtotal : getTotalPrice();
  const deliveryFee = existingOrder ? Math.max(0, existingOrder.total - existingOrder.subtotal) : 0;

  // Teléfono de WhatsApp configurado en el panel de administración
  const displayBakeryPhone = (() => {
    let clean = (bakeryPhone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('57') && clean.length === 12) clean = clean.substring(2);
    if (clean.length === 10) return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    return clean || bakeryPhone || '312 547 3848';
  })();

  // Formato de fecha para la factura
  const orderDateFormatted = existingOrder?.date
    ? (() => {
        try {
          const d = new Date(existingOrder.date);
          return !isNaN(d.getTime())
            ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : existingOrder.date;
        } catch {
          return existingOrder.date;
        }
      })()
    : new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Limpiar memoria de la vista previa del archivo
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      const validation = validateFileUpload(selected);
      if (!validation.isValid) {
        toast.error(validation.error || 'Archivo no permitido.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setFile(selected);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
      toast.success('Comprobante seleccionado con éxito');
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success('Número copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Por favor adjunta la foto o captura de tu comprobante de pago.');
      return;
    }

    // Rate limiting contra saturación de subidas (máx 5 comprobantes por minuto)
    const rateLimit = checkRateLimit('receipt_upload', 5, 60000);
    if (!rateLimit.allowed) {
      toast.error(`Por favor espera ${rateLimit.retryAfterSec} segundos antes de volver a enviar el comprobante.`);
      return;
    }

    // Validación estricta de seguridad del archivo antes de procesar
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Archivo no válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        attachReceipt(activeOrderId, base64);
        toast.success('Comprobante recibido con éxito. Tu pedido entrará a preparación.');
        clearCart();
        navigate(`/order-status?id=${activeOrderId}`);
      } catch (err) {
        console.error('[Error al guardar comprobante]:', err);
        toast.error(`No pudimos guardar el comprobante. Puedes enviarlo directamente a nuestro WhatsApp (${displayBakeryPhone}).`);
      }
    };
    reader.onerror = () => {
      toast.error('Ocurrió un inconveniente al leer la foto. Intenta con otra imagen en formato JPG o PNG.');
    };
    reader.readAsDataURL(file);
  };

  if (items.length === 0 && !existingOrder) {
    return (
      <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
        <Header />
        <div style={{ paddingTop: '150px', textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
          <h2 className="d" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>No hay pedidos pendientes</h2>
          <p style={{ color: '#776', marginBottom: '24px', fontSize: '1.05rem' }}>
            Agrega deliciosos postres o tortas a tu carrito para continuar.
          </p>
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              padding: '13px 32px', 
              borderRadius: '99px', 
              border: 'none', 
              background: 'var(--wine)', 
              color: 'var(--blush)', 
              cursor: 'pointer', 
              fontFamily: 'Jost, sans-serif', 
              fontWeight: 700,
              boxShadow: '0 6px 20px rgba(123, 26, 16, 0.25)',
              transition: 'transform 0.2s ease'
            }}
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine2)', paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
      <Header />
      <div style={{ paddingTop: '105px', maxWidth: '520px', margin: '0 auto', paddingLeft: '14px', paddingRight: '14px', boxSizing: 'border-box', width: '100%' }}>
        
        {/* TARJETA ÚNICA: FACTURA + PAGO DIRECTO */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 12px 36px rgba(123, 26, 16, 0.08)',
          border: '1.5px solid rgba(123, 26, 16, 0.12)',
          overflow: 'hidden',
          width: '100%',
          boxSizing: 'border-box'
        }}>

          {/* Cabecera de la Factura */}
          <div style={{
            background: '#FAF7F6',
            padding: '20px 18px 16px',
            borderBottom: '1px solid rgba(123, 26, 16, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--wine)',
              marginBottom: '4px'
            }}>
              <OvenIcon size={22} color="var(--wine)" />
              <span className="d" style={{
                fontSize: '1.45rem',
                letterSpacing: '0.01em'
              }}>
                Sablée Pastelería
              </span>
            </div>
            
            <div style={{
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#776',
              fontWeight: 600
            }}>
              Taller Artesanal · Bucaramanga
            </div>

            {/* Placa Factura y Fecha */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                background: 'var(--petal)',
                color: 'var(--wine)',
                padding: '3px 12px',
                borderRadius: '99px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                Factura #{activeOrderId}
              </span>
              <span style={{
                fontSize: '0.76rem',
                color: '#776',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                padding: '3px 10px',
                borderRadius: '99px',
                border: '1px solid rgba(123, 26, 16, 0.08)'
              }}>
                <Clock size={12} color="var(--wine)" />
                {orderDateFormatted}
              </span>
            </div>
          </div>

          {/* Datos del Cliente */}
          {customer && (
            <div style={{
              margin: '14px 18px 0',
              padding: '12px 16px',
              background: '#FAF7F6',
              borderRadius: '14px',
              border: '1px solid rgba(123, 26, 16, 0.08)',
              fontSize: '0.82rem',
              color: 'var(--wine2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div>
                <span style={{ color: '#887', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, marginRight: '6px' }}>
                  Cliente:
                </span>
                <strong style={{ color: 'var(--wine)' }}>{customer.name}</strong>
                {customer.phone && <span style={{ color: '#665', marginLeft: '6px' }}>({customer.phone})</span>}
              </div>
              <div>
                <span style={{ color: '#887', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, marginRight: '6px' }}>
                  Destino:
                </span>
                <span style={{ color: 'var(--wine2)' }}>{customer.address || customer.city || 'Recogida en taller'}</span>
              </div>
            </div>
          )}

          {/* Detalle de Productos */}
          <div style={{ padding: '16px 20px 18px' }}>
            <div style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#887',
              fontWeight: 700,
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(123, 26, 16, 0.08)'
            }}>
              <span>Ítem & Cantidad</span>
              <span>Subtotal</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orderItems.map((item, idx) => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                return (
                  <div 
                    key={item.id || idx} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.88rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: 'var(--wine)',
                        background: 'var(--petal)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        flexShrink: 0
                      }}>
                        {item.quantity}x
                      </span>
                      <span style={{ color: 'var(--wine2)', fontWeight: 600, wordBreak: 'break-word', minWidth: 0, lineHeight: 1.25 }}>
                        {item.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--wine)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '6px' }}>
                      ${itemTotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Subtotales y Total */}
            <div style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(123, 26, 16, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '0.82rem',
              color: '#665'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>${subtotal.toLocaleString('es-CO')} COP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Entrega / Domicilio:</span>
                <span style={{ fontWeight: 600, color: deliveryFee > 0 ? 'var(--wine)' : '#2E7D32' }}>
                  {deliveryFee > 0 ? `$${deliveryFee.toLocaleString('es-CO')} COP` : 'Sin costo adicional'}
                </span>
              </div>
            </div>

            {/* Total Destacado */}
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'var(--petal)',
              border: '1.5px solid rgba(123, 26, 16, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
                color: 'var(--wine)'
              }}>
                Total a Transferir:
              </span>
              <div 
                className="d"
                style={{
                  fontSize: '1.75rem',
                  color: 'var(--wine)',
                  lineHeight: 1
                }}
              >
                ${total.toLocaleString('es-CO')} <span style={{ fontSize: '0.84rem', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>COP</span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECCIÓN DIRECTA: PAGO Y SUBIDA DE COMPROBANTE                  */}
            {/* ============================================================== */}
            <div style={{
              marginTop: '20px',
              paddingTop: '18px',
              borderTop: '1.5px dashed rgba(123, 26, 16, 0.18)'
            }}>

              {/* Selector de métodos si hay varios */}
              {paymentMethods.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {paymentMethods.map(method => {
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '99px',
                          border: isSelected ? '2px solid var(--wine)' : '1.5px solid rgba(123, 26, 16, 0.15)',
                          background: isSelected ? 'var(--wine)' : '#FAF7F6',
                          color: isSelected ? 'var(--blush)' : 'var(--wine)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '38px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CreditCard size={14} />
                        <span>{method.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Caja del Medio de Pago Activo */}
              {selectedMethod && (
                <div style={{
                  background: '#FAF7F6',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(123, 26, 16, 0.12)',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{
                        background: 'var(--wine)',
                        color: 'var(--blush)',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.01em'
                      }}>
                        {selectedMethod.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#776', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif', fontWeight: 500 }}>
                        {selectedMethod.accountType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontSize: '1.45rem', 
                        fontWeight: 700, 
                        color: 'var(--wine)', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", system-ui, sans-serif',
                        letterSpacing: '0.01em',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {selectedMethod.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(selectedMethod.accountNumber)}
                        title="Copiar número"
                        style={{
                          background: copied ? '#E8F5E9' : '#ffffff',
                          border: copied ? '1.5px solid #4CAF50' : '1.5px solid rgba(123, 26, 16, 0.2)',
                          padding: '6px 14px',
                          borderRadius: '99px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif',
                          color: copied ? '#2E7D32' : 'var(--wine)',
                          fontWeight: 700,
                          minHeight: '36px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {copied ? <Check size={13} color="#2E7D32" /> : <Copy size={13} />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#665', marginTop: '3px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif' }}>
                      Titular: <strong style={{ color: 'var(--wine2)', fontWeight: 600 }}>{selectedMethod.holderName}</strong>
                    </div>
                  </div>

                  {/* QR si existe */}
                  {selectedMethod.qrImage && (
                    <div style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1.5px solid rgba(123, 26, 16, 0.15)',
                      background: '#fff',
                      flexShrink: 0,
                      margin: '0 auto'
                    }}>
                      <img 
                        src={selectedMethod.qrImage} 
                        alt="QR de pago" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Formulario de Carga del Comprobante */}
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }}
                />

                {/* Zona de Subida Compacta */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  style={{ 
                    border: file ? '1.5px solid #4CAF50' : '1.5px dashed rgba(123, 26, 16, 0.25)', 
                    borderRadius: '14px', 
                    padding: '14px 16px', 
                    textAlign: 'center',
                    background: file ? '#F4FBF4' : '#fff',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {!file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Upload size={20} color="var(--wine)" style={{ opacity: 0.85, flexShrink: 0 }} />
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--wine)', display: 'block' }}>
                          Adjuntar comprobante de pago
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#776' }}>
                          Toca para subir foto o captura (JPG o PNG)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                      {previewUrl && (
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #4CAF50',
                          flexShrink: 0
                        }}>
                          <img 
                            src={previewUrl} 
                            alt="Comprobante" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ color: '#2E7D32', fontWeight: 700, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} />
                          <span>Comprobante listo</span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#666', textDecoration: 'underline' }}>
                          Cambiar imagen
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Principal de Confirmación */}
                <button 
                  type="submit" 
                  style={{ 
                    background: 'var(--wine)', 
                    color: 'var(--blush)', 
                    padding: '14px 24px', 
                    fontSize: '1.05rem', 
                    borderRadius: '99px', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontFamily: 'Jost, sans-serif', 
                    fontWeight: 700,
                    boxShadow: '0 6px 20px rgba(123, 26, 16, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '50px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    width: '100%'
                  }}
                >
                  <span>Confirmar mi Pedido</span>
                  <ArrowRight size={18} />
                </button>
              </form>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;
