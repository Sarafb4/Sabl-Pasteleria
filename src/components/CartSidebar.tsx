import React from 'react';
import { useCartStore } from '../store/cartStore';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CartSidebar.css';

const CartSidebar: React.FC = () => {
  const { 
    isCartOpen, 
    toggleCart, 
    items, 
    removeItem, 
    updateQuantity, 
    getTotalPrice 
  } = useCartStore();
  
  const navigate = useNavigate();

  const total = getTotalPrice();

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const handleCheckout = () => {
    toggleCart(); // Cierra el sidebar
    navigate('/checkout'); // Redirige al checkout
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={toggleCart} 
        aria-hidden="true" 
      />
      
      {/* Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 className="d">Tu Horno</h2>
          <button className="close-btn" onClick={toggleCart} aria-label="Cerrar carrito">
            <X size={24} />
          </button>
        </div>

        <div className="cart-content">
          {items.length === 0 ? (
            <div className="empty-cart">
              <p>No has agregado productos a tu horno</p>
              <button 
                className="continue-shopping" 
                onClick={() => {
                  toggleCart();
                  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Ver productos
              </button>
            </div>
          ) : (
            <ul className="cart-list">
              {items.map(item => (
                <li key={item.id} className="cart-item">
                  <div className="item-details">
                    <h3 className="d">{item.name}</h3>
                    <p className="item-price">{formatCOP(item.price)}</p>
                  </div>
                  
                  <div className="item-actions">
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Reducir cantidad">
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Aumentar cantidad">
                        <Plus size={16} />
                      </button>
                    </div>
                    <button className="remove-btn" onClick={() => removeItem(item.id)} aria-label="Eliminar producto">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="summary-row cart-total d" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span>Total:</span>
                <span>{formatCOP(total)}</span>
              </div>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              Ir a pagar
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--wine)', opacity: 0.8, margin: '12px 0 0' }}>
              Domicilios en Bucaramanga, Floridablanca, Girón y Piedecuesta
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
