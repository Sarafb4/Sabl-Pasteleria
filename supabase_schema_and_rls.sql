-- ====================================================================
-- SABLÉE PASTELERÍA - ESQUEMA DE BASE DE DATOS Y POLÍTICAS DE ACCESO (RLS)
-- ====================================================================
-- Ejecuta este script completo en el "SQL Editor" de tu panel de Supabase
-- para habilitar la persistencia de fotos, catálogo de productos,
-- pedidos de clientes y configuración en la nube.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLA: menu_items (Catálogo y Productos con Fotos)
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

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS presentations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- HABILITAR RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar duplicados
DROP POLICY IF EXISTS "menu_items_select_public" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_insert_public" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_update_public" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_delete_public" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_all_operations" ON public.menu_items;

-- Políticas de Acceso:
CREATE POLICY "menu_items_select_public"
    ON public.menu_items FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "menu_items_insert_public"
    ON public.menu_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "menu_items_update_public"
    ON public.menu_items FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "menu_items_delete_public"
    ON public.menu_items FOR DELETE
    TO anon, authenticated
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

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS qr_image TEXT;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods_select_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_all_operations" ON public.payment_methods;

CREATE POLICY "payment_methods_select_public"
    ON public.payment_methods FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "payment_methods_insert_public"
    ON public.payment_methods FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "payment_methods_update_public"
    ON public.payment_methods FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "payment_methods_delete_public"
    ON public.payment_methods FOR DELETE
    TO anon, authenticated
    USING (true);


-- --------------------------------------------------------------------
-- 3. TABLA: bakery_settings (Horarios y Configuración de la Pastelería)
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

ALTER TABLE public.bakery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bakery_settings_select_public" ON public.bakery_settings;
DROP POLICY IF EXISTS "bakery_settings_insert_public" ON public.bakery_settings;
DROP POLICY IF EXISTS "bakery_settings_update_public" ON public.bakery_settings;
DROP POLICY IF EXISTS "bakery_settings_all_operations" ON public.bakery_settings;

CREATE POLICY "bakery_settings_select_public"
    ON public.bakery_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "bakery_settings_insert_public"
    ON public.bakery_settings FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "bakery_settings_update_public"
    ON public.bakery_settings FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. TABLA: orders (Pedidos de Clientes, Comprobantes y Habeas Data)
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
    status TEXT NOT NULL DEFAULT 'Pendiente por validación' CHECK (status IN ('Pendiente por validación', 'Pendiente de pago', 'Confirmado', 'En preparación', 'En camino', 'Entregado', 'Pago no validado')),
    receipt_url TEXT,
    channel TEXT NOT NULL DEFAULT 'Web / QR',
    terms_accepted BOOLEAN NOT NULL DEFAULT true,
    data_consent BOOLEAN NOT NULL DEFAULT true,
    data_consent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_details TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_city TEXT DEFAULT 'Bucaramanga';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS data_consent BOOLEAN DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS data_consent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cookie_consent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_insert_checkout_public" ON public.orders;
DROP POLICY IF EXISTS "orders_select_public" ON public.orders;
DROP POLICY IF EXISTS "orders_update_public" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_public" ON public.orders;

CREATE POLICY "orders_insert_checkout_public"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "orders_select_public"
    ON public.orders FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "orders_update_public"
    ON public.orders FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "orders_delete_public"
    ON public.orders FOR DELETE
    TO anon, authenticated
    USING (true);

/* ====================================================================
 * TABLA 5: AUDITORÍA DE CONSENTIMIENTO DE COOKIES (TÉCNICAS Y ESENCIALES)
 * ==================================================================== */
CREATE TABLE IF NOT EXISTS public.cookie_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    necessary BOOLEAN DEFAULT true NOT NULL,
    analytics BOOLEAN DEFAULT false NOT NULL,
    marketing BOOLEAN DEFAULT false NOT NULL,
    user_agent TEXT,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cookie_consents_insert_public" ON public.cookie_consents;
DROP POLICY IF EXISTS "cookie_consents_select_public" ON public.cookie_consents;

CREATE POLICY "cookie_consents_insert_public"
    ON public.cookie_consents FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "cookie_consents_select_public"
    ON public.cookie_consents FOR SELECT
    TO anon, authenticated
    USING (true);

/* ====================================================================
 * TABLA 6: AUDITORÍA LEGAL DE TÉRMINOS, POLÍTICA DE PRIVACIDAD & HABEAS DATA
 * Cumplimiento Ley 1581 de 2012 (Protección de Datos Personales en Colombia)
 * ==================================================================== */
CREATE TABLE IF NOT EXISTS public.legal_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consent_type TEXT NOT NULL, -- 'terminos_y_condiciones', 'politica_privacidad', 'habeas_data', 'cookies'
    accepted BOOLEAN DEFAULT true NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    order_id TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_consents_insert_public" ON public.legal_consents;
DROP POLICY IF EXISTS "legal_consents_select_public" ON public.legal_consents;

CREATE POLICY "legal_consents_insert_public"
    ON public.legal_consents FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "legal_consents_select_public"
    ON public.legal_consents FOR SELECT
    TO anon, authenticated
    USING (true);
