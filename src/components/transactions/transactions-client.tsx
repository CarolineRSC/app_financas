'use client'

import { useState, useMemo, useCallback } from 'react'
import { Transaction, TransactionFilters } from '@/lib/types'
import { filterTransactions, formatCurrency, formatDate, getCurrentMonthYear, exportToCSV } from '@/lib/utils'
import { ALL_CATEGORIES, CATEGORY_COLORS } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import TransactionModal from './transaction-modal'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: Transaction[]
}) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [filters, setFilters] = useState<TransactionFilters>({
    month: curMonth,
    year: curYear,
    category: '',
    search: '',
    type: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters])

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  function updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleAdd() {
    setEditingTransaction(null)
    setModalOpen(true)
  }

  function handleEdit(t: Transaction) {
    setEditingTransaction(t)
    setModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta transação?')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
    setDeletingId(null)
  }

  const handleSaved = useCallback((saved: Transaction, isEdit: boolean) => {
    setTransactions((prev) =>
      isEdit ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]
    )
    setModalOpen(false)
  }, [])

  function handleExportCSV() {
    const filename = `transacoes_${MONTHS[filters.month - 1]}_${filters.year}`
    exportToCSV(filtered, filename)
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} transações encontradas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <span>📥</span> Exportar CSV
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Nova transação
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={filters.month}
            onChange={(e) => updateFilter('month', Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) => updateFilter('year', Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value as TransactionFilters['type'])}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value as TransactionFilters['category'])}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todas as categorias</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Buscar descrição..."
            className="col-span-2 sm:col-span-3 lg:col-span-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-center">
          <p className="text-xs text-green-600 font-medium">Receitas</p>
          <p className="text-sm font-bold text-green-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-center">
          <p className="text-xs text-red-500 font-medium">Despesas</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-center ${(totalIncome - totalExpense) >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-medium ${(totalIncome - totalExpense) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>Saldo</p>
          <p className={`text-sm font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Table / List */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📭</span>
            <p className="text-sm font-medium">Nenhuma transação encontrada</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou adicione uma nova transação</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.description}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[t.category]}20`,
                          color: CATEGORY_COLORS[t.category],
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        t.type === 'income'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                        <span
                          className="text-xs rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[t.category]}20`,
                            color: CATEGORY_COLORS[t.category],
                          }}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(t)} className="rounded p-1 text-gray-400 hover:text-blue-600">✏️</button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        transaction={editingTransaction}
      />
    </div>
  )
}
