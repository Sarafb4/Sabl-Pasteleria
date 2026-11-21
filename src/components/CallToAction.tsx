import React from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';

const CallToAction: React.FC = () => {
  const toggleCart = useCartStore(state => state.toggleCart);
  const schedule = useOrderStore(state => state.schedule);

  // Texto dinámico configurado por la dueña en el Panel de Administración
  const scheduleText = schedule?.footerText?.trim()
    ? schedule.footerText
    : (schedule?.isOpen 
        ? `Abierto: ${schedule.weekdays} · ${schedule.saturdays}`
        : `En descanso · Abrimos: ${schedule.weekdays}`);

  return (
    <section className="s g" style={{ '--bg': 'var(--blush)', color: 'var(--wine)', textAlign: 'center', paddingTop: '130px' } as any}>
      <h2 id="h3" className="d" style={{ fontSize: 'clamp(3.4rem,13vw,10rem)' }}>¿Hambre?</h2>
      <button 
        onClick={toggleCart}
        style={{ background: 'var(--wine)', color: 'var(--blush)', fontSize: '1.5rem', padding: '20px 60px', minHeight: '56px', marginTop: '40px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        Pedir
      </button>
      <p className="lbl" style={{ marginTop: '80px', fontSize: '.95rem', textTransform: 'uppercase' }}>
        Sablée Pastelería · {scheduleText}
      </p>
      <div style={{ marginTop: '20px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Link to="/order-status" style={{ color: 'var(--wine)', fontWeight: 600, textDecoration: 'underline', fontSize: '0.95rem', padding: '10px 12px', display: 'inline-block', touchAction: 'manipulation' }}>Rastrear mi Pedido</Link>
        <Link to="/privacy-policy" style={{ color: 'var(--wine)', textDecoration: 'underline', fontSize: '0.9rem', padding: '10px 12px', display: 'inline-block', touchAction: 'manipulation' }}>Política de Privacidad</Link>
        <Link to="/terms" style={{ color: 'var(--wine)', textDecoration: 'underline', fontSize: '0.9rem', padding: '10px 12px', display: 'inline-block', touchAction: 'manipulation' }}>Términos y Condiciones</Link>
      </div>
    </section>
  );
};

export default CallToAction;
