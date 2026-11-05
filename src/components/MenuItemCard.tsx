import React, { useState } from 'react';
import { MenuItem, Presentation } from '../data/menuData';
import { useCartStore } from '../store/cartStore';
import { ShoppingBag, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './MenuItemCard.css';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const presentations = (item.presentations && item.presentations.length > 0)
    ? item.presentations
    : [{ label: 'Porción', portions: '', price: 10000 }];

  const images = (Array.isArray(item.images) && item.images.length > 0)
    ? item.images
    : (item.image ? [item.image] : []);

  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [selected, setSelected] = useState<Presentation>(presentations[0]);
  const addItem = useCartStore(state => state.addItem);
  const [isAdded, setIsAdded] = useState(false);

  // Sincronizar si cambia el item
  React.useEffect(() => {
    if (item.presentations && item.presentations.length > 0) {
      setSelected(item.presentations[0]);
    }
    setCurrentImgIdx(0);
  }, [item]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const currentSelected = selected || presentations[0];

  const handleAddToCart = () => {
    if (!currentSelected) return;
    const itemNameWithPresentation = `${item.name} · ${currentSelected.label}`;
    const itemId = `${item.id}-${currentSelected.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    addItem({
      id: itemId,
      name: itemNameWithPresentation,
      price: currentSelected.price,
      bg: 'var(--wine)',
      color: 'var(--blush)'
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);

    toast.success(`¡${item.name} (${currentSelected.label}) agregado al horno!`);
  };

  const activeImage = images[currentImgIdx] || images[0];

  return (
    <article className="menu-card">
      {activeImage && (
        <div className="menu-card-image-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={activeImage} alt={`${item.name} ${currentImgIdx + 1}`} className="menu-card-image" loading="lazy" />
          
          {images.length > 1 && (
            <>
              {/* Botón flecha izquierda */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIdx(prev => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.88)',
                  color: 'var(--wine)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  zIndex: 3
                }}
                aria-label="Ver foto anterior"
              >
                ‹
              </button>

              {/* Botón flecha derecha */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIdx(prev => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.88)',
                  color: 'var(--wine)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  zIndex: 3
                }}
                aria-label="Ver siguiente foto"
              >
                ›
              </button>

              {/* Puntos indicadores */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '5px',
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '3px 8px',
                borderRadius: '99px',
                zIndex: 3
              }}>
                {images.map((_, i) => (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIdx(i);
                    }}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: i === currentImgIdx ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {item.badge && <span className="menu-card-badge">{item.badge}</span>}

      <div>
        <div className="menu-card-header">
          <h3>{item.name}</h3>
        </div>
        <p className="menu-card-desc">{item.desc}</p>

        <div className="menu-presentations-title">
          <span>Selecciona tu presentación:</span>
        </div>

        <div className="menu-presentations-list">
          {presentations.map((pres, idx) => {
            const isSelected = currentSelected.label === pres.label;
            return (
              <button
                key={idx}
                type="button"
                className={`presentation-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelected(pres)}
              >
                <div className="pill-info">
                  <span className="pill-label">{pres.label}</span>
                  {pres.portions && (
                    <span className="pill-portions">{pres.portions}</span>
                  )}
                </div>
                <span className="pill-price">{formatCOP(pres.price)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="menu-card-action">
        <button className="btn-add-cart" onClick={handleAddToCart}>
          {isAdded ? (
            <>
              <Check size={20} />
              <span>¡Agregado al horno!</span>
            </>
          ) : (
            <>
              <ShoppingBag size={20} />
              <span>Agregar · {formatCOP(currentSelected.price)}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export default MenuItemCard;

