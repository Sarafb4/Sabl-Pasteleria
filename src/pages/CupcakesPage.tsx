import React from 'react';
import Header from '../components/Header';

const CupcakesPage: React.FC = () => {
  return (
    <div style={{ background: 'var(--blush)', minHeight: '100vh', color: 'var(--wine)' }}>
      <Header />
      <div style={{ paddingTop: '150px', paddingLeft: '28px', paddingRight: '28px' }}>
        <h1 className="d big" style={{ color: 'var(--wine)' }}>Catálogo de Cupcakes</h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '40rem' }}>
          Aquí podrás ver en detalle cada uno de nuestros cupcakes, seleccionar cantidades,
          añadirlos al carrito y leer su información nutricional.
        </p>
        
        {/* Espacio para la futura grilla o lista de productos */}
        <div style={{ marginTop: '40px' }}>
          <p>Pronto estarán disponibles los detalles de los cupcakes...</p>
        </div>
      </div>
    </div>
  );
};

export default CupcakesPage;
