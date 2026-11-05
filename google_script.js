/**
 * ==============================================================================
 * SABLÉE PASTELERÍA - NOTIFICACIONES DIRECTAS A TU GMAIL
 * ==============================================================================
 * 
 * ¿QUÉ HACE ESTE SCRIPT?
 * Recibe los pedidos de tu tienda web de Sablée y los envía inmediatamente
 * a tu correo Gmail (safabu12@gmail.com) con el diseño oficial de comanda de Sablée.
 * 
 * BENEFICIOS:
 * - 100% Gratis sin pagar un solo peso ($0 COP).
 * - Envía hasta 500 correos al día (15.000 pedidos al mes).
 * - Llega directo de tu propia cuenta de Google a tu bandeja (sin caer en Spam).
 * - Cero intermediarios: se eliminaron Brevo, Resend y EmailJS.
 * 
 * ------------------------------------------------------------------------------
 * PASO A PASO PARA ACTIVARLO (Solo toma 2 minutos):
 * ------------------------------------------------------------------------------
 * 1. Entra a: https://script.google.com con tu cuenta de Gmail (safabu12@gmail.com).
 * 2. Haz clic en el botón "+ Nuevo proyecto" (arriba a la izquierda).
 * 3. Borra cualquier texto que aparezca en el editor blanco.
 * 4. COPIA Y PEGA TODO ESTE ARCHIVO en el editor.
 * 5. Dale clic al botón azul de arriba a la derecha: "Implementar" > "Nueva implementación".
 * 6. En el icono de engranaje (Tipo), selecciona: "Aplicación web".
 * 7. Configura exactamente estos 3 campos:
 *    - Descripción: Sablée Pedidos
 *    - Ejecutar como: Yo (safabu12@gmail.com)
 *    - Quién tiene acceso: Cualquier usuario (Anyone)  <--- ¡MUY IMPORTANTE!
 * 8. Haz clic en "Implementar", Google te pedirá autorizar permisos para enviar correos:
 *    - Clic en "Revisar permisos" > Elige tu cuenta > "Configuración avanzada" > "Ir a Sablée Pedidos (no seguro)" > "Permitir".
 * 9. Copia la "URL de la aplicación web" (termina en /exec).
 * 10. Ve a tu Panel de Sablée > Pestaña "Alertas por Correo" > Pega la URL y haz clic en "Guardar Configuración".
 * ==============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos en la petición."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var recipient = payload.to || "safabu12@gmail.com";
    var subject = payload.subject || "Nuevo Pedido - Sablée Pastelería";
    var htmlBody = payload.html || "<p>Has recibido un nuevo pedido en Sablée Pastelería.</p>";

    // Envío directo utilizando el motor de Gmail de Google
    GmailApp.sendEmail(recipient, subject, "", {
      htmlBody: htmlBody,
      name: "Sablée Pastelería Bucaramanga"
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Comanda enviada exitosamente a " + recipient
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("El servicio de comanda por correo de Sablée Pastelería está activo y funcionando correctamente.");
}

