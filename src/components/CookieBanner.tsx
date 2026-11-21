import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Check, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { saveCookieConsentToSupabase, saveLegalConsentToSupabase } from '../services/supabaseClient';

const STORAGE_KEY = 'sablee_cookies_accepted';
const SYNCED_KEY = 'sablee_cookies_synced_supabase';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('hide_banner')) {
      return;
    }
    try {
      const consentRaw = localStorage.getItem(STORAGE_KEY);
      if (!consentRaw) {
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      } else {
        // Si ya había aceptado previamente pero no se ha respaldado en Supabase
        const isSynced = localStorage.getItem(SYNCED_KEY);
        if (!isSynced) {
          const parsed = JSON.parse(consentRaw);
          saveCookieConsentToSupabase({
            necessary: true,
            acceptedAt: parsed.timestamp || new Date().toISOString()
          }).then(res => {
            if (res.success) localStorage.setItem(SYNCED_KEY, 'true');
          });
        }
      }
    } catch {
      // Si localStorage está bloqueado, no forzar
    }
  }, []);

  const handleAcceptNecessary = () => {
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: nowIso
      }));
    } catch {}

    // Guardar fecha de consentimiento en Supabase
    saveCookieConsentToSupabase({
      necessary: true,
      analytics: false,
      marketing: false,
      acceptedAt: nowIso
    }).then(res => {
      if (res.success) {
        try { localStorage.setItem(SYNCED_KEY, 'true'); } catch {}
      }
    });

    saveLegalConsentToSupabase({
      consentType: 'cookies',
      accepted: true,
      acceptedAt: nowIso
    });

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de cookies técnicas"
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: '16px',
        maxWidth: '380px',
        width: 'calc(100% - 32px)',
        zIndex: 9998,
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '18px',
        padding: '14px 16px',
        boxShadow: '0 12px 32px rgba(68, 14, 9, 0.16), 0 2px 8px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(123, 26, 16, 0.12)',
        fontFamily: 'Jost, sans-serif',
        animation: 'slideUpCookie 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <style>{`
        @keyframes slideUpCookie {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Cabecera y texto compacto */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: 'var(--petal, #FCDCE1)',
          color: 'var(--wine, #7B1A10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Cookie size={17} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '0.82rem',
            lineHeight: 1.4,
            color: '#333'
          }}>
            <strong style={{ color: 'var(--wine, #7B1A10)' }}>Cookies esenciales:</strong> Usamos solo cookies técnicas necesarias para tu carrito y pedidos. Sin publicidad ni rastreo.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.74rem',
            color: '#666',
            marginTop: '4px'
          }}>
            <Link
              to="/privacy-policy"
              onClick={() => setIsVisible(false)}
              style={{ color: 'var(--wine, #7B1A10)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Privacidad
            </Link>

            <span>•</span>

            <button
              type="button"
              className="cookie-details-btn"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 6px',
                color: '#666',
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                textDecoration: 'underline',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span>{showDetails ? 'Menos' : 'Detalles'}</span>
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Detalles desplegables si el usuario hace clic */}
      {showDetails && (
        <div style={{
          background: '#fafafa',
          borderRadius: '10px',
          padding: '8px 10px',
          marginTop: '10px',
          border: '1px solid #eee',
          fontSize: '0.72rem',
          color: '#555',
          lineHeight: 1.4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
            <ShieldCheck size={12} />
            <span>100% Técnicas</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '14px' }}>
            <li>Carrito de compras activo.</li>
            <li>Código SAB-XXXX para rastreo.</li>
          </ul>
        </div>
      )}

      {/* Botón de Aceptar compacto */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '10px'
      }}>
        <button
          type="button"
          onClick={handleAcceptNecessary}
          style={{
            padding: '10px 22px',
            minHeight: '42px',
            borderRadius: '99px',
            border: 'none',
            background: 'var(--wine, #7B1A10)',
            color: 'var(--blush, #FFF0F3)',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 2px 8px rgba(123, 26, 16, 0.2)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Check size={13} />
          <span>Aceptar</span>
        </button>
      </div>
    </aside>
  );
};

export default CookieBanner;

