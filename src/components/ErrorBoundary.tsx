import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, MessageCircle, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | null;
}

/**
 * ErrorBoundary de Sablée Pastelería.
 * Captura excepciones inesperadas sin exponer detalles técnicos,
 * stack traces, rutas del servidor ni variables internas al usuario.
 * Ofrece alternativas útiles e inmediatas para resolver el inconveniente.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registro técnico confidencial únicamente en la consola del desarrollador
    console.error('[Sablée ErrorBoundary]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--blush, #FCB4BF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Jost', sans-serif",
          color: 'var(--wine2, #440E09)'
        }}>
          <div style={{
            background: '#ffffff',
            maxWidth: '560px',
            width: '100%',
            borderRadius: '32px',
            padding: '44px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(123, 26, 16, 0.12)',
            border: '1px solid rgba(123, 26, 16, 0.08)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--petal, #FFF0F3)',
              color: 'var(--wine, #7B1A10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h1 className="d" style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.3rem)',
              color: 'var(--wine, #7B1A10)',
              margin: '0 0 12px',
              lineHeight: 1.15
            }}>
              Tuvimos un pequeño inconveniente
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#554',
              lineHeight: 1.5,
              margin: '0 auto 28px',
              maxWidth: '420px'
            }}>
              No te preocupes, tus productos y pedidos están a salvo. Puedes intentar recargar la página o comunicarte directamente con nosotras para ayudarte de inmediato.
            </p>

            {this.state.error && (
              <details style={{
                marginBottom: '24px',
                textAlign: 'left',
                background: '#fef2f2',
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid #fecaca',
                fontSize: '0.82rem',
                color: '#991b1b',
                maxWidth: '460px',
                margin: '0 auto 24px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  Detalle técnico: {this.state.error.message || 'Error inesperado'}
                </summary>
                <pre style={{
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontSize: '0.74rem',
                  fontFamily: 'monospace',
                  color: '#7f1d1d'
                }}>
                  {this.state.error.stack || this.state.error.message}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '360px',
              margin: '0 auto'
            }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '14px 24px',
                  borderRadius: '99px',
                  border: 'none',
                  background: 'var(--wine, #7B1A10)',
                  color: 'var(--blush, #FCB4BF)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(123, 26, 16, 0.25)',
                  transition: 'transform 0.2s'
                }}
              >
                <RefreshCw size={18} />
                <span>Recargar Página</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '13px 24px',
                  borderRadius: '99px',
                  border: '1.5px solid var(--wine, #7B1A10)',
                  background: 'transparent',
                  color: 'var(--wine, #7B1A10)',
                  fontWeight: 600,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Home size={18} />
                <span>Volver al Inicio</span>
              </button>

              <a
                href={`https://wa.me/${(typeof window !== 'undefined' ? localStorage.getItem('sablee_bakery_phone') : null) || '573125473848'}?text=${encodeURIComponent('Hola Sablée Pastelería, tuve un inconveniente en la página y quisiera ayuda con mi pedido.')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: '6px',
                  padding: '12px',
                  borderRadius: '99px',
                  color: 'var(--wine, #7B1A10)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MessageCircle size={16} />
                <span>Escríbenos a WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

