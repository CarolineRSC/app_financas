-- Tabela de contas bancárias
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  institution TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'high_yield', 'credit_card', 'other')),
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários leem suas próprias contas"
  ON accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem suas próprias contas"
  ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam suas próprias contas"
  ON accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários excluem suas próprias contas"
  ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
