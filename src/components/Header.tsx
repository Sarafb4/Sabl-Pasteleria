import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { Search } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  isPop?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isPop: propIsPop }) => {
  const navRef = useRef<HTMLElement>(null);
  const cartItemsCount = useCartStore(state => state.getTotalItems());
  const toggleCart = useCartStore(state => state.toggleCart);
  const [pop, setPop] = useState(false);

  // local effect to pop the icon when count changes
  useEffect(() => {
    if (cartItemsCount > 0) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 250);
      return () => clearTimeout(timer);
    }
  }, [cartItemsCount]);

  useEffect(() => {
    const handleScroll = () => {
      const y = 40;
      const secs = Array.from(document.querySelectorAll('section, .mq'));
      let el = secs.find(e => {
        const r = e.getBoundingClientRect();
        return r.top <= y && r.bottom > y;
      }) || secs[0];
      
      if (el && navRef.current) {
        const dk = el.hasAttribute('data-dk');
        navRef.current.style.setProperty('--nf', dk ? '#FFF0F3' : '#7B1A10');
        navRef.current.style.setProperty('--nb', dk ? '#FCE4E8' : '#7B1A10');
        navRef.current.style.setProperty('--nt', dk ? '#7B1A10' : '#FFF0F3');
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav ref={navRef}>
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <b><i className="lg" role="img" aria-label="Sablée Pastelería"></i></b>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link 
          to="/order-status" 
          className="header-track-btn"
          aria-label="Rastrear Pedido"
          title="Rastrear Pedido por ID, Teléfono o Correo"
        >
          <Search size={16} />
          <span className="track-text">Rastrear</span>
        </Link>

        <button 
          id="bag" 
          className={pop || propIsPop ? 'pop' : ''} 
          aria-label={`Horno, ${cartItemsCount} productos`}
          onClick={toggleCart}
        >
        <svg width="38" height="30" viewBox="0 0 48 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="44" height="30" rx="4"/>
          <rect x="6.5" y="8" width="27" height="20" rx="2"/>
          <path d="M6.5 24h27"/>
          <g id="cu">
            <path d="M9.5 24l.9-3.6h5.2l.9 3.6"/>
            <path d="M10.4 20.4a2.6 2.6 0 0 1 5.2 0"/>
          </g>
          <use href="#cu" x="8.5"/>
          <use href="#cu" x="17"/>
          <rect x="37.5" y="8" width="5" height="8" rx="1"/>
          <path d="M38.6 21h.1M41.2 21h.1M38.6 24h.1M41.2 24h.1" strokeWidth="2.4"/>
          <circle cx="40" cy="29" r="0.1" strokeWidth="0"/>
          <path d="M8 33v3M40 33v3"/>
        </svg>
        <span id="cnt">{cartItemsCount}</span>
      </button>
    </div>
  </nav>
  );
};

export default Header;
