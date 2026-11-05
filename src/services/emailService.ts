import { checkRateLimit } from '../utils/rateLimiter';

export interface EmailConfig {
  enabled: boolean;
  scriptUrl: string; // URL de la aplicación web de Google Apps Script (https://script.google.com/macros/s/.../exec)
  ownerEmail: string; // Correo de la dueña donde llegan las comandas (ej: safabu12@gmail.com)
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  enabled: true,
  scriptUrl: '',
  ownerEmail: 'safabu12@gmail.com'
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val);
};

/**
 * Genera la factura / comanda digital elegante de Sablée con el mismo estilo de la página web
 */
export const buildOrderEmailHtml = (order: any): string => {
  const items = Array.isArray(order.items) ? order.items : [];
  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://sableepasteleria.com/admin';
  
  // Teléfono del cliente limpio para enlace directo de WhatsApp
  const rawPhone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
  const waPhone = rawPhone.length === 10 ? `57${rawPhone}` : rawPhone;
  const waCustomerLink = waPhone 
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ${order.customer?.name || ''}, te escribo de Sablée Pastelería sobre tu orden #${order.id}`)}`
    : '';

  const itemsHtml = items.length > 0
    ? items
        .map((item: any, idx: number) => `
          <tr style="border-bottom: 1px solid #f2e1e4; ${idx % 2 === 1 ? 'background-color: #fdfafb;' : 'background-color: #ffffff;'}">
            <td style="padding: 12px 8px; text-align: center; width: 44px;">
              <span style="display: inline-block; background-color: #f8ebeb; color: #7B1A10; font-weight: 700; font-size: 13px; padding: 3px 8px; border-radius: 8px;">
                ${item.quantity}x
              </span>
            </td>
            <td style="padding: 12px 10px; font-size: 14px; color: #440E09; font-weight: 600; line-height: 1.4;">
              ${item.name}
            </td>
            <td style="padding: 12px 12px; text-align: right; font-weight: 700; color: #7B1A10; font-size: 14px; white-space: nowrap;">
              ${formatCurrency(item.price * item.quantity)}
            </td>
          </tr>
        `).join('')
    : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #888;">Sin productos especificados</td></tr>';

  return `
    <!DOCTYPE html>
    <html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Comanda de Pedido #${order.id} - Sablée Pastelería</title>
      <style>
        :root {
          color-scheme: light;
          supported-color-schemes: light;
        }
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      </style>
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #FFF0F3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #440E09;">
      
      <!-- Contenedor Principal estilo Factura / Ticket -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 2px solid #eed6db; box-shadow: 0 12px 36px rgba(123, 26, 16, 0.08);">
        
        <!-- Franja superior Vino Sablée -->
        <tr>
          <td style="background-color: #7B1A10; height: 6px; font-size: 1px; line-height: 1px;">&nbsp;</td>
        </tr>

        <!-- Cabecera de Factura / Sablée Pastelería -->
        <tr>
          <td style="padding: 28px 24px 20px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f4e4e7;">
            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #7B1A10; letter-spacing: 0.5px; margin: 0;">
              Sablée Pastelería
            </div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9A383F; margin-top: 4px; font-weight: 600;">
              Pastelería Artesanal · Bucaramanga
            </div>

            <!-- Placa con Número de Orden -->
            <div style="margin-top: 16px;">
              <span style="display: inline-block; background-color: #FFF0F3; border: 1.5px solid #EED6DB; color: #7B1A10; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 99px; letter-spacing: 0.5px;">
                COMANDA OFICIAL #${order.id}
              </span>
            </div>
            <div style="font-size: 12px; color: #777777; margin-top: 6px;">
              Registrado: ${order.date || new Date().toLocaleString('es-CO')}
            </div>
          </td>
        </tr>

        <!-- Estado del Pedido -->
        <tr>
          <td style="padding: 16px 24px 8px; background-color: #ffffff;">
            <div style="background-color: #fff9e6; border: 1.5px solid #f3d790; border-radius: 14px; padding: 12px 16px; text-align: center;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #856404; display: block;">
                Estado Actual del Pedido
              </span>
              <span style="font-size: 15px; font-weight: 800; color: #856404; margin-top: 2px; display: block;">
                ${order.status || 'Pendiente de pago'}
              </span>
            </div>
          </td>
        </tr>

        <!-- Datos del Cliente y Entrega -->
        <tr>
          <td style="padding: 12px 24px 16px; background-color: #ffffff;">
            <div style="background-color: #FAF4F5; border: 1.5px solid #EED6DB; border-radius: 16px; padding: 18px 20px;">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #7B1A10; margin-bottom: 12px; border-bottom: 1px solid #EED6DB; padding-bottom: 6px;">
                Datos de Entrega y Cliente
              </div>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #555555; width: 90px; font-weight: 600;">Cliente:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #440E09; font-weight: 700;">${order.customer?.name || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #555555; font-weight: 600;">Teléfono:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #7B1A10; font-weight: 700;">
                    <a href="tel:${order.customer?.phone}" style="color: #7B1A10; text-decoration: underline;">${order.customer?.phone || 'No especificado'}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #555555; font-weight: 600; vertical-align: top;">Dirección:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #440E09; font-weight: 600; line-height: 1.4;">
                    ${order.customer?.address || 'Por coordinar'} · ${order.customer?.city || 'Bucaramanga'}
                  </td>
                </tr>
                ${order.customer?.details ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #888888; vertical-align: top;">Detalles:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #666666; font-style: italic;">${order.customer.details}</td>
                </tr>
                ` : ''}
                ${order.customer?.notes ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #888888; vertical-align: top;">Notas:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #7B1A10; font-weight: 600;">${order.customer.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          </td>
        </tr>

        <!-- Tabla de Productos Solicitados -->
        <tr>
          <td style="padding: 8px 24px 16px; background-color: #ffffff;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #7B1A10; margin-bottom: 10px;">
              Delicias en el Pedido
            </div>

            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1.5px solid #eed6db; border-radius: 12px; overflow: hidden;">
              <thead>
                <tr style="background-color: #FAF0F2; border-bottom: 2px solid #eed6db;">
                  <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7B1A10; font-weight: 800; text-align: center; width: 44px;">Cant.</th>
                  <th style="padding: 10px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7B1A10; font-weight: 800; text-align: left;">Producto</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7B1A10; font-weight: 800; text-align: right; width: 90px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Total a Pagar estilo Factura -->
        <tr>
          <td style="padding: 4px 24px 24px; background-color: #ffffff;">
            <!-- Separador punteado -->
            <div style="border-top: 2px dashed #eed6db; margin-bottom: 16px;"></div>

            <!-- Caja Destacada de Total -->
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #7B1A10; border-radius: 14px;">
              <tr>
                <td style="padding: 16px 20px; vertical-align: middle;">
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #FFF0F3;">
                    Total de la Comanda
                  </div>
                  <div style="font-size: 12px; color: #F8D7DA; margin-top: 2px;">
                    Canal: ${order.channel || 'Web / Tienda Online'}
                  </div>
                </td>
                <td style="padding: 16px 20px; text-align: right; vertical-align: middle;">
                  <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    ${formatCurrency(order.total || 0)} COP
                  </div>
                </td>
              </tr>
            </table>

            <!-- Botones de Acción Rápida -->
            <div style="margin-top: 22px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding: 6px;">
                    <a href="${adminUrl}" style="display: inline-block; background-color: #7B1A10; color: #FFF0F3; text-decoration: none; font-weight: 700; padding: 13px 24px; border-radius: 99px; font-size: 14px; box-shadow: 0 4px 14px rgba(123, 26, 16, 0.25);">
                      Abrir en Panel de Control
                    </a>
                  </td>
                  ${waCustomerLink ? `
                  <td align="center" style="padding: 6px;">
                    <a href="${waCustomerLink}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 700; padding: 13px 22px; border-radius: 99px; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.25);">
                      WhatsApp al Cliente
                    </a>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- Pie de Factura / Ticket -->
        <tr>
          <td style="background-color: #FAF4F5; padding: 16px 20px; text-align: center; border-top: 1px solid #f2e1e4;">
            <div style="font-size: 12px; font-weight: 600; color: #7B1A10;">
              Sablée Pastelería · Abierto todos los días desde las 7:00 AM
            </div>
            <div style="font-size: 11px; color: #888888; margin-top: 4px;">
              Bucaramanga, Santander · Comanda interna generada automáticamente
            </div>
          </td>
        </tr>

      </table>

    </body>
    </html>
  `;
};

/**
 * Envía notificación automática de comanda directamente al Gmail de la dueña
 * usando Google Apps Script (500 correos diarios gratis / 15.000 al mes, $0 COP).
 */
export const sendOrderEmailNotification = async (
  order: any,
  config: EmailConfig
): Promise<{ success: boolean; message: string }> => {
  if (!config.enabled) {
    return { success: false, message: 'Notificaciones por correo desactivadas en configuración.' };
  }

  if (!config.scriptUrl || !config.scriptUrl.trim()) {
    console.warn('[Google Script] Falta configurar la URL del script en el panel.');
    return {
      success: false,
      message: 'Falta configurar la URL de tu Google Apps Script en el panel de administración.'
    };
  }

  // Rate Limiting para proteger el servicio y evitar abusos
  const rateLimit = checkRateLimit('email_notification', 10, 60000);
  if (!rateLimit.allowed) {
    console.warn(`[Email] Rate limit activo: reintento en ${rateLimit.retryAfterSec}s.`);
    return {
      success: false,
      message: `Límite de correos alcanzado. Por favor espera ${rateLimit.retryAfterSec} segundos antes de enviar otro.`
    };
  }

  const ownerEmail = config.ownerEmail?.trim() || 'safabu12@gmail.com';
  const customerName = order.customer?.name || 'Cliente';
  const subject = `Nuevo Pedido #${order.id} - ${customerName} (${formatCurrency(order.total || 0)})`;
  const htmlContent = buildOrderEmailHtml(order);

  try {
    // Enviamos POST a la Web App de Google Apps Script.
    // 'no-cors' con 'text/plain' asegura que el navegador envíe el contenido sin bloqueos de redirección CORS de Google.
    await fetch(config.scriptUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        to: ownerEmail,
        subject: subject,
        html: htmlContent,
        orderId: order.id,
        customerName: customerName,
        total: order.total || 0
      })
    });

    console.log(`[Google Script] Comanda de orden #${order.id} enviada exitosamente a ${ownerEmail}`);
    return {
      success: true,
      message: `Comanda de pedido #${order.id} enviada directamente a tu Gmail (${ownerEmail}).`
    };
  } catch (err: any) {
    console.error('[Google Script] Excepción de red al enviar correo:', err);
    return {
      success: false,
      message: 'No hubo conexión con Google Apps Script. Verifica el enlace del script y tu conexión a internet.'
    };
  }
};

/**
 * Envía una comanda de prueba para validar que Google Apps Script esté conectado
 */
export const sendTestEmailNotification = async (
  config: EmailConfig
): Promise<{ success: boolean; message: string }> => {
  const dummyOrder = {
    id: `SAB-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toLocaleString('es-CO'),
    customer: {
      name: 'Sara Fajardo (Prueba)',
      phone: '3125473848',
      email: config.ownerEmail || 'safabu12@gmail.com',
      address: 'Calle 384 (Barrio: Cabecera)',
      details: 'Apto 402 - Timbre 13',
      city: 'Bucaramanga',
      notes: 'Por favor incluir velita y dedicatoria.'
    },
    items: [
      { id: 'torta-genovesa-1-4', name: 'Genovesa · 1/4 libra (8 porciones)', price: 55000, quantity: 1 },
      { id: 'galleta-nutella-3x', name: 'Nutella · 3 Unidades (3x)', price: 22000, quantity: 1 }
    ],
    subtotal: 77000,
    tax: 0,
    total: 77000,
    status: 'Pendiente de pago',
    channel: 'Web / QR'
  };

  return sendOrderEmailNotification(dummyOrder, config);
};
