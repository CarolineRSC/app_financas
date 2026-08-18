'use client'

import { useState, useEffect } from 'react'
import { Transaction, TransactionType, Category, ExpenseType } from '@/lib/types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (transaction: Transaction, isEdit: boolean) => void
  transaction: Transaction | null
}

const today = new Date().toISOString().split('T')[0]

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100'

export default function TransactionModal({ open, onClose, onSaved, transaction }: Props) {
  const isEdit = !!transaction
  const { tr, prefs } = usePreferences()
  const en = prefs.language === 'en'

  const [type,        setType]        = useState<TransactionType>('expense')
  const [expenseType, setExpenseType] = useState<ExpenseType>('variable')
  const [description, setDescription] = useState('')
  const [amount,      setAmount]      = useState('')
  const [date,        setDate]        = useState(today)
  const [category,    setCategory]    = useState<Category>('Alimentação')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (transaction) {
      setType(transaction.type)
      setExpenseType(transaction.expense_type ?? 'variable')
      setDescription(transaction.description)
      setAmount(transaction.amount.toString())
      setDate(transaction.date)
      setCategory(transaction.category)
    } else {
      setType('expense')
      setExpenseType('variable')
      setDescription('')
      setAmount('')
      setDate(today)
      setCategory('Alimentação')
    }
    setError('')
  }, [transaction, open])

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0])
  }, [type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(en ? 'Enter a valid amount greater than zero.' : 'Informe um valor válido maior que zero.')
      return
    }
    if (!description.trim()) {
      setError(en ? 'Enter a description.' : 'Informe uma descrição.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError(en ? 'Session expired. Please sign in again.' : 'Sessão expirada. Faça login novamente.')
      setLoading(false)
      return
    }

    const payload = {
      description: description.trim(),
      amount: numAmount,
      date,
      type,
      category,
      expense_type: expenseType,
    }

    if (isEdit && transaction) {
      const { data, error: err } = await supabase.from('transactions').update(payload).eq('id', transaction.id).select().single()
      if (err) { setError(en ? 'Failed to save. Please try again.' : 'Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Transaction, true)
    } else {
      const { data, error: err } = await supabase.from('transactions').insert({ ...payload, user_id: user.id }).select().single()
      if (err) { setError(en ? 'Failed to save. Please try again.' : 'Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Transaction, false)
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? (en ? 'Edit transaction' : 'Editar transação') : tr.addTransaction}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type: expense / income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {en ? 'Type' : 'Tipo'}
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-700">
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`rounded-md py-2 text-sm font-medium transition-all ${
                    type === t
                      ? t === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  {t === 'expense' ? `↓ ${tr.expenseLabel}` : `↑ ${tr.incomeLabel}`}
                </button>
              ))}
            </div>
          </div>

          {/* Expense type: fixed / variable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {en ? 'Expense type' : 'Tipo de gasto'}
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-700">
              {(['variable', 'fixed'] as ExpenseType[]).map((et) => (
                <button key={et} type="button" onClick={() => setExpenseType(et)}
                  className={`rounded-md py-2 text-sm font-medium transition-all ${
                    expenseType === et
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  {et === 'fixed' ? `📌 ${tr.fixed}` : `🔄 ${tr.variable}`}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {tr.description}
            </label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              required maxLength={200}
              placeholder={en ? 'e.g. Grocery, Salary...' : 'Ex: Supermercado, Salário...'}
              className={inputCls} />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {tr.amount}
              </label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                required min="0.01" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {tr.date}
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {tr.category}
            </label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} className={inputCls}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {tr.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? tr.loading : isEdit ? tr.saveChanges : tr.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
