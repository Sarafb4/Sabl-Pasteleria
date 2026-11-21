import React, { useState } from 'react';
import { MenuItem, Presentation } from '../data/menuData';
import { useCartStore } from '../store/cartStore';
import { Check, X, Plus } from 'lucide-react';
import OvenIcon from './OvenIcon';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const hasMultiplePresentations = presentations.length > 1;
  const minPrice = presentations.length > 0 ? Math.min(...presentations.map(p => p.price)) : currentSelected.price;

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    setTimeout(() => {
      setIsAdded(false);
      setIsModalOpen(false);
    }, 800);

    toast.success(`¡${item.name} (${currentSelected.label}) agregado al horno!`);
  };

  const handleCardClick = () => {
    // En pantallas táctiles o móviles, tocar la tarjeta abre el selector
    if (window.innerWidth <= 600) {
      setIsModalOpen(true);
    }
  };

  const activeImage = images[currentImgIdx] || images[0];

  return (
    <>
      <article className="menu-card" onClick={handleCardClick}>
        {activeImage && (
          <div className="menu-card-image-wrap">
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
                  className="carousel-arrow-btn left"
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
                  className="carousel-arrow-btn right"
                  aria-label="Ver siguiente foto"
                >
                  ›
                </button>

                {/* Puntos indicadores */}
                <div className="carousel-dots">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImgIdx(i);
                      }}
                      style={{
                        background: i === currentImgIdx ? '#fff' : 'rgba(255, 255, 255, 0.45)'
                      }}
                      className="carousel-dot"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {item.badge && <span className="menu-card-badge">{item.badge}</span>}

        <div className="menu-card-content">
          <div className="menu-card-header">
            <h3>{item.name}</h3>
          </div>
          
          <p className="menu-card-desc">{item.desc}</p>

          {/* VISTA ESCRITORIO: Selector de presentaciones estándar */}
          <div className="desktop-presentations">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(pres);
                    }}
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

          {/* VISTA MÓVIL (CUADRÍCULA 2 COLUMNAS): Precio compacto */}
          <div className="mobile-card-pricing">
            <span className="mobile-price-tag">
              {hasMultiplePresentations ? `Desde ${formatCOP(minPrice)}` : formatCOP(currentSelected.price)}
            </span>
          </div>
        </div>

        {/* BOTÓN EN ESCRITORIO */}
        <div className="menu-card-action desktop-action">
          <button className="btn-add-cart" onClick={handleAddToCart}>
            {isAdded ? (
              <>
                <Check size={20} />
                <span>¡Agregado al horno!</span>
              </>
            ) : (
              <>
                <OvenIcon size={20} />
                <span>Agregar · {formatCOP(currentSelected.price)}</span>
              </>
            )}
          </button>
        </div>

        {/* BOTÓN EN MÓVIL (CUADRÍCULA 2X2) */}
        <div className="mobile-action-btn">
          {hasMultiplePresentations ? (
            <button 
              type="button" 
              className="btn-mobile-choose"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <span>Elegir</span>
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-mobile-choose"
              onClick={handleAddToCart}
            >
              {isAdded ? <Check size={16} /> : <><Plus size={15} /><span>Pedir</span></>}
            </button>
          )}
        </div>
      </article>

      {/* MODAL / BOTTOM SHEET EN MÓVIL PARA ELEGIR TAMAÑOS */}
      {isModalOpen && (
        <div 
          className="product-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="product-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button 
              type="button" 
              className="product-modal-close" 
              onClick={() => setIsModalOpen(false)}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            {/* Encabezado del modal */}
            {activeImage && (
              <div className="product-modal-img-wrap">
                <img src={activeImage} alt={item.name} className="product-modal-img" />
                {item.badge && <span className="menu-card-badge modal-badge">{item.badge}</span>}
              </div>
            )}

            <div className="product-modal-body">
              <h3 className="product-modal-title">{item.name}</h3>
              <p className="product-modal-desc">{item.desc}</p>

              <div className="menu-presentations-title" style={{ marginTop: '16px' }}>
                <span>Selecciona el tamaño / presentación:</span>
              </div>

              <div className="menu-presentations-list" style={{ marginBottom: '20px' }}>
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

              <button className="btn-add-cart modal-add-btn" onClick={handleAddToCart}>
                {isAdded ? (
                  <>
                    <Check size={20} />
                    <span>¡Agregado al horno!</span>
                  </>
                ) : (
                  <>
                    <OvenIcon size={20} />
                    <span>Agregar · {formatCOP(currentSelected.price)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemCard;
