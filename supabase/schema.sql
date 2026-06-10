-- ============================================================
-- Finança Fácil — Schema do Supabase
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT        NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date        DATE        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT        NOT NULL CHECK (
    category IN (
      'Alimentação', 'Transporte', 'Moradia', 'Lazer',
      'Saúde', 'Educação', 'Salário', 'Freelance', 'Outros'
    )
  ),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);

-- ============================================================
-- Row Level Security (RLS)
-- Garante que cada usuário acessa apenas suas próprias transações
-- ============================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política de leitura
CREATE POLICY "Usuários leem suas próprias transações"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Política de inserção
CREATE POLICY "Usuários inserem suas próprias transações"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de atualização
CREATE POLICY "Usuários atualizam suas próprias transações"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política de exclusão
CREATE POLICY "Usuários excluem suas próprias transações"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
