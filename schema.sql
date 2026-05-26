-- U:DO CRAFT (B2B Merch Automation)
-- Supabase PostgreSQL Schema - Idempotent Version
-- Safe to run on existing database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- PRODUCTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price_cents INTEGER NOT NULL,
  images JSONB NOT NULL DEFAULT '{}',
  px_to_mm_ratio NUMERIC NOT NULL DEFAULT 0.5,
  collar_y_px INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_customizable BOOLEAN DEFAULT false,
  available_sizes TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PRINT ZONES TABLE
-- ─────────────────────────────────────────────
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'print_zone_side') THEN
    CREATE TYPE print_zone_side AS ENUM ('front', 'back');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS print_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  side print_zone_side NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LEADS TABLE (CRM)
-- ─────────────────────────────────────────────
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('draft', 'new', 'in_progress', 'production', 'completed', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status lead_status DEFAULT 'new',
  customer_data JSONB NOT NULL DEFAULT '{}',
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ORDER ITEMS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  custom_print_url TEXT,
  mockup_url TEXT,
  technical_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ANALYTICS: SITE EVENTS
-- ─────────────────────────────────────────────
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'site_event_type') THEN
    CREATE TYPE site_event_type AS ENUM (
      'pageview',
      'session_start',
      'form_submit',
      'customize_start',
      'customize_complete'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type site_event_type NOT NULL,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  page TEXT,
  referrer TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE (idempotent)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'description'
  ) THEN
    ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_print_zones_product_id') THEN
    CREATE INDEX idx_print_zones_product_id ON print_zones(product_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_lead_id') THEN
    CREATE INDEX idx_order_items_lead_id ON order_items(lead_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_product_id') THEN
    CREATE INDEX idx_order_items_product_id ON order_items(product_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_is_active') THEN
    CREATE INDEX idx_products_is_active ON products(is_active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_slug') THEN
    CREATE INDEX idx_products_slug ON products(slug);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_status') THEN
    CREATE INDEX idx_leads_status ON leads(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_created_at') THEN
    CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_site_events_type') THEN
    CREATE INDEX idx_site_events_type ON site_events(event_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_site_events_created_at') THEN
    CREATE INDEX idx_site_events_created_at ON site_events(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_site_events_session_id') THEN
    CREATE INDEX idx_site_events_session_id ON site_events(session_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_site_events_visitor_id') THEN
    CREATE INDEX idx_site_events_visitor_id ON site_events(visitor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_customer_email') THEN
    CREATE INDEX idx_leads_customer_email ON leads ((customer_data->>'email'));
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) - Idempotent
-- ─────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS print_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate
DO $$
BEGIN
  -- Products policies
  DROP POLICY IF EXISTS "Products public read" ON products;
  DROP POLICY IF EXISTS "Products admin write" ON products;
  CREATE POLICY "Products public read" ON products FOR SELECT USING (true);
  CREATE POLICY "Products admin write" ON products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

  -- Print zones policies
  DROP POLICY IF EXISTS "Print zones public read" ON print_zones;
  DROP POLICY IF EXISTS "Print zones admin write" ON print_zones;
  CREATE POLICY "Print zones public read" ON print_zones FOR SELECT USING (true);
  CREATE POLICY "Print zones admin write" ON print_zones FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

  -- Leads policies
  DROP POLICY IF EXISTS "Leads public create" ON leads;
  DROP POLICY IF EXISTS "Leads admin read" ON leads;
  DROP POLICY IF EXISTS "Leads admin update" ON leads;
  CREATE POLICY "Leads public create" ON leads FOR INSERT WITH CHECK (true);
  CREATE POLICY "Leads admin read" ON leads FOR SELECT USING (true);
  CREATE POLICY "Leads admin update" ON leads FOR UPDATE USING (auth.role() = 'authenticated');

  -- Order items policies
  DROP POLICY IF EXISTS "Order items admin all" ON order_items;
  DROP POLICY IF EXISTS "Order items public create" ON order_items;
  DROP POLICY IF EXISTS "Order items admin read" ON order_items;
  DROP POLICY IF EXISTS "Order items admin update" ON order_items;
  CREATE POLICY "Order items public create" ON order_items FOR INSERT WITH CHECK (true);
  CREATE POLICY "Order items admin read" ON order_items FOR SELECT USING (true);
  CREATE POLICY "Order items admin update" ON order_items FOR UPDATE USING (auth.role() = 'authenticated');

  -- Site events policies
  DROP POLICY IF EXISTS "Site events public insert" ON site_events;
  DROP POLICY IF EXISTS "Site events admin read" ON site_events;
  CREATE POLICY "Site events public insert" ON site_events FOR INSERT WITH CHECK (true);
  CREATE POLICY "Site events admin read" ON site_events FOR SELECT USING (auth.role() = 'authenticated');
END $$;

-- ─────────────────────────────────────────────
-- TRIGGERS FOR UPDATED_AT - Idempotent
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers and recreate
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
  CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
  CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- MESSAGES TABLE (Client ↔ Manager chat)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_sender') THEN
    CREATE TYPE message_sender AS ENUM ('client', 'manager');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  sender message_sender NOT NULL DEFAULT 'client',
  sender_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_lead_id') THEN
    CREATE INDEX idx_messages_lead_id ON messages(lead_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_created_at') THEN
    CREATE INDEX idx_messages_created_at ON messages(created_at ASC);
  END IF;
END $$;

ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Messages public insert" ON messages;
  DROP POLICY IF EXISTS "Messages admin all" ON messages;
  DROP POLICY IF EXISTS "Messages public read" ON messages;
  -- Clients can insert their own messages (public insert)
  CREATE POLICY "Messages public insert" ON messages FOR INSERT WITH CHECK (sender = 'client');
  -- Authenticated (admin) can do everything
  CREATE POLICY "Messages admin all" ON messages FOR ALL USING (auth.role() = 'authenticated');
  -- Anyone can read messages for their lead (we handle auth in API layer)
  CREATE POLICY "Messages public read" ON messages FOR SELECT USING (true);
END $$;

-- ─────────────────────────────────────────────
-- SIZE CHARTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS size_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_size_charts_created_at') THEN
    CREATE INDEX idx_size_charts_created_at ON size_charts(created_at DESC);
  END IF;
END $$;

ALTER TABLE IF EXISTS size_charts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Size charts admin all" ON size_charts;
  DROP POLICY IF EXISTS "Size charts public read" ON size_charts;
  CREATE POLICY "Size charts public read" ON size_charts FOR SELECT USING (true);
  CREATE POLICY "Size charts admin all" ON size_charts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_size_charts_updated_at ON size_charts;
  CREATE TRIGGER update_size_charts_updated_at BEFORE UPDATE ON size_charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- PRINT AREAS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS print_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  width_mm NUMERIC NOT NULL DEFAULT 0,
  height_mm NUMERIC NOT NULL DEFAULT 0,
  price_add_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_print_areas_created_at') THEN
    CREATE INDEX idx_print_areas_created_at ON print_areas(created_at DESC);
  END IF;
END $$;

ALTER TABLE IF EXISTS print_areas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Print areas admin all" ON print_areas;
  DROP POLICY IF EXISTS "Print areas public read" ON print_areas;
  CREATE POLICY "Print areas public read" ON print_areas FOR SELECT USING (true);
  CREATE POLICY "Print areas admin all" ON print_areas FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_print_areas_updated_at ON print_areas;
  CREATE TRIGGER update_print_areas_updated_at BEFORE UPDATE ON print_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- ADD MISSING COLUMNS TO PRODUCTS
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'size_chart_id'
  ) THEN
    ALTER TABLE products ADD COLUMN size_chart_id UUID REFERENCES size_charts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'print_area_ids'
  ) THEN
    ALTER TABLE products ADD COLUMN print_area_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- CATEGORIES TABLE (Футболка, Худі, Лонгслів…)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_slug') THEN
    CREATE INDEX idx_categories_slug ON categories(slug);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_sort_order') THEN
    CREATE INDEX idx_categories_sort_order ON categories(sort_order ASC);
  END IF;
END $$;

ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Categories public read" ON categories;
  DROP POLICY IF EXISTS "Categories admin write" ON categories;
  CREATE POLICY "Categories public read" ON categories FOR SELECT USING (true);
  CREATE POLICY "Categories admin write" ON categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
  CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- CLEANUP OLD TABLES
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS item_color_variants CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;

-- ─────────────────────────────────────────────
-- MATERIALS TABLE (Colors Dictionary)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_materials_sort_order') THEN
    CREATE INDEX idx_materials_sort_order ON materials(sort_order ASC);
  END IF;
END $$;

ALTER TABLE IF EXISTS materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Materials public read" ON materials;
  DROP POLICY IF EXISTS "Materials admin write" ON materials;
  CREATE POLICY "Materials public read" ON materials FOR SELECT USING (true);
  CREATE POLICY "Materials admin write" ON materials FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
  CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- PRODUCT COLOR VARIANTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_color_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  images JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_color_variants_product_id') THEN
    CREATE INDEX idx_product_color_variants_product_id ON product_color_variants(product_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_color_variants_material_id') THEN
    CREATE INDEX idx_product_color_variants_material_id ON product_color_variants(material_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS product_color_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Product color variants public read" ON product_color_variants;
  DROP POLICY IF EXISTS "Product color variants admin write" ON product_color_variants;
  CREATE POLICY "Product color variants public read" ON product_color_variants FOR SELECT USING (true);
  CREATE POLICY "Product color variants admin write" ON product_color_variants FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_product_color_variants_updated_at ON product_color_variants;
  CREATE TRIGGER update_product_color_variants_updated_at BEFORE UPDATE ON product_color_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- ADD category_id TO PRODUCTS
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- ADD discount_grid TO PRODUCTS
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'discount_grid'
  ) THEN
    ALTER TABLE products ADD COLUMN discount_grid JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'marketing_meta'
  ) THEN
    ALTER TABLE products ADD COLUMN marketing_meta JSONB DEFAULT '{}';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PRINT TYPE PRICING TABLE
-- Сітка цін для типів друку (DTF, вишивка тощо)
-- size_label: "8-10см", "11-15см" тощо
-- qty_tiers: JSONB масив [{min_qty, price_cents}]
-- print_type: відповідає PrintTypeId з фронтенду
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'print_type_enum') THEN
    CREATE TYPE print_type_enum AS ENUM ('dtf', 'embroidery', 'screen', 'sublimation', 'patch');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS print_type_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  print_type print_type_enum NOT NULL,
  size_label TEXT NOT NULL,           -- напр. "8-10см"
  size_min_cm NUMERIC NOT NULL,       -- мінімальний розмір (для сортування/пошуку)
  size_max_cm NUMERIC NOT NULL,       -- максимальний розмір
  qty_tiers JSONB NOT NULL DEFAULT '[]',
  -- qty_tiers формат: [{"min_qty": 1, "price_cents": 17000}, {"min_qty": 10, "price_cents": 16000}, ...]
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(print_type, size_label)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_print_type_pricing_type') THEN
    CREATE INDEX idx_print_type_pricing_type ON print_type_pricing(print_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_print_type_pricing_sort') THEN
    CREATE INDEX idx_print_type_pricing_sort ON print_type_pricing(print_type, sort_order ASC);
  END IF;
END $$;

ALTER TABLE IF EXISTS print_type_pricing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Print type pricing public read" ON print_type_pricing;
  DROP POLICY IF EXISTS "Print type pricing admin write" ON print_type_pricing;
  CREATE POLICY "Print type pricing public read" ON print_type_pricing FOR SELECT USING (true);
  CREATE POLICY "Print type pricing admin write" ON print_type_pricing FOR ALL
    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_print_type_pricing_updated_at ON print_type_pricing;
  CREATE TRIGGER update_print_type_pricing_updated_at BEFORE UPDATE ON print_type_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────
-- ADD allowed_print_types TO PRINT_ZONES
-- Які типи друку дозволені для цієї зони
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_zones' AND column_name = 'allowed_print_types'
  ) THEN
    ALTER TABLE print_zones ADD COLUMN allowed_print_types print_type_enum[] DEFAULT ARRAY['dtf']::print_type_enum[];
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- SEED: ВИШИВКА (embroidery) pricing
-- ─────────────────────────────────────────────
INSERT INTO print_type_pricing (print_type, size_label, size_min_cm, size_max_cm, qty_tiers, sort_order)
VALUES
  ('embroidery', '8-10см',  8,  10,
   '[{"min_qty":1,"price_cents":17000},{"min_qty":10,"price_cents":16000},{"min_qty":20,"price_cents":15300},{"min_qty":30,"price_cents":14000}]',
   1),
  ('embroidery', '11-15см', 11, 15,
   '[{"min_qty":1,"price_cents":25000},{"min_qty":10,"price_cents":23500},{"min_qty":20,"price_cents":22500},{"min_qty":30,"price_cents":21000}]',
   2),
  ('embroidery', '16-20см', 16, 20,
   '[{"min_qty":1,"price_cents":35000},{"min_qty":10,"price_cents":33000},{"min_qty":20,"price_cents":31500},{"min_qty":30,"price_cents":29500}]',
   3),
  ('embroidery', '21-28см', 21, 28,
   '[{"min_qty":1,"price_cents":45000},{"min_qty":10,"price_cents":42500},{"min_qty":20,"price_cents":40500},{"min_qty":30,"price_cents":38000}]',
   4)
ON CONFLICT (print_type, size_label) DO UPDATE SET
  qty_tiers = EXCLUDED.qty_tiers,
  size_min_cm = EXCLUDED.size_min_cm,
  size_max_cm = EXCLUDED.size_max_cm,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ─────────────────────────────────────────────
-- ERP GOODS MOVEMENT EXTENSIONS
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_document_status') THEN
    CREATE TYPE erp_document_status AS ENUM ('draft', 'posted', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_payment_status') THEN
    CREATE TYPE erp_payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_stock_movement_type') THEN
    ALTER TYPE erp_stock_movement_type ADD VALUE IF NOT EXISTS 'transfer_out';
    ALTER TYPE erp_stock_movement_type ADD VALUE IF NOT EXISTS 'transfer_in';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS erp_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO erp_warehouses (name, code, sort_order)
VALUES ('Основний склад', 'MAIN', 10), ('Виробництво', 'PROD', 20), ('Готова продукція', 'READY', 30)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS erp_goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_no TEXT NOT NULL DEFAULT ('REC-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
  supplier_id UUID REFERENCES erp_suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  status erp_document_status NOT NULL DEFAULT 'draft',
  comment TEXT,
  total_cents INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES erp_goods_receipts(id) ON DELETE CASCADE,
  erp_material_id UUID NOT NULL REFERENCES erp_materials(id) ON DELETE RESTRICT,
  unit TEXT NOT NULL DEFAULT 'шт.',
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variant_skus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_variant_id UUID REFERENCES product_color_variants(id) ON DELETE CASCADE,
  color_name TEXT,
  size TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  sewing_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (sewing_cost_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, color_variant_id, size)
);

CREATE TABLE IF NOT EXISTS product_variant_recipe_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_sku_id UUID NOT NULL REFERENCES product_variant_skus(id) ON DELETE CASCADE,
  erp_material_id UUID NOT NULL REFERENCES erp_materials(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'material',
  quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  production_step TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_production_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID NOT NULL REFERENCES erp_production_orders(id) ON DELETE CASCADE,
  variant_sku_id UUID REFERENCES product_variant_skus(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  due_date DATE,
  comment TEXT,
  material_requirements JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp_processing_acts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_no TEXT NOT NULL DEFAULT ('ACT-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
  production_order_id UUID REFERENCES erp_production_orders(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  status erp_document_status NOT NULL DEFAULT 'draft',
  comment TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_finished_goods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_sku_id UUID NOT NULL REFERENCES product_variant_skus(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_sku_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS erp_stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_no TEXT NOT NULL DEFAULT ('TRN-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
  from_warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  status erp_document_status NOT NULL DEFAULT 'draft',
  comment TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES erp_stock_transfers(id) ON DELETE CASCADE,
  erp_material_id UUID NOT NULL REFERENCES erp_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'шт.',
  comment TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE erp_stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES erp_warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES erp_goods_receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES erp_stock_transfers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processing_act_id UUID REFERENCES erp_processing_acts(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS payment_status erp_payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_requisites JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nova_poshta_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fiscal_data JSONB NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────
-- ERP CORE: materials, product recipes, production, stock movements
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_material_kind') THEN
    CREATE TYPE erp_material_kind AS ENUM ('garment', 'fabric', 'print_supply', 'hardware', 'thread', 'packaging', 'service', 'labor', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_stock_movement_type') THEN
    CREATE TYPE erp_stock_movement_type AS ENUM ('receipt', 'reservation', 'production_consume', 'production_output', 'adjustment', 'write_off');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'erp_production_status') THEN
    CREATE TYPE erp_production_status AS ENUM ('draft', 'planned', 'reserved', 'in_progress', 'done', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS erp_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  kind erp_material_kind NOT NULL DEFAULT 'other',
  unit TEXT NOT NULL DEFAULT 'шт.',
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  stock_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(14,3) NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_material_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  kind erp_material_kind NOT NULL DEFAULT 'other',
  unit TEXT NOT NULL DEFAULT 'шт.',
  color TEXT NOT NULL DEFAULT '#64748b',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE erp_materials
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES erp_material_types(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS product_recipe_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  erp_material_id UUID NOT NULL REFERENCES erp_materials(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'material',
  quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  waste_percent NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (waste_percent >= 0),
  production_step TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  document_no TEXT,
  status erp_production_status NOT NULL DEFAULT 'draft',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  planned_start_at TIMESTAMPTZ,
  planned_finish_at TIMESTAMPTZ,
  actual_finish_at TIMESTAMPTZ,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  actual_cost_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  erp_material_id UUID NOT NULL REFERENCES erp_materials(id) ON DELETE RESTRICT,
  production_order_id UUID REFERENCES erp_production_orders(id) ON DELETE SET NULL,
  movement_type erp_stock_movement_type NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_erp_materials_kind ON erp_materials(kind);
CREATE INDEX IF NOT EXISTS idx_erp_materials_type ON erp_materials(type_id);
CREATE INDEX IF NOT EXISTS idx_erp_material_types_sort ON erp_material_types(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_product_recipe_lines_product ON product_recipe_lines(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_erp_production_orders_status ON erp_production_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_stock_movements_material ON erp_stock_movements(erp_material_id, created_at DESC);

ALTER TABLE IF EXISTS erp_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_stock_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ERP materials admin all" ON erp_materials;
  DROP POLICY IF EXISTS "ERP material types admin all" ON erp_material_types;
  DROP POLICY IF EXISTS "Product recipes admin all" ON product_recipe_lines;
  DROP POLICY IF EXISTS "ERP production admin all" ON erp_production_orders;
  DROP POLICY IF EXISTS "ERP stock movements admin all" ON erp_stock_movements;
  CREATE POLICY "ERP materials admin all" ON erp_materials FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "ERP material types admin all" ON erp_material_types FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "Product recipes admin all" ON product_recipe_lines FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "ERP production admin all" ON erp_production_orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "ERP stock movements admin all" ON erp_stock_movements FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
END $$;

INSERT INTO erp_material_types (name, kind, unit, color, sort_order)
VALUES
  ('Тканина', 'fabric', 'м', '#16a34a', 10),
  ('Готова основа', 'garment', 'шт.', '#2563eb', 20),
  ('Матеріали друку', 'print_supply', 'шт.', '#7c3aed', 30),
  ('Фурнітура', 'hardware', 'шт.', '#f59e0b', 40),
  ('Нитки', 'thread', 'м', '#db2777', 50),
  ('Пакування', 'packaging', 'шт.', '#0891b2', 60),
  ('Послуга', 'service', 'посл.', '#64748b', 70),
  ('Робота', 'labor', 'год.', '#dc2626', 80),
  ('Інше', 'other', 'шт.', '#71717a', 90)
ON CONFLICT (name) DO UPDATE SET
  kind = EXCLUDED.kind,
  unit = EXCLUDED.unit,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ─────────────────────────────────────────────
-- SEED: ПРИНТИ (dtf) pricing
-- ─────────────────────────────────────────────
INSERT INTO print_type_pricing (print_type, size_label, size_min_cm, size_max_cm, qty_tiers, sort_order)
VALUES
  ('dtf', '8-10см',  8,  10,
   '[{"min_qty":1,"price_cents":12000},{"min_qty":5,"price_cents":9600},{"min_qty":10,"price_cents":9000},{"min_qty":20,"price_cents":8400},{"min_qty":40,"price_cents":7200}]',
   1),
  ('dtf', '15-20см', 15, 20,
   '[{"min_qty":1,"price_cents":20000},{"min_qty":5,"price_cents":16000},{"min_qty":10,"price_cents":15000},{"min_qty":20,"price_cents":14000},{"min_qty":40,"price_cents":12000}]',
   2),
  ('dtf', '25-30см', 25, 30,
   '[{"min_qty":1,"price_cents":25000},{"min_qty":5,"price_cents":20000},{"min_qty":10,"price_cents":18700},{"min_qty":20,"price_cents":17500},{"min_qty":40,"price_cents":15000}]',
   3),
  ('dtf', '35-40см', 35, 40,
   '[{"min_qty":1,"price_cents":30000},{"min_qty":5,"price_cents":24000},{"min_qty":10,"price_cents":22500},{"min_qty":20,"price_cents":21000},{"min_qty":40,"price_cents":18000}]',
   4),
  ('dtf', '40-50см', 40, 50,
   '[{"min_qty":1,"price_cents":40000},{"min_qty":5,"price_cents":32000},{"min_qty":10,"price_cents":30000},{"min_qty":20,"price_cents":28000},{"min_qty":40,"price_cents":24000}]',
   5)
ON CONFLICT (print_type, size_label) DO UPDATE SET
  qty_tiers = EXCLUDED.qty_tiers,
  size_min_cm = EXCLUDED.size_min_cm,
  size_max_cm = EXCLUDED.size_max_cm,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
