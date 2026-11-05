import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { Plus, ArrowRight, Cake, Dessert, Cookie } from 'lucide-react';
import toast from 'react-hot-toast';
import './ProductCard.css';

export interface ProductProps {
  name: string;
  desc: string;
  price?: number;
  bg: string;
  color: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isCategory?: boolean;
  img?: string;
}

const ProductCard: React.FC<ProductProps> = ({ name, desc, price = 10, bg, color, label, href = "#", icon, isCategory = false, img }) => {
  const addItem = useCartStore(state => state.addItem);
  const navigate = useNavigate();

  const categoryInitial = name ? name.trim()[0].toUpperCase() : '';

  // Contraste óptimo para el icono dentro del botón circular ("galleta")
  const isLightButton = color.includes('blush') || color.includes('petal') || color.includes('fff');
  const iconStrokeColor = isLightButton ? '#7B1A10' : '#FFF0F3';

  const renderCategoryIcon = () => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('torta')) return <Cake size={24} strokeWidth={2.4} color={iconStrokeColor} style={{ display: 'block', width: 24, height: 24 }} />;
    if (lower.includes('galleta')) return <Cookie size={24} strokeWidth={2.4} color={iconStrokeColor} style={{ display: 'block', width: 24, height: 24 }} />;
    if (lower.includes('postre')) return <Dessert size={24} strokeWidth={2.4} color={iconStrokeColor} style={{ display: 'block', width: 24, height: 24 }} />;
    if (icon) return icon;
    return <ArrowRight size={24} strokeWidth={2.4} color={iconStrokeColor} style={{ display: 'block', width: 24, height: 24 }} />;
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCategory) {
      navigate(href);
    } else {
      addItem({ name, price, bg, color });
      toast.success(`¡${name} agregado al horno!`);
    }
  };

  return (
    <article className="card" style={{
      background: img ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%), url(${img}) center/cover no-repeat` : bg,
      color: img ? '#fff' : color
    }}>
      <Link to={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
        <span className="l d" style={{ color: img ? '#ffffff30' : undefined }}>
          {isCategory ? categoryInitial : (label ? label[0] : '')}
        </span>
        <h3 className="d">{name}</h3>
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <p style={{ maxWidth: '16rem', margin: 0, paddingBottom: '8px' }}>
            {desc}
            <br />
            {!isCategory && <strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)}</strong>}
            {isCategory && <strong>Ver opciones</strong>}
          </p>
          <button
            type="button"
            className="galleta-btn"
            onClick={handleButtonClick}
            style={{
              background: color,
              color: iconStrokeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxSizing: 'border-box',
              borderRadius: '50%',
              width: '52px',
              height: '52px',
              minWidth: '52px',
              minHeight: '52px',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative',
              boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
              lineHeight: 0
            }}
            aria-label={isCategory ? `Ir a la sección de ${name}` : `Añadir ${name} al carrito`}
            title={isCategory ? `Ver ${name}` : "Agregar al carrito"}
          >
            {isCategory ? (
              renderCategoryIcon()
            ) : (
              (icon || <Plus size={22} color={iconStrokeColor} style={{ display: 'block', width: 22, height: 22 }} />)
            )}
          </button>
        </div>
      </Link>
    </article>
  );
};

export default ProductCard;
