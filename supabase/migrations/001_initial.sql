-- ============================================================
-- KAKMELL RESOURCES — Initial Schema Migration
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name      text NOT NULL,
  event_date       date NOT NULL,
  hall_name        text,
  pax              integer NOT NULL,
  package_price    decimal(10,2),
  addons           jsonb DEFAULT '[]',
  total_amount     decimal(10,2),
  deposit_paid     decimal(10,2) DEFAULT 0,
  payments         jsonb DEFAULT '[]',   -- [{date, amount, note}]
  balance          decimal(10,2) GENERATED ALWAYS AS (total_amount - deposit_paid) STORED,
  status           text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes            text,
  tentative        text,
  menu_selection   jsonb,
  created_at       timestamptz DEFAULT now()
);

-- Index: upcoming events sorted by date
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings (event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);

-- ============================================================
-- TABLE: ingredient_ratios
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredient_ratios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL CHECK (category IN ('main', 'dalca', 'bubur', 'acar', 'paceri')),
  item_name    text NOT NULL,
  pax_300      jsonb,   -- {qty, unit}
  pax_400      jsonb,
  pax_500      jsonb,
  pax_600      jsonb,
  pax_700      jsonb,
  pax_800      jsonb,
  pax_900      jsonb,
  pax_1000     jsonb,
  notes        text,
  UNIQUE (category, item_name)
);

-- ============================================================
-- TABLE: menu_options
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_options (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL CHECK (category IN ('nasi', 'ayam', 'daging', 'acar', 'dalca', 'bubur', 'buah', 'air', 'kuih')),
  name_ms      text NOT NULL,
  name_en      text,
  is_active    boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_menu_options_category ON menu_options (category);

-- ============================================================
-- TABLE: invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_no   text UNIQUE,   -- INV-YYYY-NNN
  issued_date  date DEFAULT CURRENT_DATE,
  items        jsonb DEFAULT '[]',   -- [{description, qty, unit_price, amount}]
  subtotal     decimal(10,2),
  total        decimal(10,2),
  status       text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  pdf_url      text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices (invoice_no);

-- ============================================================
-- TABLE: halls (admin-configurable hall list)
-- ============================================================
CREATE TABLE IF NOT EXISTS halls (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  is_active boolean DEFAULT true
);

-- Seed default halls
INSERT INTO halls (name) VALUES
  ('Asmara Hall'),
  ('Juwita Hall'),
  ('Elham Hall')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable and allow all for authenticated users (single family account)
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE halls ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated full access" ON bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON ingredient_ratios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON menu_options
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON halls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
