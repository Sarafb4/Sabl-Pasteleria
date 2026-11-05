import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrderStore, Order, OrderStatus } from '../store/orderStore';
import { Search, Package, Clock, CheckCircle, Truck, MapPin, Phone, ArrowLeft, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';

const STATUS_DETAILS: Record<OrderStatus, { bg: string; text: string; icon: any; desc: string }> = {
  'Pendiente de pago': {
    bg: '#fff3cd',
    text: '#856404',
    icon: Clock,
    desc: 'Estamos a la espera de tu comprobante de pago o confirmación bancaria.'
  },
  'Confirmado': {
    bg: '#d1ecf1',
    text: '#0c5460',
    icon: CheckCircle,
    desc: '¡Pago confirmado! Tu pedido ha sido agendado en nuestro horno.'
  },
  'En preparación': {
    bg: '#ffeeba',
    text: '#b86a04',
    icon: Package,
    desc: 'Nuestros pasteleros están horneando y decorando tus delicias.'
  },
  'En camino': {
    bg: '#e2e3e5',
    text: '#383d41',
    icon: Truck,
    desc: 'Tu pedido va en camino a tu dirección con nuestro mensajero.'
  },
  'Entregado': {
    bg: '#d4edda',
    text: '#155724',
    icon: CheckCircle,
    desc: '¡Pedido entregado con éxito! Esperamos que lo disfrutes.'
  }
};

const OrderStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('id') || searchParams.get('q') || '';
  const orders = useOrderStore(state => state.orders);
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  
  const [query, setQuery] = useState(initialQuery);
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, orders]);

  const handleSearch = (searchTerm: string) => {
    setSearched(true);
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setFoundOrders([]);
      return;
    }

    const cleanDigits = q.replace(/[^0-9]/g, '');

    const results = orders.filter(o => {
      const orderIdClean = o.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const qClean = q.replace(/[^a-z0-9]/g, '');
      
      // Coincidencia con ID de orden (ej. SAB-1024 o 1024)
      const matchesId = orderIdClean.includes(qClean) || (cleanDigits.length >= 3 && o.id.includes(cleanDigits));
      
      // Coincidencia con teléfono
      const phoneDigits = o.customer.phone.replace(/[^0-9]/g, '');
      const matchesPhone = cleanDigits.length >= 6 && (phoneDigits.includes(cleanDigits) || cleanDigits.includes(phoneDigits));
      
      // Coincidencia con correo
      const matchesEmail = o.customer.email.toLowerCase().includes(q);

      // Coincidencia con nombre
      const matchesName = o.customer.name.toLowerCase().includes(q);

      return matchesId || matchesPhone || matchesEmail || matchesName;
    });

    setFoundOrders(results);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting para evitar spam de consultas de pedidos (máx 10 búsquedas por 30 segundos)
    const rateLimit = checkRateLimit('order_search', 10, 30000);
    if (!rateLimit.allowed) {
      toast.error(`Has realizado demasiadas búsquedas seguidas. Espera ${rateLimit.retryAfterSec} segundos.`);
      return;
    }

    handleSearch(query);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine2)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: '130px', maxWidth: '780px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* Enlace volver */}
        <div style={{ marginBottom: '24px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--wine)', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: '0.95rem',
              background: 'rgba(123, 26, 16, 0.06)',
              padding: '8px 18px',
              borderRadius: '99px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver a la tienda</span>
          </Link>
        </div>

        {/* Encabezado con la tipografía oficial de Sablée */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.85rem' }}>
            Seguimiento de Compras
          </span>
          <h1 
            className="d"
            style={{ 
              color: 'var(--wine)', 
              fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', 
              margin: '8px 0 16px',
              lineHeight: 1.05
            }}
          >
            Rastrea tu Pedido
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#665', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
            Consulta el estado de tu orden en tiempo real ingresando tu <strong>número de orden</strong> (ej: SAB-1025), <strong>número de celular</strong> o <strong>correo electrónico</strong>.
          </p>
        </div>

        {/* Formulario de Búsqueda Integrado */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            background: '#ffffff', 
            borderRadius: '99px', 
            padding: '6px 8px 6px 20px', 
            boxShadow: '0 10px 30px rgba(123, 26, 16, 0.08)',
            border: '1.5px solid rgba(123, 26, 16, 0.15)',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Search size={22} color="var(--wine)" style={{ opacity: 0.7 }} />
            <input 
              type="text" 
              placeholder="Escribe tu ID (ej: SAB-1024), teléfono o correo..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
              style={{ 
                flex: 1, 
                border: 'none', 
                background: 'transparent', 
                outline: 'none', 
                fontSize: '1.05rem', 
                fontFamily: 'Jost, sans-serif',
                color: '#333'
              }}
            />
            <button 
              type="submit"
              style={{ 
                padding: '14px 28px', 
                borderRadius: '99px', 
                border: 'none', 
                background: 'var(--wine)', 
                color: 'var(--blush)', 
                cursor: 'pointer', 
                fontFamily: 'Jost, sans-serif', 
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(123, 26, 16, 0.25)',
                transition: 'transform 0.2s ease'
              }}
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Resultados de Búsqueda */}
        {searched && foundOrders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {foundOrders.length > 1 && (
              <p style={{ fontWeight: 600, color: 'var(--wine)', margin: '0 0 6px 4px' }}>
                Encontramos {foundOrders.length} pedidos asociados a tu búsqueda:
              </p>
            )}

            {foundOrders.map(order => {
              const statusCfg = STATUS_DETAILS[order.status] || STATUS_DETAILS['Pendiente de pago'];
              const StatusIcon = statusCfg.icon;

              return (
                <div 
                  key={order.id}
                  style={{ 
                    background: '#ffffff', 
                    padding: '36px', 
                    borderRadius: '28px', 
                    boxShadow: '0 12px 36px rgba(123, 26, 16, 0.08)', 
                    border: '1px solid rgba(123, 26, 16, 0.08)'
                  }}
                >
                  {/* Cabecera de la Orden */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '18px', marginBottom: '20px' }}>
                    <div>
                      <span className="lbl" style={{ color: '#888', fontSize: '0.8rem' }}>Número de Orden</span>
                      <h2 className="d" style={{ color: 'var(--wine)', fontSize: '1.8rem', margin: '2px 0 0' }}>
                        #{order.id}
                      </h2>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>Fecha de compra:</span>
                      <strong style={{ fontSize: '0.95rem', color: '#444' }}>{order.date}</strong>
                    </div>
                  </div>

                  {/* Estado Visual */}
                  <div style={{ 
                    background: statusCfg.bg, 
                    border: `1.5px solid ${statusCfg.text}30`, 
                    padding: '18px 22px', 
                    borderRadius: '20px', 
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px'
                  }}>
                    <div style={{ background: '#fff', borderRadius: '50%', padding: '8px', display: 'flex', color: statusCfg.text }}>
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: statusCfg.text }}>
                          Estado Actual
                        </span>
                        <span style={{ background: statusCfg.text, color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700 }}>
                          {order.status}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '0.95rem', color: statusCfg.text, lineHeight: 1.4 }}>
                        {statusCfg.desc}
                      </p>
                    </div>
                  </div>

                  {/* Datos del Cliente y Envío */}
                  <div style={{ background: '#faf7f8', padding: '18px 22px', borderRadius: '18px', marginBottom: '24px', fontSize: '0.95rem' }}>
                    <h4 style={{ margin: '0 0 10px', color: 'var(--wine)', fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: '1.1rem' }}>
                      Datos de Entrega
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: '#555' }}>
                      <div>
                        <strong>Cliente:</strong> {order.customer.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={15} color="var(--wine)" />
                        <span>{order.customer.phone}</span>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={15} color="var(--wine)" style={{ marginTop: '3px' }} />
                        <span>{order.customer.address} {order.customer.details ? `(${order.customer.details})` : ''} · {order.customer.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Productos y Total */}
                  <div style={{ borderTop: '1px dashed rgba(123, 26, 16, 0.15)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 12px', color: 'var(--wine)', fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: '1.15rem' }}>
                      Delicias en tu pedido:
                    </h4>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
                      {order.items.map((it, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f6f6f6', fontSize: '1rem' }}>
                          <span><strong>{it.quantity}x</strong> {it.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatCOP(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #eee' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--wine2)' }}>
                        Total Pagado:
                      </span>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--wine)' }}>
                        {formatCOP(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Botón de Ayuda por WhatsApp */}
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <a
                      href={`https://wa.me/${bakeryPhone}?text=${encodeURIComponent(`Hola Sablée Pastelería 🍰, tengo una consulta sobre mi orden #${order.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        color: 'var(--wine)',
                        border: '1.5px solid var(--wine)',
                        padding: '10px 22px',
                        borderRadius: '99px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>¿Dudas con tu entrega? Escríbenos a WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sin Resultados */}
        {searched && foundOrders.length === 0 && (
          <div style={{ 
            background: '#ffffff', 
            padding: '50px 30px', 
            borderRadius: '28px', 
            textAlign: 'center', 
            boxShadow: '0 10px 30px rgba(123, 26, 16, 0.06)' 
          }}>
            <Package size={48} style={{ color: 'var(--petal)', margin: '0 auto 16px' }} />
            <h3 className="d" style={{ fontSize: '1.6rem', color: 'var(--wine)', margin: '0 0 10px' }}>
              No encontramos órdenes para tu búsqueda
            </h3>
            <p style={{ color: '#665', fontSize: '1rem', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              No hay pedidos que coincidan con <strong>"{query}"</strong>. Revisa que el número de orden, teléfono o correo estén bien digitados.
            </p>
            <Link 
              to="/" 
              style={{ 
                display: 'inline-block',
                background: 'var(--wine)', 
                color: 'var(--blush)', 
                padding: '12px 28px', 
                borderRadius: '99px', 
                textDecoration: 'none', 
                fontWeight: 600 
              }}
            >
              Ir a la tienda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatusPage;
