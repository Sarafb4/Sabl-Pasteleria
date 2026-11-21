import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import { useMenuStore } from '../store/menuStore';
import { Dessert, Cookie, ArrowLeft } from 'lucide-react';
import CakeIcon from '../components/CakeIcon';

const PostresPage: React.FC = () => {
  const items = useMenuStore(state => state.items);
  const postres = items.filter(item => item.category === 'postres');
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: '115px', paddingLeft: 'clamp(14px, 4vw, 24px)', paddingRight: 'clamp(14px, 4vw, 24px)', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navegación de regreso */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '24px' }}>
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
              padding: '10px 18px',
              minHeight: '44px',
              borderRadius: '99px',
              touchAction: 'manipulation'
            }}
          >
            <ArrowLeft size={18} />
            <span>Volver al inicio</span>
          </Link>
        </div>

        {/* Tabs de Secciones */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
          <Link 
            to="/tortas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 18px', 
              minHeight: '44px',
              fontSize: '0.94rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              touchAction: 'manipulation',
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)'
            }}
          >
            <CakeIcon size={18} />
            <span>Tortas</span>
          </Link>

          <Link 
            to="/postres" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 18px', 
              minHeight: '44px',
              fontSize: '0.94rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              touchAction: 'manipulation',
              background: 'var(--wine)',
              color: 'var(--blush)',
              boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
            }}
          >
            <Dessert size={18} />
            <span>Postres</span>
          </Link>

          <Link 
            to="/galletas" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 18px', 
              minHeight: '44px',
              fontSize: '0.94rem',
              borderRadius: '99px', 
              textDecoration: 'none', 
              fontWeight: 600,
              touchAction: 'manipulation',
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)'
            }}
          >
            <Cookie size={18} />
            <span>Galletas</span>
          </Link>
        </div>

        {/* Encabezado */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="d" style={{ color: 'var(--wine)', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', margin: '0' }}>
            Nuestros Postres
          </h1>
        </div>

        {/* Grilla de Postres */}
        <div className="menu-products-grid">
          {postres.map((postre) => (
            <MenuItemCard key={postre.id} item={postre} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostresPage;

