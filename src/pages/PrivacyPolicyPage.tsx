import React from 'react';
import Header from '../components/Header';

const PrivacyPolicyPage: React.FC = () => {
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
          <h1 className="d" style={{ marginBottom: '40px', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: '1.2', textAlign: 'center' }}>Política de Privacidad y Tratamiento de Datos</h1>
          
          <div style={{ fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'Jost, sans-serif' }}>
            <p style={{ marginBottom: '20px' }}>
              En <strong>Sablée Pastelería</strong> valoramos profundamente tu privacidad. Al aceptar esta política, nos otorgas tu <strong>Autorización Expresa para el Tratamiento de Datos Personales</strong>, lo que nos permite recopilar, almacenar y usar tu información únicamente para los fines descritos en este documento, de acuerdo con la ley de protección de datos aplicable.
            </p>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>1. Información que recopilamos</h2>
            <p style={{ marginBottom: '20px' }}>
              Al realizar un pedido, te pedimos información básica para poder procesar y enviar tus productos, incluyendo:
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Teléfono de contacto</li>
              <li>Dirección de envío</li>
            </ul>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>2. Uso de tu información</h2>
            <p style={{ marginBottom: '20px' }}>
              Los datos proporcionados son utilizados exclusivamente para:
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '20px' }}>
              <li>Procesar y enviar tu pedido correctamente.</li>
              <li>Enviarte actualizaciones sobre el estado de tu compra.</li>
              <li>Contactarte en caso de alguna eventualidad con tu envío.</li>
              <li>Enviarte promociones (solo si has dado tu consentimiento explícito).</li>
            </ul>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>3. Protección de tus datos</h2>
            <p style={{ marginBottom: '20px' }}>
              No compartimos, vendemos, ni alquilamos tu información personal a terceros. Mantenemos medidas de seguridad estándar para proteger tu información de acceso no autorizado.
            </p>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>4. Pagos y seguridad</h2>
            <p style={{ marginBottom: '20px' }}>
              Los pagos se realizan a través de entidades bancarias autorizadas o redirección a WhatsApp. No almacenamos datos de tarjetas de crédito o débito en nuestros servidores.
            </p>

            <h2 className="d" style={{ fontSize: '2rem', marginTop: '40px', marginBottom: '15px' }}>5. Tus derechos</h2>
            <p style={{ marginBottom: '20px' }}>
              Tienes derecho a acceder, corregir o solicitar la eliminación de tus datos personales de nuestra base de datos en cualquier momento. Para ejercer estos derechos, contáctanos a través de nuestro correo o WhatsApp de atención al cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
