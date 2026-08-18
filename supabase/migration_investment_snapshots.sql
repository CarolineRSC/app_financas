-- Investment snapshots: tracks portfolio value over time
-- Execute no Supabase SQL Editor

-- 1. Update investments type CHECK to new types
ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_type_check;
ALTER TABLE investments ADD CONSTRAINT investments_type_check
  CHECK (type IN ('401k', 'ira', 'roth_ira', 'stocks_etf', 'index_fund', 'high_yield', 'bonds', 'crypto', 'real_estate', 'other'));

-- 2. Create snapshots table
CREATE TABLE IF NOT EXISTS investment_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id  UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  value          NUMERIC(12,2) NOT NULL,
  recorded_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON investment_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert" ON investment_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_delete" ON investment_snapshots FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS investment_snapshots_user_id_idx ON investment_snapshots(user_id);
CREATE INDEX IF NOT EXISTS investment_snapshots_investment_id_idx ON investment_snapshots(investment_id);
CREATE INDEX IF NOT EXISTS investment_snapshots_recorded_at_idx ON investment_snapshots(recorded_at);
