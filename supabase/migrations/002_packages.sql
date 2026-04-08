-- ============================================================
-- KAKMELL RESOURCES — Migration 002: Packages table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  price       decimal(10,2) NOT NULL,
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed some starter packages
INSERT INTO packages (name, price, description) VALUES
  ('Pakej Asas 300 pax',   3000.00, 'Nasi + Lauk Pauk + Air'),
  ('Pakej Asas 500 pax',   4500.00, 'Nasi + Lauk Pauk + Air'),
  ('Pakej Asas 700 pax',   6000.00, 'Nasi + Lauk Pauk + Air'),
  ('Pakej Premium 500 pax', 6500.00, 'Nasi + Lauk Pauk + Air + Dessert + Kuih'),
  ('Pakej Premium 700 pax', 8500.00, 'Nasi + Lauk Pauk + Air + Dessert + Kuih')
ON CONFLICT DO NOTHING;
