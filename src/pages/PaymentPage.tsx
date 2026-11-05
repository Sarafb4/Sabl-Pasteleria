import React, { useState } from 'react';
import Header from '../components/Header';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { usePaymentStore } from '../store/paymentStore';
import { QrCode, Copy, Check, Upload, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentPage: React.FC = () => {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const attachReceipt = useOrderStore(state => state.attachReceipt);
  const allPaymentMethods = usePaymentStore(state => state.methods);
  const paymentMethods = allPaymentMethods.filter(m => m.enabled);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id') || 'SAB-1024';
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  // Seleccionar por defecto el primer medio de pago activo
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods.length > 0 ? paymentMethods[0].id : ''
  );

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];
  const total = getTotalPrice();

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success('¡Número copiado al portapapeles!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Por favor adjunta la foto o captura de tu comprobante de pago.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen supera 5MB. Por favor sube una captura más ligera o envíala directamente a nuestro WhatsApp.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        attachReceipt(orderId, base64);
        toast.success('¡Pago y comprobante recibidos con éxito! La orden está en proceso.');
        clearCart();
        navigate(`/order-status?id=${orderId}`);
      } catch (err) {
        console.error('[Error al guardar comprobante]:', err);
        toast.error('No pudimos guardar el comprobante. Puedes enviarlo directamente a nuestro WhatsApp (312 547 3848).');
      }
    };
    reader.onerror = () => {
      toast.error('Ocurrió un inconveniente al leer la foto. Intenta con otra imagen en formato JPG o PNG.');
    };
    reader.readAsDataURL(file);
  };

  if (items.length === 0) {
    return (
      <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
        <Header />
        <div style={{ paddingTop: '150px', textAlign: 'center' }}>
          <h2 className="d">No hay pedidos pendientes</h2>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px', borderRadius: '99px', border: 'none', background: 'var(--wine)', color: 'var(--blush)', cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Volver a la tienda</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine2)', paddingBottom: '80px' }}>
      <Header />
      <div style={{ paddingTop: '140px', maxWidth: '780px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.85rem' }}>
            Orden #{orderId}
          </span>
          <h1 
            className="d"
            style={{ 
              color: 'var(--wine)', 
              fontSize: 'clamp(2.4rem, 6vw, 3.6rem)', 
              margin: '8px 0 14px',
              lineHeight: 1.05
            }}
          >
            Completa tu Pago
          </h1>
          <p style={{ color: '#665', fontSize: '1.05rem', margin: 0 }}>
            Transfiere el valor exacto de tu pedido a través de tu app favorita y sube tu comprobante.
          </p>
        </div>

        {/* Tarjeta Principal */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '32px', 
          padding: '36px', 
          boxShadow: '0 12px 36px rgba(123, 26, 16, 0.08)',
          border: '1px solid rgba(123, 26, 16, 0.08)'
        }}>

          {/* Monto a Transferir Destacado */}
          <div style={{ 
            background: 'var(--petal)', 
            borderRadius: '20px', 
            padding: '20px', 
            textAlign: 'center', 
            marginBottom: '28px' 
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--wine)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Total exacto a transferir
            </span>
            <div style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontFamily: 'Jost, sans-serif', fontWeight: 700, color: 'var(--wine)', marginTop: '4px' }}>
              ${total.toLocaleString('es-CO')} <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>COP</span>
            </div>
          </div>

          {/* Selector de Medios de Pago */}
          {paymentMethods.length > 0 ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--wine)', marginBottom: '12px' }}>
                Selecciona tu medio de pago:
              </label>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {paymentMethods.map(method => {
                  const isSelected = selectedMethod?.id === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '99px',
                        border: isSelected ? '2px solid var(--wine)' : '1px solid #ddd',
                        background: isSelected ? 'var(--wine)' : '#fafafa',
                        color: isSelected ? 'var(--blush)' : 'var(--wine2)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CreditCard size={16} />
                      <span>{method.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Detalle del Medio de Pago Seleccionado */}
              {selectedMethod && (
                <div style={{ 
                  border: '1.5px solid rgba(123, 26, 16, 0.15)', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  marginBottom: '32px',
                  background: '#faf7f8'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: selectedMethod.qrImage ? '1fr 180px' : '1fr', gap: '24px', alignItems: 'center' }}>
                    
                    {/* Datos de la Cuenta */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ background: 'var(--petal)', color: 'var(--wine)', padding: '3px 10px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700 }}>
                          {selectedMethod.bank}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>{selectedMethod.accountType}</span>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Número de Cuenta / Celular:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--wine)', letterSpacing: '0.02em' }}>
                            {selectedMethod.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyNumber(selectedMethod.accountNumber)}
                            title="Copiar número"
                            style={{
                              background: '#fff',
                              border: '1px solid #ccc',
                              padding: '6px 12px',
                              borderRadius: '99px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.82rem',
                              color: 'var(--wine)',
                              fontWeight: 600
                            }}
                          >
                            {copied ? <Check size={14} color="green" /> : <Copy size={14} />}
                            <span>{copied ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#555' }}>
                        <span>Titular: <strong>{selectedMethod.holderName}</strong></span>
                        {selectedMethod.holderId && <span style={{ marginLeft: '10px' }}>(NIT/CC: {selectedMethod.holderId})</span>}
                      </div>

                      {selectedMethod.instructions && (
                        <p style={{ marginTop: '12px', fontSize: '0.88rem', color: '#666', lineHeight: 1.4, background: '#fff', padding: '10px 14px', borderRadius: '12px' }}>
                          ℹ️ {selectedMethod.instructions}
                        </p>
                      )}
                    </div>

                    {/* Código QR si existe */}
                    {selectedMethod.qrImage ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          width: '170px', 
                          height: '170px', 
                          borderRadius: '16px', 
                          overflow: 'hidden', 
                          border: '2px solid rgba(123, 26, 16, 0.2)',
                          margin: '0 auto',
                          background: '#fff',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
                        }}>
                          <img 
                            src={selectedMethod.qrImage} 
                            alt={`QR de pago ${selectedMethod.name}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#888', display: 'block', marginTop: '6px' }}>
                          Escanea desde tu app
                        </span>
                      </div>
                    ) : (
                      <div style={{ 
                        width: '160px', 
                        height: '160px', 
                        borderRadius: '16px', 
                        border: '2px dashed rgba(123, 26, 16, 0.2)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto',
                        background: '#ffffff',
                        padding: '12px',
                        textAlign: 'center'
                      }}>
                        <QrCode size={36} color="var(--wine)" style={{ opacity: 0.5, marginBottom: '6px' }} />
                        <span style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.2 }}>
                          Usa el número de cuenta arriba
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', background: '#faf7f8', borderRadius: '20px', marginBottom: '28px' }}>
              <p style={{ color: '#777', margin: 0 }}>No hay medios de pago activos en este momento.</p>
            </div>
          )}

          {/* Formulario de Subida de Comprobante */}
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              border: '2px dashed rgba(123, 26, 16, 0.25)', 
              borderRadius: '20px', 
              padding: '28px', 
              textAlign: 'center',
              background: '#fafafa',
              transition: 'background 0.2s ease'
            }}>
              <Upload size={36} color="var(--wine)" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '1.05rem', color: 'var(--wine)' }}>
                Adjunta tu Comprobante de Pago
              </label>
              <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 16px 0' }}>
                Captura de pantalla de la transferencia exitosa (PNG, JPG)
              </p>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                required 
                style={{ fontSize: '0.95rem' }}
              />

              {file && (
                <div style={{ marginTop: '12px', color: '#155724', fontWeight: 600, fontSize: '0.9rem' }}>
                  ✓ Archivo seleccionado: {file.name}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              style={{ 
                background: 'var(--wine)', 
                color: 'var(--blush)', 
                padding: '16px 40px', 
                fontSize: '1.15rem', 
                borderRadius: '99px', 
                border: 'none', 
                cursor: 'pointer', 
                fontFamily: 'Jost, sans-serif', 
                fontWeight: 600,
                boxShadow: '0 6px 18px rgba(123, 26, 16, 0.25)',
                transition: 'transform 0.2s ease'
              }}
            >
              Confirmar y Enviar Comprobante
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
