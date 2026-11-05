import React from 'react';
import Header from '../components/Header';

const FlanPage: React.FC = () => {
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
      <Header />
      <div style={{ paddingTop: '150px', paddingLeft: '28px', paddingRight: '28px' }}>
        <h1 className="d big" style={{ color: 'var(--wine)' }}>Catálogo de Flanes</h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '40rem' }}>
          Aquí podrás ver en detalle cada una de nuestras opciones de flan, seleccionar cantidades
          y añadirlos al carrito.
        </p>
        
        {/* Espacio para la futura grilla o lista de productos */}
        <div style={{ marginTop: '40px' }}>
          <p>Pronto estarán disponibles los detalles de los flanes...</p>
        </div>
      </div>
    </div>
  );
};

export default FlanPage;
