export type TransactionType = 'income' | 'expense'
export type ExpenseType = 'fixed' | 'variable'

export type Category =
  | 'Alimentação'
  | 'Transporte'
  | 'Moradia'
  | 'Lazer'
  | 'Saúde'
  | 'Educação'
  | 'Salário'
  | 'Freelance'
  | 'Outros'

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  type: TransactionType
  category: Category
  expense_type: ExpenseType
  created_at: string
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'other'

export interface Account {
  id: string
  user_id: string
  name: string
  institution: string
  type: AccountType
  balance: number
  updated_at: string
  notes: string | null
  created_at: string
}

export type InvestmentType =
  | '401k'
  | 'ira'
  | 'roth_ira'
  | 'stocks_etf'
  | 'index_fund'
  | 'high_yield'
  | 'bonds'
  | 'crypto'
  | 'real_estate'
  | 'other'

export interface Investment {
  id: string
  user_id: string
  name: string
  type: InvestmentType
  invested_amount: number
  current_value: number
  date: string
  notes: string | null
  created_at: string
}

export interface InvestmentSnapshot {
  id: string
  user_id: string
  investment_id: string
  value: number
  recorded_at: string
  created_at: string
}

export type FilterMode = 'monthly' | 'ytd' | 'range'

export interface TransactionFilters {
  filterMode: FilterMode
  month: number
  year: number
  dateFrom: string
  dateTo: string
  category: Category | ''
  search: string
  type: TransactionType | ''
  expense_type: ExpenseType | ''
}
