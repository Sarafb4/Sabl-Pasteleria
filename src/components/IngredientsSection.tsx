import React, { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import './IngredientsSection.css';

interface IngredientsSectionProps {
  ingredients: { name: string; desc: string; }[];
}

const IngredientsSection: React.FC<IngredientsSectionProps> = ({ ingredients }) => {
  const sectionRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray('.ing, .big');
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
    <section ref={sectionRef} className="s g" data-dk style={{ '--bg': 'var(--wine2)', color: 'var(--blush)' } as any}>
      <h2 id="h2" className="d big" style={{ color: 'var(--petal)' }}>Pasos para<br/>tu pedido.</h2>
      <div id="ing" style={{ borderBottom: '1px solid #f8dce040' }}>
        {ingredients.map((ing, i) => (
          <div className="ing" key={i}>
            <h3 className="d">{ing.name}</h3>
            <p>{ing.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default IngredientsSection;
