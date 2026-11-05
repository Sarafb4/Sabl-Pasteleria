import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import './HeroSection.css';
import { PH } from '../data/photos';

const CAP = [
  'Red velvet rellena',
  'Torta rosada',
  'Flan de caramelo',
  'Cookie Oreo',
  'Torta de chocolate',
  'Torta de flores',
  'Cookie de chocolate'
];

const HeroSection: React.FC = () => {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.to(titleRef.current, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom top', scrub: true }
        });
      }
    });
    return () => ctx.revert();
  }, []);

  const carouselPhotos = [...PH, ...PH];
  const carouselCaps = [...CAP, ...CAP];

  return (
    <section id="story" className="g">
      <div className="stick">
        <div id="title" ref={titleRef}>
          <div className="logo" role="img" aria-label="Sablée Pastelería"></div>
        </div>
        <div className="car" aria-label="Fotos de nuestros productos">
          <div className="trk" id="trk">
            {carouselPhotos.map((photo, index) => (
              <figure key={index} className="pol">
                <div className="ph">
                  <img alt={carouselCaps[index]} src={`data:image/jpeg;base64,${photo}`} />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
