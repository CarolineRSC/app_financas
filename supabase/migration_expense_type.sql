-- Adiciona coluna expense_type às transações existentes
-- Execute no Supabase SQL Editor

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'variable'
  CHECK (expense_type IN ('fixed', 'variable'));
