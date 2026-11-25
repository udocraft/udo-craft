-- Baseline for the core storefront/CRM tables (products, print zones, leads,
-- order items, messages, site events, size charts, print areas, categories,
-- materials, product colour variants, print type pricing).
--
-- These tables were only ever created by schema.sql, so the migration history
-- alone could not rebuild the database: the first migration already referenced
-- them. This file is dated before every other migration so a fresh database
-- (supabase db reset, branches, CI) gets them first.
--
-- Production already has all of it. Everything here is idempotent and purely
-- additive (IF NOT EXISTS, guarded CREATE TYPE, ADD COLUMN IF NOT EXISTS). It
-- deliberately contains NO policies and NO seed data: the legacy permissive
-- policies from schema.sql were replaced by 20261022000000_rls_hardening.sql and
-- must never be recreated. On production, mark it applied instead of running it:
--   supabase migration repair --status applied 20231231000000
--
-- Generated from schema.sql lines 1-612 (policies, seeds and old-table drops removed).

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
  tags TEXT[] NOT NULL DEFAULT '{}',
  visitor_id TEXT,
  session_id TEXT,
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
  unit_price_cents INTEGER,
  print_cost_cents INTEGER,
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
  -- Clients can insert their own messages (public insert)
  -- Authenticated (admin) can do everything
  -- Anyone can read messages for their lead (we handle auth in API layer)
END $$;

-- ─────────────────────────────────────────────
-- SIZE CHARTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS size_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
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
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
  CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

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
