-- Tabela de investimentos
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS investments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('savings', 'high_yield', 'stocks', 'fixed_income', 'crypto', 'other')),
  invested_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value   NUMERIC(12,2) NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários leem seus próprios investimentos"
  ON investments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem seus próprios investimentos"
  ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam seus próprios investimentos"
  ON investments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários excluem seus próprios investimentos"
  ON investments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS investments_user_id_idx ON investments(user_id);
