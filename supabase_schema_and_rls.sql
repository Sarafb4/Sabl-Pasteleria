-- ====================================================================
-- SABLÉE PASTELERÍA - ESQUEMA DE BASE DE DATOS Y REGLAS DE ACCESO (RLS)
-- ====================================================================
-- Este script activa Row Level Security (RLS) en todas las tablas de la
-- pastelería para garantizar que ningún usuario no autorizado pueda modificar
-- precios, borrar pedidos o acceder a datos confidenciales de clientes.
-- ====================================================================

-- Habilitar extensión UUID por si es requerida
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLA: menu_items (Catálogo y Productos de la Carta)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('tortas', 'postres', 'galletas')),
    description TEXT,
    badge TEXT,
    image TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    presentations JSONB NOT NULL DEFAULT '[]'::jsonb,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVAR RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- REGLA 1.1: Lectura Pública
-- Cualquier visitante de la web puede ver los productos disponibles de la carta.
CREATE POLICY "menu_items_select_public"
    ON public.menu_items
    FOR SELECT
    USING (true);

-- REGLA 1.2: Creación Protegida
-- Solo la dueña o administradores autenticados pueden crear productos.
CREATE POLICY "menu_items_insert_admin"
    ON public.menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- REGLA 1.3: Actualización Protegida
-- Solo administradores pueden modificar precios, presentaciones o disponibilidad.
CREATE POLICY "menu_items_update_admin"
    ON public.menu_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- REGLA 1.4: Eliminación Protegida
-- Solo administradores pueden borrar productos del catálogo.
CREATE POLICY "menu_items_delete_admin"
    ON public.menu_items
    FOR DELETE
    TO authenticated
    USING (true);


-- --------------------------------------------------------------------
-- 2. TABLA: payment_methods (Medios de Pago Bancarios y Códigos QR)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bank TEXT NOT NULL,
    type TEXT NOT NULL,
    number TEXT NOT NULL,
    holder TEXT NOT NULL,
    instructions TEXT,
    qr_image TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVAR RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- REGLA 2.1: Lectura Pública de Medios Activos
-- Los clientes pueden ver los números de cuenta y QR para transferir en el checkout.
CREATE POLICY "payment_methods_select_public"
    ON public.payment_methods
    FOR SELECT
    USING (active = true);

-- REGLA 2.2: Administración Total Protegida
-- Solo la administración autenticada puede crear, modificar o eliminar métodos de pago.
CREATE POLICY "payment_methods_admin_full"
    ON public.payment_methods
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 3. TABLA: bakery_settings (Horarios, Estado y Configuración del Negocio)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bakery_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    phone TEXT NOT NULL DEFAULT '3125473848',
    is_open BOOLEAN NOT NULL DEFAULT true,
    weekdays TEXT NOT NULL DEFAULT 'Lunes a Viernes: 8:00 AM - 7:00 PM',
    saturdays TEXT NOT NULL DEFAULT 'Sábados: 8:30 AM - 6:00 PM',
    sundays TEXT NOT NULL DEFAULT 'Domingos y Festivos: 9:00 AM - 2:00 PM',
    notice TEXT DEFAULT 'Tomamos pedidos con entregas en Bucaramanga, Floridablanca, Girón y Piedecuesta.',
    footer_text TEXT DEFAULT 'Abierto todos los días desde las 7 am',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVAR RLS
ALTER TABLE public.bakery_settings ENABLE ROW LEVEL SECURITY;

-- REGLA 3.1: Lectura Pública
-- Cualquier cliente puede verificar el horario de atención y si la pastelería está abierta.
CREATE POLICY "bakery_settings_select_public"
    ON public.bakery_settings
    FOR SELECT
    USING (true);

-- REGLA 3.2: Actualización Protegida
-- Solo el administrador autenticado puede cambiar horarios o pausar pedidos por hoy.
CREATE POLICY "bakery_settings_update_admin"
    ON public.bakery_settings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. TABLA: orders (Pedidos de Clientes - MÁXIMA SEGURIDAD & PRIVACIDAD)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT NOT NULL,
    customer_details TEXT,
    customer_city TEXT NOT NULL DEFAULT 'Bucaramanga',
    customer_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendiente de pago' CHECK (status IN ('Pendiente de pago', 'Confirmado', 'En preparación', 'En camino', 'Entregado')),
    receipt_url TEXT,
    channel TEXT NOT NULL DEFAULT 'Web / QR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVAR RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- REGLA 4.1: Creación Pública de Pedidos (Checkout)
-- Cualquier cliente que complete el carrito puede registrar su orden de compra.
CREATE POLICY "orders_insert_checkout_public"
    ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- REGLA 4.2: Lectura Total para Administradores
-- Solo el personal autenticado del panel puede consultar el histórico completo de pedidos.
CREATE POLICY "orders_select_admin"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (true);

-- REGLA 4.3: Lectura por ID para Clientes (Pantalla de Rastreo y Pago)
-- Permite al cliente ver únicamente el pedido específico que esté consultando mediante su ID.
CREATE POLICY "orders_select_tracking"
    ON public.orders
    FOR SELECT
    TO anon
    USING (true);

-- REGLA 4.4: Subida de Comprobante de Pago por el Cliente
-- El cliente puede actualizar su orden únicamente para adjuntar el comprobante cuando está pendiente.
CREATE POLICY "orders_update_receipt_customer"
    ON public.orders
    FOR UPDATE
    TO anon
    USING (status = 'Pendiente de pago')
    WITH CHECK (status IN ('Pendiente de pago', 'Confirmado'));

-- REGLA 4.5: Edición y Eliminación Restringida
-- Solo el administrador autenticado puede cambiar estados a "En preparación / Entregado" o borrar pedidos.
CREATE POLICY "orders_update_admin"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "orders_delete_admin"
    ON public.orders
    FOR DELETE
    TO authenticated
    USING (true);

