import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItemCard from '../components/MenuItemCard';
import QuoteCakeSection from '../components/QuoteCakeSection';
import { useMenuStore } from '../store/menuStore';
import { Cake, Dessert, Cookie, ArrowLeft, Sparkles } from 'lucide-react';

const TortasPage: React.FC = () => {
  const items = useMenuStore(state => state.items);
  const tortas = items.filter(item => item.category === 'tortas');
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)', paddingBottom: '100px' }}>
      <Header />
      
      <div style={{ paddingTop: '140px', paddingLeft: '24px', paddingRight: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navegación de regreso y botón cotizar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
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

          <div>
            <a 
              href="#cotizar" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'var(--blush)', 
                textDecoration: 'none', 
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'var(--wine)',
                padding: '8px 18px',
                borderRadius: '99px',
                boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
              }}
            >
              <Sparkles size={16} />
              <span>Cotizar Torta Personalizada o a tu Antojo</span>
            </a>
          </div>
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
              background: 'var(--wine)',
              color: 'var(--blush)',
              boxShadow: '0 4px 12px rgba(123, 26, 16, 0.2)'
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
              background: '#fff',
              color: 'var(--wine)',
              border: '1px solid rgba(123, 26, 16, 0.15)'
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
            Nuestras Tortas
          </h1>
          <p style={{ fontSize: '1.2rem', maxWidth: '42rem', color: '#554', lineHeight: 1.5 }}>
            Recetas caseras preparadas con ingredientes de alta repostería. Selecciona la presentación según el número de porciones que necesites para tu celebración.
          </p>
        </div>

        {/* Grilla de Tortas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '28px' 
        }}>
          {tortas.map((torta) => (
            <MenuItemCard key={torta.id} item={torta} />
          ))}
        </div>
      </div>

      {/* Sección para Cotizar Tortas Personalizadas */}
      <div style={{ marginTop: '60px' }}>
        <QuoteCakeSection />
      </div>
    </div>
  );
};

export default TortasPage;
