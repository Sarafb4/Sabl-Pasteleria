import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import QuoteCakeSection from '../components/QuoteCakeSection';
import { useMenuStore } from '../store/menuStore';
import { Dessert, Cookie, ArrowLeft, Sparkles } from 'lucide-react';
import CakeIcon from '../components/CakeIcon';

const TortasPage: React.FC = () => {
  const items = useMenuStore(state => state.items);
  const tortas = items.filter(item => item.category === 'tortas');
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: 'calc(75px + env(safe-area-inset-top, 0px))', paddingLeft: 'clamp(14px, 4vw, 24px)', paddingRight: 'clamp(14px, 4vw, 24px)', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navegación de regreso y botón cotizar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '10px', marginBottom: '18px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--wine)', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: '0.92rem',
              background: 'rgba(123, 26, 16, 0.07)',
              padding: '8px 16px',
              minHeight: '40px',
              borderRadius: '99px',
              touchAction: 'manipulation'
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver al inicio</span>
          </Link>

          <div>
            <a 
              href="#cotizar" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                color: 'var(--blush)', 
                textDecoration: 'none', 
                fontWeight: 600,
                fontSize: '0.85rem',
                background: 'var(--wine)',
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '99px',
                touchAction: 'manipulation',
                boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
              }}
            >
              <Sparkles size={15} />
              <span>Cotizar a tu Antojo</span>
            </a>
          </div>
        </div>

        {/* Tabs de Secciones Flotante (Sticky) */}
        <div className="sticky-categories-bar">
          <Link 
            to="/tortas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 18px', 
              minHeight: '40px',
              fontSize: '0.92rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 700,
              touchAction: 'manipulation',
              background: 'var(--wine)',
              color: 'var(--blush)',
              boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            <CakeIcon size={16} />
            <span>Tortas</span>
          </Link>

          <Link 
            to="/postres" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              minHeight: '40px',
              fontSize: '0.92rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              touchAction: 'manipulation',
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)',
              whiteSpace: 'nowrap'
            }}
          >
            <Dessert size={16} />
            <span>Postres</span>
          </Link>

          <Link 
            to="/galletas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              minHeight: '40px',
              fontSize: '0.92rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              touchAction: 'manipulation',
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)',
              whiteSpace: 'nowrap'
            }}
          >
            <Cookie size={16} />
            <span>Galletas</span>
          </Link>
        </div>

        {/* Encabezado limpio */}
        <div style={{ marginBottom: '20px' }}>
          <h1 className="d" style={{ color: 'var(--wine)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', margin: '0' }}>
            Nuestras Tortas
          </h1>
        </div>

        {/* Grilla de Tortas */}
        <div className="menu-products-grid">
          {tortas.map((torta) => (
            <MenuItemCard key={torta.id} item={torta} />
          ))}
        </div>
      </div>

      {/* Sección para Cotizar Tortas Personalizadas */}
      <div style={{ marginTop: '50px' }}>
        <QuoteCakeSection />
      </div>
    </div>
  );
};

export default TortasPage;
