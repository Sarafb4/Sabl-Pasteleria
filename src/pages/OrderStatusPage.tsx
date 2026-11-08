import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrderStore, Order, OrderStatus } from '../store/orderStore';
import { useCartStore } from '../store/cartStore';
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  MessageCircle, 
  AlertTriangle, 
  RotateCcw, 
  CreditCard,
  History,
  Eye,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';

const STATUS_DETAILS: Record<OrderStatus, { bg: string; text: string; icon: any; desc: string }> = {
  'Pendiente por validación': {
    bg: '#fef3c7',
    text: '#92400e',
    icon: Clock,
    desc: 'Comprobante recibido con éxito. Estamos validando la transferencia en nuestra cuenta bancaria.'
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
  },
  'Pago no validado': {
    bg: '#fee2e2',
    text: '#991b1b',
    icon: AlertTriangle,
    desc: 'El comprobante o pago no pudo ser validado (transferencia no recibida o datos no coincidentes).'
  }
};

const OrderStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('id') || searchParams.get('q') || '';
  const orders = useOrderStore(state => state.orders);
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  const reorderItems = useCartStore(state => state.reorderItems);
  
  const [query, setQuery] = useState(initialQuery);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [isAutoLoaded, setIsAutoLoaded] = useState(false);

  const mainCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      // Revisar si el usuario tiene pedidos previos guardados en este navegador
      try {
        const raw = localStorage.getItem('sablee_user_orders');
        if (raw) {
          const storedIds: string[] = JSON.parse(raw);
          if (storedIds.length > 0) {
            handleSearch(storedIds[0], true);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [initialQuery, orders]);

  const handleSearch = (searchTerm: string, autoFromStorage = false) => {
    setSearched(true);
    setIsAutoLoaded(autoFromStorage);
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setCustomerOrders([]);
      setSelectedOrderId(null);
      return;
    }

    const cleanDigits = q.replace(/[^0-9]/g, '');

    // 1. Encontrar coincidencias directas con el término buscado
    const directMatches = orders.filter(o => {
      const orderIdClean = o.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const qClean = q.replace(/[^a-z0-9]/g, '');
      
      const matchesId = orderIdClean.includes(qClean) || (cleanDigits.length >= 3 && o.id.includes(cleanDigits));
      const phoneDigits = o.customer.phone.replace(/[^0-9]/g, '');
      const matchesPhone = cleanDigits.length >= 6 && (phoneDigits.includes(cleanDigits) || cleanDigits.includes(phoneDigits));
      const matchesEmail = o.customer.email.toLowerCase().includes(q);
      const matchesName = o.customer.name.toLowerCase().includes(q);

      return matchesId || matchesPhone || matchesEmail || matchesName;
    });

    if (directMatches.length === 0) {
      setCustomerOrders([]);
      setSelectedOrderId(null);
      return;
    }

    // 2. Extraer datos de identidad del cliente (teléfonos, correos, y pedidos en localStorage)
    const customerPhones = new Set<string>();
    const customerEmails = new Set<string>();
    const knownOrderIds = new Set<string>();

    try {
      const raw = localStorage.getItem('sablee_user_orders');
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        ids.forEach(id => knownOrderIds.add(id.toLowerCase()));
      }
    } catch {}

    directMatches.forEach(o => {
      const p = o.customer.phone.replace(/[^0-9]/g, '');
      if (p.length >= 7) customerPhones.add(p);
      if (o.customer.email && o.customer.email.includes('@')) {
        customerEmails.add(o.customer.email.toLowerCase().trim());
      }
      knownOrderIds.add(o.id.toLowerCase());
    });

    // 3. Vincular TODOS los pedidos antes hechos por este mismo usuario
    const allUserOrders = orders.filter(o => {
      const p = o.customer.phone.replace(/[^0-9]/g, '');
      const email = o.customer.email.toLowerCase().trim();
      const idClean = o.id.toLowerCase();

      const phoneMatch = customerPhones.size > 0 && Array.from(customerPhones).some(cp => p.includes(cp) || cp.includes(p));
      const emailMatch = customerEmails.size > 0 && Array.from(customerEmails).some(ce => ce === email);
      const idMatch = knownOrderIds.has(idClean);

      return phoneMatch || emailMatch || idMatch;
    });

    // Guardar los IDs en localStorage para facilitar seguimiento futuro
    try {
      const raw = localStorage.getItem('sablee_user_orders');
      const list: string[] = raw ? JSON.parse(raw) : [];
      allUserOrders.forEach(o => {
        if (!list.includes(o.id)) list.push(o.id);
      });
      localStorage.setItem('sablee_user_orders', JSON.stringify(list));
    } catch {}

    setCustomerOrders(allUserOrders);

    // Determinar cuál orden mostrar destacada al inicio:
    // Si el usuario buscó un ID exacto, mostrar esa; si no, la más reciente (o mantener la que ya estaba seleccionada)
    const exactIdMatch = directMatches.find(o => o.id.toLowerCase() === q.replace(/[^a-z0-9-]/g, ''));
    if (exactIdMatch) {
      setSelectedOrderId(exactIdMatch.id);
    } else if (allUserOrders.length > 0) {
      setSelectedOrderId(prev => (prev && allUserOrders.some(o => o.id === prev) ? prev : allUserOrders[0].id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rateLimit = checkRateLimit('order_search', 10, 30000);
    if (!rateLimit.allowed) {
      toast.error(`Has realizado demasiadas búsquedas seguidas. Espera ${rateLimit.retryAfterSec} segundos.`);
      return;
    }

    handleSearch(query, false);
  };

  const selectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setTimeout(() => {
      mainCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const activeOrder = customerOrders.find(o => o.id === selectedOrderId) || customerOrders[0];
  const pastOrders = customerOrders.filter(o => o.id !== activeOrder?.id);

  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine2)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: '130px', maxWidth: '820px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>
        
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
              borderRadius: '99px',
              transition: 'background 0.2s ease'
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
          <p style={{ fontSize: '1.05rem', color: '#665', maxWidth: '540px', margin: '0 auto', lineHeight: 1.5 }}>
            Consulta el estado de tu orden en tiempo real con tu <strong>número de orden</strong> (ej: SAB-1025), <strong>celular</strong> o <strong>correo</strong>.
          </p>
        </div>

        {/* Formulario de Búsqueda Integrado */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
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
              placeholder="Escribe tu ID (ej: SAB-1025), teléfono o correo..." 
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

        {/* Notificación de carga automática en el dispositivo */}
        {isAutoLoaded && customerOrders.length > 0 && (
          <div style={{
            background: 'rgba(123, 26, 16, 0.06)',
            border: '1px solid rgba(123, 26, 16, 0.12)',
            borderRadius: '16px',
            padding: '12px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.9rem',
            color: 'var(--wine)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} />
              <span>Detectamos automáticamente tus pedidos realizados en este dispositivo.</span>
            </div>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCustomerOrders([]);
                  setSearched(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--wine)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Banner de Bienvenida y Selector Rápido de Pedidos */}
        {searched && customerOrders.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {customerOrders.length > 1 && (
              <div style={{ 
                background: '#ffffff', 
                padding: '18px 22px', 
                borderRadius: '20px', 
                border: '1px solid rgba(123, 26, 16, 0.08)',
                boxShadow: '0 4px 16px rgba(123, 26, 16, 0.04)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} color="var(--wine)" />
                    <span style={{ fontWeight: 700, color: 'var(--wine)', fontSize: '1.05rem' }}>
                      Historial de compras ({customerOrders.length} pedidos encontrados)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#777' }}>
                    Cliente: <strong>{activeOrder.customer.name}</strong>
                  </span>
                </div>

                {/* Chips / Pills para alternar entre pedidos */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {customerOrders.map((order, idx) => {
                    const isSelected = order.id === activeOrder.id;
                    const statusCfg = STATUS_DETAILS[order.status] || STATUS_DETAILS['Pendiente por validación'];
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => selectOrder(order.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '99px',
                          border: isSelected ? '1.5px solid var(--wine)' : '1px solid rgba(123, 26, 16, 0.15)',
                          background: isSelected ? 'var(--wine)' : '#ffffff',
                          color: isSelected ? 'var(--blush)' : 'var(--wine)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.88rem',
                          whiteSpace: 'nowrap',
                          boxShadow: isSelected ? '0 4px 12px rgba(123, 26, 16, 0.2)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: isSelected ? 'var(--blush)' : statusCfg.text 
                        }} />
                        <span>#{order.id}</span>
                        <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: '0.8rem' }}>
                          · {order.status}
                        </span>
                        {idx === 0 && (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            padding: '2px 6px', 
                            borderRadius: '99px', 
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(123, 26, 16, 0.08)',
                            fontWeight: 700 
                          }}>
                            Más reciente
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tarjeta Principal del Pedido Seleccionado */}
            {activeOrder && (
              <div 
                ref={mainCardRef}
                style={{ 
                  background: '#ffffff', 
                  padding: '36px', 
                  borderRadius: '28px', 
                  boxShadow: '0 12px 36px rgba(123, 26, 16, 0.08)', 
                  border: '1px solid rgba(123, 26, 16, 0.08)',
                  marginBottom: '32px'
                }}
              >
                {/* Cabecera de la Orden */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '18px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="lbl" style={{ color: '#888', fontSize: '0.8rem' }}>Número de Orden</span>
                      {customerOrders.length > 1 && (
                        <span style={{ background: 'rgba(123, 26, 16, 0.08)', color: 'var(--wine)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>
                          {activeOrder.id === customerOrders[0].id ? 'Pedido más reciente' : 'Pedido seleccionado'}
                        </span>
                      )}
                    </div>
                    <h2 className="d" style={{ color: 'var(--wine)', fontSize: '1.9rem', margin: '2px 0 0' }}>
                      #{activeOrder.id}
                    </h2>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>Fecha de compra:</span>
                    <strong style={{ fontSize: '0.95rem', color: '#444' }}>{activeOrder.date}</strong>
                  </div>
                </div>

                {/* Estado Visual */}
                {(() => {
                  const statusCfg = STATUS_DETAILS[activeOrder.status] || STATUS_DETAILS['Pendiente por validación'];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div style={{ 
                      background: statusCfg.bg, 
                      border: `1.5px solid ${statusCfg.text}30`, 
                      padding: '20px 24px', 
                      borderRadius: '20px', 
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px'
                    }}>
                      <div style={{ background: '#fff', borderRadius: '50%', padding: '9px', display: 'flex', color: statusCfg.text, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <StatusIcon size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: statusCfg.text }}>
                            Estado Actual
                          </span>
                          <span style={{ background: statusCfg.text, color: '#fff', padding: '3px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700 }}>
                            {activeOrder.status}
                          </span>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: '0.96rem', color: statusCfg.text, lineHeight: 1.45 }}>
                          {statusCfg.desc}
                        </p>

                        {/* Botones de acción cuando el pago no fue validado */}
                        {activeOrder.status === 'Pago no validado' && (
                          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                reorderItems(activeOrder.items);
                                toast.success('¡Productos cargados en tu horno! Puedes revisar tu pedido y proceder.');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--wine, #7B1A10)',
                                color: 'var(--blush, #FFF0F3)',
                                padding: '10px 22px',
                                borderRadius: '99px',
                                border: 'none',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(123, 26, 16, 0.25)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <RotateCcw size={16} />
                              <span>Volver a hacer pedido</span>
                            </button>

                            <Link
                              to={`/payment?id=${activeOrder.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#ffffff',
                                color: '#991b1b',
                                border: '1.5px solid #991b1b',
                                padding: '10px 18px',
                                borderRadius: '99px',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                              }}
                            >
                              <CreditCard size={16} />
                              <span>Subir nuevo comprobante</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Datos del Cliente y Envío */}
                <div style={{ background: '#faf7f8', padding: '18px 22px', borderRadius: '18px', marginBottom: '24px', fontSize: '0.95rem' }}>
                  <h4 style={{ margin: '0 0 10px', color: 'var(--wine)', fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: '1.1rem' }}>
                    Datos de Entrega
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: '#555' }}>
                    <div>
                      <strong>Cliente:</strong> {activeOrder.customer.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={15} color="var(--wine)" />
                      <span>{activeOrder.customer.phone}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <MapPin size={15} color="var(--wine)" style={{ marginTop: '3px' }} />
                      <span>{activeOrder.customer.address} {activeOrder.customer.details ? `(${activeOrder.customer.details})` : ''} · {activeOrder.customer.city}</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Productos y Total */}
                <div style={{ borderTop: '1px dashed rgba(123, 26, 16, 0.15)', paddingTop: '20px' }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--wine)', fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: '1.15rem' }}>
                    Delicias en tu pedido:
                  </h4>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
                    {activeOrder.items.map((it, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f6f6f6', fontSize: '1rem' }}>
                        <span><strong>{it.quantity}x</strong> {it.name}</span>
                        <span style={{ fontWeight: 600 }}>{formatCOP(it.price * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #eee' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--wine2)' }}>
                      Total del Pedido:
                    </span>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--wine)' }}>
                      {formatCOP(activeOrder.total)}
                    </span>
                  </div>
                </div>

                {/* Botón de Ayuda por WhatsApp */}
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <a
                    href={`https://wa.me/${bakeryPhone}?text=${encodeURIComponent(`Hola Sablée Pastelería 🍰, tengo una consulta sobre mi orden #${activeOrder.id}`)}`}
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
            )}

            {/* SECCIÓN: Historial de Pedidos Anteriores */}
            {pastOrders.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={20} color="var(--wine)" />
                    <h3 className="d" style={{ color: 'var(--wine)', fontSize: '1.7rem', margin: 0 }}>
                      Tus otros pedidos realizados
                    </h3>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.95rem', color: '#666' }}>
                    Puedes consultar el estado de cada uno o volver a pedir tus productos favoritos con un solo clic.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pastOrders.map(order => {
                    const statusCfg = STATUS_DETAILS[order.status] || STATUS_DETAILS['Pendiente por validación'];
                    const StatusIcon = statusCfg.icon;

                    return (
                      <div
                        key={order.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '22px',
                          padding: '24px',
                          border: '1px solid rgba(123, 26, 16, 0.1)',
                          boxShadow: '0 4px 16px rgba(123, 26, 16, 0.04)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f6f6f6', paddingBottom: '14px', marginBottom: '14px' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Código de orden</span>
                            <span className="d" style={{ fontSize: '1.4rem', color: 'var(--wine)', fontWeight: 700 }}>
                              #{order.id}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#777', marginLeft: '10px' }}>
                              ({order.date})
                            </span>
                          </div>

                          {/* Badge de estado */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: statusCfg.bg,
                            color: statusCfg.text,
                            padding: '6px 14px',
                            borderRadius: '99px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: `1px solid ${statusCfg.text}30`
                          }}>
                            <StatusIcon size={15} />
                            <span>{order.status}</span>
                          </div>
                        </div>

                        {/* Resumen de delicias */}
                        <div style={{ marginBottom: '16px', fontSize: '0.93rem', color: '#555' }}>
                          <span style={{ fontWeight: 600, color: 'var(--wine2)', display: 'block', marginBottom: '4px' }}>
                            Productos:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {order.items.map((it, idx) => (
                              <span 
                                key={idx} 
                                style={{ 
                                  background: 'rgba(123, 26, 16, 0.05)', 
                                  padding: '4px 10px', 
                                  borderRadius: '8px', 
                                  fontSize: '0.88rem' 
                                }}
                              >
                                <strong>{it.quantity}x</strong> {it.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Total y Botones de acción */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px dashed #eee' }}>
                          <div>
                            <span style={{ fontSize: '0.82rem', color: '#888', display: 'block' }}>Total pagado</span>
                            <strong style={{ fontSize: '1.25rem', color: 'var(--wine)' }}>{formatCOP(order.total)}</strong>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => selectOrder(order.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                color: 'var(--wine)',
                                border: '1.5px solid var(--wine)',
                                padding: '8px 18px',
                                borderRadius: '99px',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Eye size={15} />
                              <span>Ver seguimiento</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                reorderItems(order.items);
                                toast.success(`¡Productos de la orden #${order.id} añadidos a tu horno!`);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'var(--wine)',
                                color: 'var(--blush)',
                                border: 'none',
                                padding: '8px 18px',
                                borderRadius: '99px',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(123, 26, 16, 0.2)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <RotateCcw size={15} />
                              <span>Volver a pedir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sin Resultados */}
        {searched && customerOrders.length === 0 && (
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
