# 🍰 Sablée Pastelería

Bienvenido al repositorio de **Sablée Pastelería**, una aplicación web moderna y elegante para una tienda y pastelería artesanal. La plataforma permite a los clientes explorar el catálogo de delicias (galletas, cupcakes, tortas, flanes), gestionar un carrito de compras interactivo, formalizar pedidos con envío a domicilio y procesar pagos con comprobante QR o vía WhatsApp.

---

## 🚀 Tecnologías Utilizadas

- **[React 18](https://react.dev/)**: Biblioteca frontend para la interfaz de usuario.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático para mayor robustez y escalabilidad.
- **[Vite](https://vitejs.dev/)**: Entorno de desarrollo rápido y empaquetador ultraligero.
- **[React Router DOM v7](https://reactrouter.com/)**: Enrutamiento y navegación SPA fluida entre páginas.
- **[Zustand](https://github.com/pmndrs/zustand)**: Gestión global de estado rápida y sin sobrecarga (utilizado para el carrito de compras).
- **[Lucide React](https://lucide.dev/)**: Colección de íconos vectoriales modernos y estilizados.
- **[React Hot Toast](https://react-hot-toast.com/)**: Notificaciones emergentes accesibles y elegantes.
- **[GSAP](https://greensock.com/gsap/)**: Animaciones y transiciones interactivas.

---

## 📋 Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado en tu sistema:

- **[Node.js](https://nodejs.org/)** (versión 18 o superior recomendada).
- **npm** (incluido por defecto con Node.js), **pnpm** o **yarn**.

Para verificar si los tienes instalados, abre tu terminal y ejecuta:
```bash
node -v
npm -v
```

---

## 🛠️ Instalación y Puesta en Marcha

Sigue estos pasos para clonar, instalar dependencias y levantar el proyecto localmente:

### 1. Clonar o descargar el proyecto
Si descargaste el archivo `.zip`, descomprímelo. Si usas Git:
```bash
git clone <URL_DEL_REPOSITORIO>
cd Sabl-Pasteleria-main
```

### 2. Instalar dependencias
En la terminal, dentro del directorio raíz del proyecto:
```bash
npm install
```
*(Si la carpeta `node_modules` ya se encuentra presente, este paso verificará las dependencias necesarias).*

### 3. Iniciar el servidor de desarrollo
Ejecuta el siguiente comando para iniciar Vite:
```bash
npm run dev
```

### 4. Abrir en el navegador
Una vez que inicie, la terminal te indicará la URL local, normalmente:
```
http://localhost:5173
```
Abre ese enlace en tu navegador web para explorar la pastelería.

---

## 📜 Scripts Disponibles

En el archivo `package.json` encontrarás los siguientes comandos:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo con recarga rápida (HMR). |
| `npm run build` | Compila el código TypeScript y genera la versión optimizada en la carpeta `dist`. |
| `npm run preview` | Previsualiza localmente la versión de producción generada por el build. |

---

## 📁 Estructura del Proyecto

```plaintext
Sabl-Pasteleria-main/
├── public/                 # Archivos estáticos públicos (imágenes de productos y fondos)
│   ├── background-delicias.jpg
│   └── galleta_chocolate.jpg
├── src/
│   ├── components/         # Componentes reutilizables de la interfaz
│   │   ├── CallToAction.tsx        # Sección de llamado a la acción final
│   │   ├── CartSidebar.tsx         # Panel lateral desplegable del carrito
│   │   ├── Header.tsx              # Barra de navegación superior
│   │   ├── HeroSection.tsx         # Portada de bienvenida
│   │   ├── IngredientsSection.tsx  # Pasos e ingredientes de elaboración
│   │   ├── Marquee.tsx             # Cintillo con texto en movimiento
│   │   ├── ProductCard.tsx         # Tarjeta interactiva de producto
│   │   └── ProductsSection.tsx     # Grilla de categorías y productos
│   ├── data/               # Datos estáticos o recursos (imágenes en base64, etc.)
│   │   └── photos.ts
│   ├── pages/              # Vistas y pantallas principales de la aplicación
│   │   ├── Home.tsx                # Página principal (Home) con las 3 secciones principales
│   │   ├── TortasPage.tsx          # Catálogo oficial de tortas (Amapola, Arándanos, Zanahoria, Chocolate)
│   │   ├── PostresPage.tsx         # Catálogo oficial de postres (Genovesa, Flan de caramelo)
│   │   ├── GalletasPage.tsx        # Catálogo oficial de galletas (Nutella, Red velvet, Oreo)
│   │   ├── CheckoutPage.tsx        # Formulario de dirección, contacto y resumen
│   │   ├── PaymentPage.tsx         # Pago mediante transferencia QR y comprobante
│   │   ├── OrderStatusPage.tsx     # Estado y seguimiento del pedido
│   │   ├── AdminPanel.tsx          # Panel de administración de órdenes
│   │   ├── PrivacyPolicyPage.tsx   # Política de privacidad
│   │   └── TermsPage.tsx           # Términos y condiciones
│   ├── store/              # Manejo del estado global de la app
│   │   └── cartStore.ts            # Estado del carrito con Zustand (agregar, restar, total)
│   ├── styles/             # Hojas de estilo globales
│   │   └── global.css              # Variables CSS de color, fuentes y utilidades
│   ├── App.tsx             # Definición de rutas principales con React Router
│   └── main.tsx            # Punto de entrada de la aplicación React
├── index.html              # Plantilla base HTML con fuentes de Google (Caprasimo & Jost)
├── package.json            # Lista de dependencias y scripts del proyecto
├── tsconfig.json           # Configuración del compilador TypeScript
└── vite.config.ts          # Configuración del empaquetador Vite
```

---

## 🧭 Rutas y Funcionalidades Principales

1. **Página Principal (`/`)**: Presenta las 3 secciones oficiales del menú: **Tortas**, **Postres** y **Galletas**.
2. **Catálogos por Sección (`/tortas`, `/postres`, `/galletas`)**:
   - **Tortas**: Amapola, Arándanos, Zanahoria y Chocolate con selector interactivo de presentaciones (1/4 lb, 1/2 lb, 1 lb) y conteo de porciones.
   - **Postres**: Genovesa tres leches y Flan de caramelo con selector de presentaciones (1/4 lb, 1/2 lb, 1 lb).
   - **Galletas**: Nutella, Red velvet y Oreo con opciones de 1 unidad ($8.000), combo 3x ($22.000) y caja 6x ($45.000), además de mix surtido.
3. **Carrito de Compras (`CartSidebar`)**: Accesible desde el ícono del horno superior. Muestra cada producto con su presentación elegida, cálculo en tiempo real y modificación de cantidades.
4. **Checkout (`/checkout`)**: Formulario para recolectar datos de entrega y opción directa para ordenar vía WhatsApp o pasar a transferencia bancaria QR.
5. **Pago con QR (`/payment`)**: Muestra código QR bancario para transferir y permite adjuntar el comprobante de pago.
6. **Seguimiento (`/order-status`)**: Pantalla informativa para que el cliente valide el estado de su orden.
7. **Portal de la Dueña / Panel de Pedidos (`/admin`)**:
   - Acceso directo desde el botón **"Dueña"** en la barra superior de navegación.
   - Acceso protegido por clave (por defecto: `sablee` o `1234`).
   - Métricas en tiempo real: Total de pedidos, ventas acumuladas en COP, pedidos por preparar y entregados.
   - Filtros de estado (`Pendiente de pago`, `Confirmado`, `En preparación`, `En camino`, `Entregado`) y buscador por cliente/teléfono/ID.
   - Botón directo para contactar al cliente por WhatsApp con el pedido pre-cargado.
   - Visualización de comprobante de pago adjunto.
   - Posibilidad de registrar pedidos manuales (para órdenes telefónicas o en tienda).
8. **Cotizador de Tortas Personalizadas (`#cotizar`)**:
   - Sección interactiva disponible en la página principal (`/`) y en el catálogo de tortas (`/tortas`).
   - Permite personalizar: Sabor de bizcocho, relleno/cobertura, tamaño/porciones, estilo decorativo, fecha del evento y datos de contacto.
   - Resumen dinámico en vivo y botón para enviar toda la cotización directamente al chat de WhatsApp de Sablée.

---

## 🎨 Paleta de Colores y Tipografía

El diseño de Sablée se basa en tonos cálidos y de repostería definidos en [global.css](file:///c:/Users/SARA%20FAJARDO/Documents/PROGRAMACION/Sabl-Pasteleria-main/src/styles/global.css):
- **Vino Tinto Principal:** `--wine: #7B1A10`
- **Vino Oscuro:** `--wine2: #440E09`
- **Rosa Suave / Blancoso (Blush):** `--blush: #FFF0F3`
- **Rosa Pétalo Pastel:** `--petal: #FCE4E8`
- **Tipografías:** `Caprasimo` (títulos llamativos estilo retro/artesanal) y `Jost` (cuerpo de texto moderno y limpio).

---

## 📌 Próximas Mejoras (Roadmap)

- [ ] Integración con base de datos en tiempo real (Supabase / Firebase) para catálogo y persistencia de órdenes.
- [ ] Conexión a pasarela de pagos en línea (MercadoPago / Wompi / Stripe).
- [ ] Notificaciones automáticas por correo electrónico tras la compra.
- [ ] Optimización de assets y despliegue en producción (Vercel o Netlify).

#   s a b l e e p a s t e l e r i a  
 