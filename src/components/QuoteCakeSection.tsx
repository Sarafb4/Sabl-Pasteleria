import React, { useState } from 'react';
import { Cake, MessageCircle, Calendar, Heart, Layers, Palette } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';
import { validateName, validatePhone } from '../utils/validators';
import './QuoteCakeSection.css';

const FLAVORS = [
  'Amapola clásica',
  'Arándanos frescos',
  'Zanahoria especiada',
  'Chocolate amargo 70%',
  'Red Velvet',
  'Vainilla tradicional',
  'O cotízala a tu antojo'
];

const FILLINGS = [
  'Arequipe artesanal',
  'Fudge de chocolate',
  'Frutos rojos confitados',
  'Crema de queso & rosas',
  'Mousse de maracuyá',
  'O cotízala a tu antojo'
];

const SIZES = [
  { label: 'Mini / Bento Cake', desc: '2 - 4 porciones' },
  { label: '1/4 Libra', desc: '8 - 10 porciones' },
  { label: '1/2 Libra', desc: '15 - 20 porciones' },
  { label: '1 Libra', desc: '25 - 30 porciones' },
  { label: '2 Pisos o más', desc: '40+ porciones (Eventos)' },
  { label: 'O cotízala a tu antojo', desc: 'Tamaño o porciones especiales' }
];

const STYLES = [
  'Flores naturales & frutos',
  'Vintage / Coquette con lazos',
  'Minimalista con lettering',
  'Temática especial / Infantil',
  'Elegante con perlas y dorado',
  'O cotízala a tu antojo'
];

const QuoteCakeSection: React.FC = () => {
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  const [flavor, setFlavor] = useState(FLAVORS[0]);
  const [filling, setFilling] = useState(FILLINGS[0]);
  const [size, setSize] = useState(SIZES[2].label);
  const [selectedSizeDesc, setSelectedSizeDesc] = useState(SIZES[2].desc);
  const [cakeStyle, setCakeStyle] = useState(STYLES[0]);
  const [eventDate, setEventDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleSizeSelect = (item: typeof SIZES[0]) => {
    setSize(item.label);
    setSelectedSizeDesc(item.desc);
  };

  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting para evitar spam de cotizaciones (máx 3 cotizaciones por minuto)
    const rateLimit = checkRateLimit('quote_cake', 3, 60000);
    if (!rateLimit.allowed) {
      toast.error(`Por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otra cotización.`);
      return;
    }

    const nameValidation = validateName(clientName);
    if (!nameValidation.isValid) {
      toast.error(nameValidation.error || 'Por favor ingresa un nombre válido.');
      return;
    }

    if (clientPhone.trim()) {
      const phoneValidation = validatePhone(clientPhone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || 'Por favor ingresa un teléfono celular válido.');
        return;
      }
    }

    const message = 
`¡Hola Sablée Pastelería! 🍰✨
Me gustaría cotizar una *Torta Personalizada* con las siguientes especificaciones:

🎂 *Bizcocho:* ${flavor}
🍓 *Relleno & Cobertura:* ${filling}
👥 *Tamaño:* ${size} (${selectedSizeDesc})
🎨 *Estilo de Decoración:* ${cakeStyle}
📅 *Fecha del Evento:* ${eventDate || 'A convenir'}
👤 *Nombre:* ${clientName}
📱 *Teléfono:* ${clientPhone || 'No especificado'}
${notes.trim() ? `📝 *Ideas / Detalles:* ${notes.trim()}\n` : ''}
¿Tienen disponibilidad en agenda y cuál sería la cotización estimada? ¡Quedo atento(a)!`;

    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${bakeryPhone}?text=${encodedMsg}`;

    toast.success('¡Redirigiendo a WhatsApp con tu cotización!');
    window.open(whatsappUrl, '_blank');
  };

  return (
    <section id="cotizar" className="quote-section">
      <div className="quote-container">
        {/* Cabecera de la Sección */}
        <div className="quote-header">
          <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.9rem' }}>
            Personalización a tu medida
          </span>
          <h2>Cotiza tu Torta Soñada · O Cotízala a tu Antojo</h2>
          <p>
            Creamos tortas únicas para cumpleaños, aniversarios, bodas y ocasiones especiales.
            Elige tus combinaciones favoritas o selecciona <strong>"O cotízala a tu antojo"</strong> para crear un diseño completamente libre.
          </p>
        </div>

        {/* Grilla Principal: Formulario + Resumen */}
        <div className="quote-grid">
          {/* Tarjeta del Formulario */}
          <div className="quote-form-card">
            <form onSubmit={handleSendToWhatsApp}>
              {/* Paso 1: Sabor de Bizcocho */}
              <div className="quote-step">
                <div className="quote-step-title">
                  <Cake size={20} />
                  <span>1. Elige el sabor del bizcocho</span>
                </div>
                <div className="quote-chips">
                  {FLAVORS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`quote-chip ${flavor === f ? 'active' : ''}`}
                      onClick={() => setFlavor(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: Relleno y Cobertura */}
              <div className="quote-step">
                <div className="quote-step-title">
                  <Heart size={20} />
                  <span>2. Relleno y cobertura preferida</span>
                </div>
                <div className="quote-chips">
                  {FILLINGS.map((fil) => (
                    <button
                      key={fil}
                      type="button"
                      className={`quote-chip ${filling === fil ? 'active' : ''}`}
                      onClick={() => setFilling(fil)}
                    >
                      {fil}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 3: Tamaño y Porciones */}
              <div className="quote-step">
                <div className="quote-step-title">
                  <Layers size={20} />
                  <span>3. Tamaño y porciones estimadas</span>
                </div>
                <div className="quote-chips">
                  {SIZES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className={`quote-chip ${size === s.label ? 'active' : ''}`}
                      onClick={() => handleSizeSelect(s)}
                    >
                      {s.label} ({s.desc})
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 4: Estilo de Decoración */}
              <div className="quote-step">
                <div className="quote-step-title">
                  <Palette size={20} />
                  <span>4. Estilo o temática deseada</span>
                </div>
                <div className="quote-chips">
                  {STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`quote-chip ${cakeStyle === st ? 'active' : ''}`}
                      onClick={() => setCakeStyle(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 5: Datos de Contacto y Fecha */}
              <div className="quote-step" style={{ marginBottom: 0 }}>
                <div className="quote-step-title">
                  <Calendar size={20} />
                  <span>5. Datos de tu celebración</span>
                </div>

                <div className="quote-inputs-row">
                  <div className="quote-input-group">
                    <label>Tu Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Laura Morales"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="quote-input-group">
                    <label>Teléfono WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Ej. +57 310 000 0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="quote-input-group">
                  <label>Fecha estimada del evento</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                    * Recomendamos encargar con al menos 48 horas de anticipación.
                  </span>
                </div>

                <div className="quote-input-group">
                  <label>Detalles especiales o dedicatoria</label>
                  <textarea
                    rows={3}
                    placeholder="Cuéntanos si tienes colores específicos, mensaje para la torta o si tienes fotos de referencia..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(123, 26, 16, 0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--wine)', fontWeight: 600 }}>
                  Revisa los detalles en el recuadro <strong>"Resumen de tu Cotización"</strong> y haz clic en el botón para cotizar por WhatsApp.
                </span>
              </div>
            </form>
          </div>

          {/* Tarjeta de Resumen Lateral */}
          <aside className="quote-summary-card">
            <span className="summary-badge">Resumen de tu Cotización</span>
            <h3>Tu Torta Especial</h3>
            <p style={{ color: '#665', fontSize: '0.95rem', margin: '0 0 16px 0' }}>
              Revisa tus elecciones antes de enviar el mensaje:
            </p>

            <div className="summary-preview-list">
              <div className="preview-row">
                <span className="preview-label">Sabor de Bizcocho</span>
                <span className="preview-value">{flavor}</span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Relleno & Cobertura</span>
                <span className="preview-value">{filling}</span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Porciones / Tamaño</span>
                <span className="preview-value">{size} ({selectedSizeDesc})</span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Estilo Decorativo</span>
                <span className="preview-value">{cakeStyle}</span>
              </div>

              {eventDate && (
                <div className="preview-row">
                  <span className="preview-label">Fecha del Evento</span>
                  <span className="preview-value">{eventDate}</span>
                </div>
              )}

              {clientName && (
                <div className="preview-row">
                  <span className="preview-label">Solicitado por</span>
                  <span className="preview-value">{clientName}</span>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="btn-send-whatsapp"
              onClick={handleSendToWhatsApp}
            >
              <MessageCircle size={22} />
              <span>Cotizar por WhatsApp</span>
            </button>

            <p className="quote-disclaimer">
              Al hacer clic se abrirá una conversación en WhatsApp con todos estos detalles listos para enviar a nuestro equipo.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default QuoteCakeSection;

