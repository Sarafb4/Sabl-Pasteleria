import React from 'react';
import Header from '../components/Header';

const TermsPage: React.FC = () => {
  return (
    <div style={{ background: 'var(--petal)', minHeight: '100vh', color: 'var(--wine)' }}>
      <Header />
      <div style={{ paddingTop: '150px', maxWidth: '800px', margin: '0 auto', padding: '150px 20px 50px 20px' }}>
        
        <div style={{ 
          background: '#ffffff', 
          padding: '50px', 
          borderRadius: '20px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          color: 'var(--wine)'
        }}>
          <h1 className="d" style={{ marginBottom: '40px', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: '1.2', textAlign: 'center' }}>Términos, Condiciones y Envíos</h1>
          
          <div style={{ fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'Jost, sans-serif' }}>
            <p style={{ marginBottom: '30px' }}>
              Al realizar una compra en <strong>Sablée Pastelería</strong>, aceptas los siguientes términos y condiciones. Por favor léelos cuidadosamente, especialmente aquellos relacionados con envíos y alimentos perecederos.
            </p>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>1. Aviso Legal e Identificación</h2>
            <p style={{ marginBottom: '20px' }}>
              Este sitio web opera bajo el nombre comercial <strong>Sablée Pastelería</strong>. Para cualquier notificación legal, PQR (Peticiones, Quejas y Reclamos) o facturación, puedes contactarnos a través de nuestro correo electrónico oficial o líneas de atención en WhatsApp indicadas en esta plataforma.
            </p>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>2. Políticas de Envío (Delivery)</h2>
            <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Zonas de Cobertura:</strong> Realizamos envíos únicamente dentro del perímetro urbano de la ciudad. Zonas aledañas o fuera de cobertura deben ser consultadas previamente.</li>
              <li style={{ marginBottom: '10px' }}><strong>Tiempos de Entrega:</strong> Los pedidos se entregan en la franja horaria acordada. Debido al tráfico o clima, el tiempo de entrega puede tener una variación razonable.</li>
              <li style={{ marginBottom: '10px' }}><strong>Recepción del Pedido:</strong> Si el mensajero llega a la dirección de envío y no hay nadie para recibir el pedido tras 10 minutos de espera, el producto será devuelto a la tienda. El cliente deberá asumir el costo de un nuevo envío.</li>
            </ul>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>3. Cancelaciones y Cambios</h2>
            <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Pedidos Estándar:</strong> Pueden ser cancelados con al menos 24 horas de anticipación para un reembolso total.</li>
              <li style={{ marginBottom: '10px' }}><strong>Tortas y Pedidos Personalizados:</strong> Al requerir insumos específicos y tiempo de preparación, las cancelaciones deben hacerse con un mínimo de 48 horas de anticipación. De lo contrario, se retendrá un porcentaje del valor para cubrir costos de producción.</li>
            </ul>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>4. Devoluciones y Reembolsos</h2>
            <p style={{ marginBottom: '20px' }}>
              Debido a que nuestros productos son alimentos perecederos, <strong>no aceptamos devoluciones por "arrepentimiento" o cambio de opinión</strong>. 
            </p>
            <p style={{ marginBottom: '20px' }}>
              Únicamente procederemos con el reemplazo del producto o reembolso si:
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>El producto entregado no corresponde a lo que ordenaste.</li>
              <li>El producto llegó en evidente mal estado (aplastado, dañado durante el transporte). En este caso, debes reportarlo el mismo día de la recepción con fotografías que lo evidencien.</li>
            </ul>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>5. Alergias y Restricciones Alimentarias</h2>
            <p style={{ marginBottom: '20px' }}>
              Nuestros productos son preparados en una cocina que procesa nueces, gluten, lácteos y huevos. Si tienes alguna alergia severa, te recomendamos no consumir nuestros productos o consultarnos previamente, ya que no podemos garantizar la ausencia total de trazas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
