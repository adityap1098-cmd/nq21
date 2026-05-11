-- ============================================
-- NQ21 Performance — Master Data Seed
-- Run di Supabase SQL Editor sekali saat setup awal.
-- Idempotent: ON CONFLICT DO NOTHING — aman di-run ulang.
-- ============================================

-- CATEGORIES (13 kategori sesuai CLAUDE.md)
INSERT INTO categories (name, type, is_jasa) VALUES
  -- Income jasa (ada komisi mekanik)
  ('Jasa',          'income',  true),
  ('Dyno',          'income',  true),
  ('Bubut Luar',    'income',  true),
  ('Bubut Dalam',   'income',  true),
  -- Income non-jasa
  ('Oli',           'income',  false),
  ('Sparepart',     'income',  false),
  -- Expense
  ('Gaji',                'expense', false),
  ('Beli Stok Oli',       'expense', false),
  ('Beli Stok Sparepart', 'expense', false),
  ('Listrik & Air',       'expense', false),
  ('Sewa',                'expense', false),
  ('Bayar Vendor Bubut',  'expense', false),
  ('Lain-lain',           'expense', false)
ON CONFLICT DO NOTHING;

-- MECHANICS
INSERT INTO mechanics (name, is_active, notes) VALUES
  ('Doni', true, 'Senior mekanik')
ON CONFLICT DO NOTHING;

-- COMMISSION RATES for Doni × all jasa categories
-- Jasa: 30%, Dyno: 25%, Bubut Luar: 20%, Bubut Dalam: 40%
INSERT INTO commission_rates (mechanic_id, category_id, rate_percent)
SELECT
  m.id,
  c.id,
  CASE c.name
    WHEN 'Jasa'        THEN 30
    WHEN 'Dyno'        THEN 25
    WHEN 'Bubut Luar'  THEN 20
    WHEN 'Bubut Dalam' THEN 40
  END
FROM mechanics m
CROSS JOIN categories c
WHERE m.name = 'Doni'
  AND c.is_jasa = true
ON CONFLICT (mechanic_id, category_id) DO NOTHING;

-- VERIFY
SELECT 'categories'       AS "table", COUNT(*) AS rows FROM categories
UNION ALL
SELECT 'mechanics',        COUNT(*) FROM mechanics
UNION ALL
SELECT 'commission_rates', COUNT(*) FROM commission_rates;
