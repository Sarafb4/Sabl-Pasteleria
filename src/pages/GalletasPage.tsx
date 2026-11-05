import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import { useMenuStore } from '../store/menuStore';
import { Cake, Dessert, Cookie, ArrowLeft } from 'lucide-react';

const GalletasPage: React.FC = () => {
  const items = useMenuStore(state => state.items);
  const galletas = items.filter(item => item.category === 'galletas');
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: '140px', paddingLeft: '24px', paddingRight: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navegación de regreso */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '30px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--wine)', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: '1rem',
              background: 'rgba(123, 26, 16, 0.06)',
              padding: '8px 18px',
              borderRadius: '99px'
            }}
          >
            <ArrowLeft size={18} />
            <span>Volver al inicio</span>
          </Link>
        </div>

        {/* Tabs de Secciones */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '8px' }}>
          <Link 
            to="/tortas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 24px', 
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)'
            }}
          >
            <Cake size={20} />
            <span>Tortas</span>
          </Link>

          <Link 
            to="/postres" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 24px', 
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)'
            }}
          >
            <Dessert size={20} />
            <span>Postres</span>
          </Link>

          <Link 
            to="/galletas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 24px', 
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              background: 'var(--wine)',
              color: 'var(--blush)',
              boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
            }}
          >
            <Cookie size={20} />
            <span>Galletas</span>
          </Link>
        </div>

        {/* Encabezado */}
        <div style={{ marginBottom: '50px' }}>
          <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.95rem' }}>Menú Oficial Sablée</span>
          <h1 className="d" style={{ color: 'var(--wine)', fontSize: 'clamp(3rem, 7vw, 5rem)', marginTop: '8px', marginBottom: '16px' }}>
            Nuestras Galletas
          </h1>
          <p style={{ fontSize: '1.2rem', maxWidth: '42rem', color: '#554', lineHeight: 1.5 }}>
            Galletas estilo New York horneadas todos los días: Nutella, Red Velvet y Oreo. Pídelas individuales ($8.000), en combo 3x ($22.000) o caja de 6x ($45.000).
          </p>
        </div>

        {/* Grilla de Galletas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '28px' 
        }}>
          {galletas.map((galleta) => (
            <MenuItemCard key={galleta.id} item={galleta} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalletasPage;
