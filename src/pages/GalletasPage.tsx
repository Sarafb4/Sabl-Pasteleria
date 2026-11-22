import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import { useMenuStore } from '../store/menuStore';
import { Dessert, Cookie, ArrowLeft } from 'lucide-react';
import CakeIcon from '../components/CakeIcon';

const GalletasPage: React.FC = () => {
  const items = useMenuStore(state => state.items);
  const galletas = items.filter(item => item.category === 'galletas');
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: 'calc(75px + env(safe-area-inset-top, 0px))', paddingLeft: 'clamp(14px, 4vw, 24px)', paddingRight: 'clamp(14px, 4vw, 24px)', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navegación de regreso */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '10px', marginBottom: '18px' }}>
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
        </div>

        {/* Tabs de Secciones Flotante (Sticky) */}
        <div className="sticky-categories-bar">
          <Link 
            to="/tortas" 
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
            <Cookie size={16} />
            <span>Galletas</span>
          </Link>
        </div>

        {/* Encabezado limpio */}
        <div style={{ marginBottom: '20px' }}>
          <h1 className="d" style={{ color: 'var(--wine)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', margin: '0' }}>
            Nuestras Galletas
          </h1>
        </div>

        {/* Grilla de Galletas */}
        <div className="menu-products-grid">
          {galletas.map((galleta) => (
            <MenuItemCard key={galleta.id} item={galleta} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalletasPage;
