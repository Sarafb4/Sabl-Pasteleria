import React, { useState, useEffect, useRef } from 'react';
import { Cake, MessageCircle, Calendar, Heart, Layers, Palette, Cookie, ChevronDown, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import toast from 'react-hot-toast';
import { checkRateLimit } from '../utils/rateLimiter';
import { validateName, validatePhone } from '../utils/validators';
import './QuoteCakeSection.css';

const PRODUCT_TYPES: Array<{ id: string; label: string; icon: any }> = [
  { id: 'Torta artesanal', label: 'Torta artesanal', icon: Cake },
  { id: 'Galletas decoradas', label: 'Galletas decoradas', icon: Cookie },
  { id: 'Otro postre personalizado', label: 'Otro tipo de postre (Cupcakes, etc.)', icon: null }
];

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

const SIZES_BY_TYPE: Record<string, { label: string; desc: string }[]> = {
  'Torta artesanal': [
    { label: 'Mini / Bento Cake', desc: '2 - 4 porciones' },
    { label: '1/4 Libra', desc: '8 - 10 porciones' },
    { label: '1/2 Libra', desc: '15 - 20 porciones' },
    { label: '1 Libra', desc: '25 - 30 porciones' },
    { label: '2 Pisos o más', desc: '40+ porciones (Eventos)' },
    { label: 'O cotízala a tu antojo', desc: 'Tamaño o porciones especiales' }
  ],
  'Galletas decoradas': [
    { label: 'Caja x6 unidades', desc: 'Detalle o regalo' },
    { label: 'Caja x12 unidades', desc: 'Celebraciones y fiestas' },
    { label: 'Caja x24 unidades', desc: 'Recordatorios de evento' },
    { label: 'O cotízala a tu antojo', desc: 'Cantidad especial' }
  ],
  'Otro postre personalizado': [
    { label: 'Porción individual', desc: '1 - 4 personas' },
    { label: 'Para compartir', desc: '8 - 12 personas' },
    { label: 'Mesa de postres', desc: '20+ personas (Eventos)' },
    { label: 'O cotízala a tu antojo', desc: 'Cantidad o porciones a medida' }
  ]
};

const STYLES = [
  'Flores naturales & frutos',
  'Vintage / Coquette con lazos',
  'Minimalista con lettering',
  'Temática especial / Infantil',
  'Elegante con perlas y dorado',
  'O cotízala a tu antojo'
];

interface LuxurySelectProps {
  label: string;
  icon: any;
  value: string;
  options: Array<{ value: string; label: string; desc?: string }>;
  onChange: (val: string) => void;
}

const LuxurySelect: React.FC<LuxurySelectProps> = ({ label, icon: Icon, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="quote-select-group" ref={containerRef} style={{ position: 'relative' }}>
      <label>
        <Icon size={16} color="var(--wine)" />
        <span>{label}</span>
      </label>

      {/* Botón Disparador con Estilo Sablée */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="luxury-select-trigger"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
          {selectedOption ? selectedOption.label : value}
        </span>
        <ChevronDown 
          size={18} 
          color="var(--wine)"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.2s ease',
            flexShrink: 0 
          }} 
        />
      </button>

      {/* Menú Desplegable con Estilo Sablée */}
      {isOpen && (
        <div className="luxury-select-popover">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`luxury-select-option ${isSelected ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                    {opt.label}
                  </span>
                  {opt.desc && (
                    <span style={{ fontSize: '0.78rem', opacity: isSelected ? 0.9 : 0.65, marginTop: '2px' }}>
                      {opt.desc}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={16} style={{ flexShrink: 0, marginLeft: '8px' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface LuxuryDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const LuxuryDatePicker: React.FC<LuxuryDatePickerProps> = ({ value, onChange, label = 'Fecha estimada del evento' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialDate = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onChange(formatted);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayDate = (val: string) => {
    if (!val) return 'Selecciona la fecha del evento...';
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} de ${MONTH_NAMES[m]}, ${y}`;
  };

  return (
    <div className="quote-input-group" ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={15} color="var(--wine)" />
        <span>{label}</span>
      </label>

      {/* Botón Disparador del Calendario */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="luxury-select-trigger"
        style={{
          color: value ? 'var(--wine2, #440E09)' : '#888',
          fontWeight: value ? 600 : 400
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatDisplayDate(value)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              title="Borrar fecha"
              style={{ padding: '2px', color: '#999', cursor: 'pointer', display: 'flex' }}
            >
              <X size={15} />
            </span>
          )}
          <Calendar size={17} color="var(--wine)" style={{ opacity: 0.8 }} />
        </div>
      </button>

      {/* Popover del Calendario Sablée */}
      {isOpen && (
        <div className="luxury-calendar-popover">
          {/* Cabecera del Mes y Flechas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="calendar-nav-btn"
              style={{
                padding: 0,
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'rgba(123, 26, 16, 0.08)',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={18} color="var(--wine)" strokeWidth={2.5} />
            </button>

            <span style={{ fontWeight: 700, color: 'var(--wine)', fontSize: '1.02rem', fontFamily: 'Jost, sans-serif' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="calendar-nav-btn"
              style={{
                padding: 0,
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'rgba(123, 26, 16, 0.08)',
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={18} color="var(--wine)" strokeWidth={2.5} />
            </button>
          </div>

          {/* Días de la Semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {WEEKDAY_NAMES.map((d, i) => (
              <span key={i} style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--wine)', opacity: 0.65, textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Celdas de Días del Mes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(viewYear, viewMonth, dayNum);
              cellDate.setHours(0, 0, 0, 0);
              const isPast = cellDate < today;
              const formattedCell = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === formattedCell;
              const isToday = cellDate.getTime() === today.getTime();

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  style={{
                    padding: 0,
                    height: '36px',
                    width: '36px',
                    minWidth: '36px',
                    maxWidth: '36px',
                    minHeight: '36px',
                    maxHeight: '36px',
                    borderRadius: '50%',
                    border: isToday && !isSelected ? '1.5px solid var(--wine)' : 'none',
                    background: isSelected ? 'var(--wine, #7B1A10)' : 'transparent',
                    color: isSelected ? 'var(--blush, #FFF0F3)' : isPast ? '#d1d5db' : '#333',
                    fontSize: '0.88rem',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 3px 8px rgba(123, 26, 16, 0.3)' : 'none'
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Pie del Calendario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
            <button
              type="button"
              onClick={handleClear}
              className="calendar-btn-clear"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '8px'
              }}
            >
              Borrar
            </button>

            <button
              type="button"
              onClick={handleSelectToday}
              className="calendar-btn-today"
              style={{
                background: 'rgba(123, 26, 16, 0.08)',
                border: 'none',
                color: 'var(--wine)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: '99px'
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const QuoteCakeSection: React.FC = () => {
  const bakeryPhone = useOrderStore(state => state.bakeryPhone);
  
  const [productType, setProductType] = useState('Torta artesanal');
  const [customDessert, setCustomDessert] = useState('');
  
  const [flavor, setFlavor] = useState(FLAVORS[0]);
  const [customFlavor, setCustomFlavor] = useState('');

  const [filling, setFilling] = useState(FILLINGS[0]);
  const [customFilling, setCustomFilling] = useState('');
  
  const initialSizes = SIZES_BY_TYPE['Torta artesanal'];
  const [size, setSize] = useState(initialSizes[2].label);
  const [selectedSizeDesc, setSelectedSizeDesc] = useState(initialSizes[2].desc);
  const [customSize, setCustomSize] = useState('');
  
  const [cakeStyle, setCakeStyle] = useState(STYLES[0]);
  const [customStyle, setCustomStyle] = useState('');

  const [eventDate, setEventDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const currentSizes = SIZES_BY_TYPE[productType] || SIZES_BY_TYPE['Torta artesanal'];

  const handleProductTypeSelect = (typeId: string) => {
    setProductType(typeId);
    const newSizes = SIZES_BY_TYPE[typeId] || SIZES_BY_TYPE['Torta artesanal'];
    const defaultOption = newSizes[1] || newSizes[0];
    setSize(defaultOption.label);
    setSelectedSizeDesc(defaultOption.desc);
  };

  const handleSizeChange = (selectedLabel: string) => {
    const found = currentSizes.find(s => s.label === selectedLabel);
    if (found) {
      setSize(found.label);
      setSelectedSizeDesc(found.desc);
    } else {
      setSize(selectedLabel);
      setSelectedSizeDesc('');
    }
  };

  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

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

    const resolvedTitle = productType === 'Otro postre personalizado' && customDessert.trim()
      ? `Postre Personalizado (${customDessert.trim()})`
      : productType;

    const resolvedFlavor = flavor === 'O cotízala a tu antojo' && customFlavor.trim() 
      ? `A tu antojo: ${customFlavor.trim()}` 
      : flavor;

    const resolvedFilling = filling === 'O cotízala a tu antojo' && customFilling.trim()
      ? `A tu antojo: ${customFilling.trim()}`
      : filling;

    const resolvedSize = size.includes('antojo') && customSize.trim()
      ? `A tu antojo: ${customSize.trim()}`
      : `${size} (${selectedSizeDesc})`;

    const resolvedStyle = cakeStyle === 'O cotízala a tu antojo' && customStyle.trim()
      ? `A tu antojo: ${customStyle.trim()}`
      : cakeStyle;

    const message = 
`¡Hola Sablée Pastelería! 🍰✨
Me gustaría cotizar un pedido personalizado de *${resolvedTitle}* con las siguientes especificaciones:

✨ *Tipo de Delicia:* ${resolvedTitle}
🎂 *Sabor / Base:* ${resolvedFlavor}
🍓 *Relleno & Cobertura:* ${resolvedFilling}
👥 *Tamaño / Cantidad:* ${resolvedSize}
🎨 *Estilo de Decoración:* ${resolvedStyle}
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

  const getFlavorLabel = () => {
    if (productType === 'Galletas decoradas') return 'Sabor de la masa o galleta';
    if (productType === 'Otro postre personalizado') return 'Sabor principal o base preferida';
    return 'Sabor del bizcocho';
  };

  const getFillingLabel = () => {
    if (productType === 'Galletas decoradas') return 'Cobertura o glaseado preferido';
    if (productType === 'Otro postre personalizado') return 'Relleno, cobertura o toppings';
    return 'Relleno y cobertura preferida';
  };

  const getSizeLabel = () => {
    if (productType === 'Galletas decoradas') return 'Cantidad de galletas';
    if (productType === 'Otro postre personalizado') return 'Cantidad o porciones estimadas';
    return 'Tamaño y porciones estimadas';
  };

  const getSummaryTitle = () => {
    if (productType === 'Torta artesanal') return 'Tu Torta Especial';
    if (productType === 'Galletas decoradas') return 'Tus Galletas Especiales';
    return customDessert.trim() ? `Tu Creación: ${customDessert.trim()}` : 'Tu Postre Especial';
  };

  return (
    <section id="cotizar" className="quote-section">
      <div className="quote-container">
        {/* Cabecera de la Sección */}
        <div className="quote-header">
          <span className="lbl" style={{ color: 'var(--wine)', fontSize: '0.9rem' }}>
            Personalización a tu medida
          </span>
          <h2>Cotiza tu Torta o Postre Soñado · A tu Antojo</h2>
          <p>
            Elige los detalles para tu celebración en este formulario ordenado y cotiza en WhatsApp en segundos.
          </p>
        </div>

        {/* Grilla Principal: Formulario + Resumen */}
        <div className="quote-grid">
          {/* Tarjeta del Formulario Ordenado */}
          <div className="quote-form-card">
            <form onSubmit={handleSendToWhatsApp}>
              
              {/* Paso 1: Tipo de creación (Segmentado limpio) */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--wine)', marginBottom: '8px' }}>
                  1. ¿Qué delicia personalizada deseas cotizar?
                </label>
                
                <div className="quote-type-selector">
                  {PRODUCT_TYPES.map((p) => {
                    const Icon = p.icon;
                    const isSelected = productType === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`quote-type-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => handleProductTypeSelect(p.id)}
                      >
                        {Icon && <Icon size={16} />}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Campo si seleccionó "Otro tipo de postre" */}
                {productType === 'Otro postre personalizado' && (
                  <div style={{ marginTop: '10px', background: 'rgba(123, 26, 16, 0.04)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(123, 26, 16, 0.12)' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--wine)', display: 'block', marginBottom: '6px' }}>
                      ¿Qué delicia tienes en mente? (ej: Cupcakes temáticos, tartaletas, cheesecakes mini, mesa dulce...)
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe aquí el tipo de postre que deseas..."
                      value={customDessert}
                      onChange={(e) => setCustomDessert(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--wine)',
                        background: '#ffffff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        fontFamily: 'Jost, sans-serif'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Paso 2: Grilla de Selectores Ordenados (Estilo Sablée) */}
              <div className="quote-options-grid">
                
                {/* Sabor */}
                <div>
                  <LuxurySelect
                    label={`2. ${getFlavorLabel()}`}
                    icon={Cake}
                    value={flavor}
                    options={FLAVORS.map(f => ({ value: f, label: f }))}
                    onChange={(val) => setFlavor(val)}
                  />
                  {flavor === 'O cotízala a tu antojo' && (
                    <input
                      type="text"
                      placeholder="Escribe el sabor que imaginas..."
                      value={customFlavor}
                      onChange={(e) => setCustomFlavor(e.target.value)}
                      className="quote-custom-input"
                    />
                  )}
                </div>

                {/* Relleno & Cobertura */}
                <div>
                  <LuxurySelect
                    label={`3. ${getFillingLabel()}`}
                    icon={Heart}
                    value={filling}
                    options={FILLINGS.map(fil => ({ value: fil, label: fil }))}
                    onChange={(val) => setFilling(val)}
                  />
                  {filling === 'O cotízala a tu antojo' && (
                    <input
                      type="text"
                      placeholder="Escribe tu relleno o topping..."
                      value={customFilling}
                      onChange={(e) => setCustomFilling(e.target.value)}
                      className="quote-custom-input"
                    />
                  )}
                </div>

                {/* Tamaño / Porciones */}
                <div>
                  <LuxurySelect
                    label={`4. ${getSizeLabel()}`}
                    icon={Layers}
                    value={size}
                    options={currentSizes.map(s => ({ value: s.label, label: s.label, desc: s.desc }))}
                    onChange={(val) => handleSizeChange(val)}
                  />
                  {size.includes('antojo') && (
                    <input
                      type="text"
                      placeholder="Indica la cantidad o número de porciones..."
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      className="quote-custom-input"
                    />
                  )}
                </div>

                {/* Estilo Decorativo */}
                <div>
                  <LuxurySelect
                    label="5. Estilo o temática deseada"
                    icon={Palette}
                    value={cakeStyle}
                    options={STYLES.map(st => ({ value: st, label: st }))}
                    onChange={(val) => setCakeStyle(val)}
                  />
                  {cakeStyle === 'O cotízala a tu antojo' && (
                    <input
                      type="text"
                      placeholder="Describe la temática, colores o diseño..."
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      className="quote-custom-input"
                    />
                  )}
                </div>
              </div>

              {/* Paso 3: Datos de Contacto y Fecha */}
              <div style={{ borderTop: '1px solid rgba(123, 26, 16, 0.1)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Calendar size={18} color="var(--wine)" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--wine)' }}>
                    6. Datos de tu celebración
                  </span>
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

                <div className="quote-inputs-row">
                  <LuxuryDatePicker
                    value={eventDate}
                    onChange={(dateStr) => setEventDate(dateStr)}
                  />

                  <div className="quote-input-group">
                    <label>Detalles especiales o dedicatoria</label>
                    <input
                      type="text"
                      placeholder="Colores, mensaje para la torta o foto de referencia..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(123, 26, 16, 0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--wine)', fontWeight: 600 }}>
                  Revisa tu resumen a la derecha y haz clic en <strong>"Cotizar por WhatsApp"</strong> para enviarlo.
                </span>
              </div>
            </form>
          </div>

          {/* Tarjeta de Resumen Lateral */}
          <aside className="quote-summary-card">
            <span className="summary-badge">Resumen de tu Cotización</span>
            <h3>{getSummaryTitle()}</h3>
            <p style={{ color: '#665', fontSize: '0.95rem', margin: '0 0 16px 0' }}>
              Revisa tus elecciones antes de enviar el mensaje:
            </p>

            <div className="summary-preview-list">
              <div className="preview-row">
                <span className="preview-label">Tipo de Delicia</span>
                <span className="preview-value" style={{ fontWeight: 600, color: 'var(--wine)' }}>
                  {productType === 'Otro postre personalizado' && customDessert.trim()
                    ? customDessert.trim()
                    : productType}
                </span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Sabor / Base</span>
                <span className="preview-value">
                  {flavor === 'O cotízala a tu antojo' && customFlavor.trim() ? customFlavor : flavor}
                </span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Relleno & Cobertura</span>
                <span className="preview-value">
                  {filling === 'O cotízala a tu antojo' && customFilling.trim() ? customFilling : filling}
                </span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Porciones / Cantidad</span>
                <span className="preview-value">
                  {size.includes('antojo') && customSize.trim() ? customSize : `${size} (${selectedSizeDesc})`}
                </span>
              </div>

              <div className="preview-row">
                <span className="preview-label">Estilo Decorativo</span>
                <span className="preview-value">
                  {cakeStyle === 'O cotízala a tu antojo' && customStyle.trim() ? customStyle : cakeStyle}
                </span>
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
