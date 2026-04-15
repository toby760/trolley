-- ============================================
-- TROLLEY — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. HOUSEHOLDS
-- ============================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin TEXT NOT NULL UNIQUE CHECK (pin ~ '^\d{4}$'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast PIN lookup
CREATE INDEX idx_households_pin ON households(pin);

-- ============================================
-- 2. WEEKS
-- ============================================
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  aldi_actual NUMERIC(8,2) DEFAULT 0,
  woolworths_actual NUMERIC(8,2) DEFAULT 0,
  budget NUMERIC(8,2) DEFAULT 200.00,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, week_start)
);

CREATE INDEX idx_weeks_household ON weeks(household_id);
CREATE INDEX idx_weeks_start ON weeks(week_start DESC);

-- ============================================
-- 3. ITEMS
-- ============================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  store TEXT NOT NULL CHECK (store IN ('aldi', 'woolworths')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'moved')),
  added_by TEXT NOT NULL CHECK (added_by IN ('T', 'O')),
  estimated_price NUMERIC(8,2) DEFAULT 0,
  category TEXT DEFAULT 'general',
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_household ON items(household_id);
CREATE INDEX idx_items_week ON items(week_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_store ON items(store);
CREATE INDEX idx_items_sort ON items(household_id, week_id, store, sort_order);

-- Idempotent migration for existing deployments
ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 4. PRICE MEMORY
-- ============================================
CREATE TABLE price_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  store TEXT CHECK (store IN ('aldi', 'woolworths')),
  last_known_price NUMERIC(8,2) NOT NULL,
  purchase_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, product_name, store)
);

CREATE INDEX idx_price_memory_household ON price_memory(household_id);
CREATE INDEX idx_price_memory_product ON price_memory(product_name);

-- ============================================
-- 5. RECEIPTS
-- ============================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  store TEXT NOT NULL CHECK (store IN ('aldi', 'woolworths')),
  total NUMERIC(8,2),
  items_json JSONB DEFAULT '[]',
  raw_ocr_text TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_household ON receipts(household_id);
CREATE INDEX idx_receipts_week ON receipts(week_id);

-- ============================================
-- 6. STAPLES
-- ============================================
CREATE TABLE staples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  store TEXT DEFAULT 'aldi' CHECK (store IN ('aldi', 'woolworths')),
  frequency_count INTEGER DEFAULT 1,
  last_added TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, product_name)
);

CREATE INDEX idx_staples_household ON staples(household_id);
CREATE INDEX idx_staples_frequency ON staples(frequency_count DESC);

-- ============================================
-- 7. NOTIFICATIONS (in-app)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('item_added', 'budget_warning', 'reminder', 'shop_complete')),
  message TEXT NOT NULL,
  for_user TEXT NOT NULL CHECK (for_user IN ('T', 'O')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_household ON notifications(household_id);
CREATE INDEX idx_notifications_user ON notifications(for_user);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staples ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Since we use a PIN system (no auth), we allow all operations
-- via the anon key. In production, you'd want more restrictive policies.
CREATE POLICY "Allow all on households" ON households FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on weeks" ON weeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on price_memory" ON price_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on receipts" ON receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staples" ON staples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Run these in the Supabase Dashboard > Database > Replication
-- Or use the SQL below:
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE weeks;

-- ============================================
-- HELPER FUNCTION: Get or create current week
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_week(p_household_id UUID)
RETURNS UUID AS $$
DECLARE
  v_week_start DATE;
  v_week_id UUID;
BEGIN
  -- Get Monday of current week
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

  -- Try to find existing week
  SELECT id INTO v_week_id FROM weeks
  WHERE household_id = p_household_id AND week_start = v_week_start;

  -- Create if not found
  IF v_week_id IS NULL THEN
    INSERT INTO weeks (household_id, week_start)
    VALUES (p_household_id, v_week_start)
    RETURNING id INTO v_week_id;
  END IF;

  RETURN v_week_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Update staples frequency
-- ============================================
CREATE OR REPLACE FUNCTION update_staple_frequency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO staples (household_id, product_name, store, frequency_count, last_added)
  VALUES (NEW.household_id, NEW.name, NEW.store, 1, NOW())
  ON CONFLICT (household_id, product_name)
  DO UPDATE SET
    frequency_count = staples.frequency_count + 1,
    last_added = NOW(),
    store = NEW.store;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_staples
  AFTER INSERT ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_staple_frequency();


-- ============================================
-- 8. SHOP TRIPS (Fix 3)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  store TEXT NOT NULL CHECK (store IN ('aldi','woolworths')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reconciled')),
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reconciled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_shop_trips_household ON shop_trips(household_id);
CREATE INDEX IF NOT EXISTS idx_shop_trips_week ON shop_trips(week_id);
CREATE INDEX IF NOT EXISTS idx_shop_trips_status ON shop_trips(status);
ALTER TABLE shop_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on shop_trips" ON shop_trips;
CREATE POLICY "Allow all on shop_trips" ON shop_trips FOR ALL USING (true) WITH CHECK (true);

-- Add trip_id column to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES shop_trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_items_trip ON items(trip_id);
