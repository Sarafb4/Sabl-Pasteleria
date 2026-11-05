import React from 'react';
import './Marquee.css';

const Marquee: React.FC = () => {
  const words = ['Galletas', 'Cupcakes', 'Tortas', 'Flan'];

  return (
    <div className="mq">
      <div className="d" id="mq" style={{ display: 'flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
        {[0, 1, 2, 3].map((_, i) => (
          <React.Fragment key={i}>
            {words.map((w, j) => (
              <span key={`${i}-${j}`} style={{ display: 'inline-flex', alignItems: 'center', margin: '0 40px' }}>
                {w} 
              </span>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
