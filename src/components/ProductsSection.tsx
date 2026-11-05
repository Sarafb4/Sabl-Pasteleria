import React, { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import ProductCard, { ProductProps } from './ProductCard';
import './ProductsSection.css';

interface ProductsSectionProps {
  products: ProductProps[];
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ products }) => {
  const sectionRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray('.card, .big');
      elements.forEach((el: any) => {
        gsap.from(el, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="s g" 
      style={{ 
        position: 'relative', 
        background: 'linear-gradient(180deg, rgba(25, 4, 3, 0.55) 0%, rgba(25, 4, 3, 0.15) 45%, rgba(18, 2, 2, 0.65) 100%), url("/background-delicias.jpg") center 70% / cover no-repeat',
        color: 'var(--blush)',
        paddingTop: '100px',
        paddingBottom: '120px',
        overflow: 'hidden'
      }}
    >
      <h2 id="h1" className="d big" style={{ color: 'var(--blush)', position: 'relative', zIndex: 1, textShadow: '0 4px 18px rgba(0,0,0,0.55)' }}>
        Conoce nuestras<br/>delicias
      </h2>
      <div className="grid" id="shop" style={{ position: 'relative', zIndex: 1 }}>
        {products.map((p, i) => (
          <ProductCard 
            key={i} 
            {...p} 
          />
        ))}
      </div>
    </section>
  );
};

export default ProductsSection;
