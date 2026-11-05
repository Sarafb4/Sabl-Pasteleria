# Tareas Pendientes - Sablée Pastelería

A continuación se detalla la lista de tareas organizadas por secciones para poner a funcionar completamente la página web.

## 1. Migración y Configuración del Proyecto (React)
- [x] Configurar un entorno moderno para React (por ejemplo, Vite o Next.js) si se planea usar React (dado que existe un archivo `Cookie.tsx` vacío).
- [x] Migrar el código HTML estático de `Sablée Pastelería (1).html` a componentes de React.
- [x] Separar la estructura en componentes reutilizables: `Header`, `Footer`, `ProductCard`, `Cart`, `HeroSection`, etc.
- [x] Mover los estilos CSS y variables globales a un archivo organizado o adoptar módulos CSS / Tailwind.

## 2. Sistema de Productos
- [ ] Crear un arreglo o base de datos de productos (ej. cookies, pasteles, postres).
- [ ] Renderizar dinámicamente las tarjetas de productos en la página principal utilizando los datos.
- [ ] Implementar un componente interactivo para ver los detalles de cada producto (`Cookie.tsx`).
- [ ] Añadir filtrado y búsqueda de productos por categorías.

## 3. Carrito de Compras
- [x] Implementar la lógica del estado global para el carrito (Context API, Redux o Zustand).
- [x] Hacer funcional el botón de "Agregar al carrito" en cada producto.
- [x] Crear un panel lateral (Sidebar) o modal para visualizar el contenido del carrito (el elemento `#bag`).
- [x] Añadir funcionalidades para modificar cantidades (sumar/restar) y eliminar productos del carrito.
- [x] Calcular dinámicamente el total directo de la orden sin recargos ni impuestos adicionales.

## 4. Checkout y Pagos
- [x] Crear un formulario de contacto y dirección de envío para los clientes.
- [x] Integrar redirección a WhatsApp para coordinar el pago y enviar detalles del pedido.
- [ ] Integrar una pasarela de pagos (ej. MercadoPago o Stripe) directamente en la página (Pendiente).
- [x] Generar un resumen de orden antes de finalizar la compra.
- [ ] Enviar correos de confirmación al usuario y notificaciones al administrador.

## 5. Backend y Base de Datos (Opcional pero Recomendado)
- [x] Crear esquema SQL completo con políticas de seguridad por fila (Row Level Security - RLS) en `supabase_schema_and_rls.sql`.
- [x] Configurar cliente seguro de Supabase con variables de entorno (`src/services/supabaseClient.ts`).
- [ ] Conectar la sincronización de órdenes y productos entre Zustand y Supabase.

## 6. Animaciones y Experiencia de Usuario (UX)
- [x] Mantener y mejorar las micro-animaciones existentes (ej. el efecto *hover* en los botones y tarjetas).
- [ ] Añadir animaciones de carga (spinners/skeletons) al cargar productos. (Pendiente conexión a Base de Datos)
- [x] Asegurar que el diseño sea completamente *Responsive* en todos los dispositivos móviles y tablets.
- [x] Implementar "Toast notifications" para cuando un usuario añade algo al carrito exitosamente.

## 7. SEO y Despliegue
- [ ] Optimizar el SEO de la página: Metadatos, etiquetas Open Graph para redes sociales y estructura de encabezados (H1, H2).
- [ ] Optimizar el tamaño de las imágenes y assets para que la carga sea súper rápida.
- [ ] Realizar el despliegue a producción utilizando Vercel, Netlify o GitHub Pages.
- [ ] Conectar el dominio personalizado de la pastelería.
