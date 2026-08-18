-- Migration: adiciona constraints de validação server-side nas tabelas accounts e investments
-- Execute no Supabase SQL Editor

-- ── accounts ──────────────────────────────────────────────────────────────────
-- Saldo deve ser >= 0 e abaixo de 1 bilhão (evita números absurdos)
ALTER TABLE accounts
  ADD CONSTRAINT accounts_balance_range
    CHECK (balance >= 0 AND balance < 1000000000);

-- Limita tamanho dos campos de texto (já existem no código, mas garante no banco)
ALTER TABLE accounts
  ADD CONSTRAINT accounts_name_length
    CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

ALTER TABLE accounts
  ADD CONSTRAINT accounts_institution_length
    CHECK (char_length(institution) >= 1 AND char_length(institution) <= 100);

-- ── investments ───────────────────────────────────────────────────────────────
-- Valores investidos e atuais devem ser >= 0 e abaixo de 1 bilhão
ALTER TABLE investments
  ADD CONSTRAINT investments_invested_amount_range
    CHECK (invested_amount >= 0 AND invested_amount < 1000000000);

ALTER TABLE investments
  ADD CONSTRAINT investments_current_value_range
    CHECK (current_value >= 0 AND current_value < 1000000000);

ALTER TABLE investments
  ADD CONSTRAINT investments_name_length
    CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

-- ── transactions (já tinha CHECK amount > 0, reforçar com teto) ───────────────
ALTER TABLE transactions
  ADD CONSTRAINT transactions_amount_max
    CHECK (amount < 1000000000);

ALTER TABLE transactions
  ADD CONSTRAINT transactions_description_length
    CHECK (char_length(description) >= 1 AND char_length(description) <= 200);
