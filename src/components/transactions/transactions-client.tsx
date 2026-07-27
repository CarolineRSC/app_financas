'use client'

import { useState, useMemo, useCallback } from 'react'
import { Transaction, TransactionFilters, FilterMode } from '@/lib/types'
import { filterTransactions, formatCurrency, formatDate, getCurrentMonthYear, exportToCSV, exportToExcel } from '@/lib/utils'
import { ALL_CATEGORIES, CATEGORY_COLORS } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import TransactionModal from './transaction-modal'
import ImportModal from './import-modal'
import PdfImportModal from './pdf-import-modal'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: Transaction[]
}) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const today = new Date().toISOString().split('T')[0]
  const jan1  = `${curYear}-01-01`

  const [filters, setFilters] = useState<TransactionFilters>({
    filterMode: 'monthly',
    month: curMonth,
    year: curYear,
    dateFrom: jan1,
    dateTo: today,
    category: '',
    search: '',
    type: '',
    expense_type: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pdfImportOpen, setPdfImportOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => Number(t.date.split('-')[0])))
    if (years.size === 0) years.add(curYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [transactions, curYear])

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters])

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalFixed = filtered.filter(t => t.type === 'expense' && t.expense_type === 'fixed').reduce((s, t) => s + t.amount, 0)
  const totalVariable = filtered.filter(t => t.type === 'expense' && t.expense_type === 'variable').reduce((s, t) => s + t.amount, 0)

  const isAllSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))
  const isPartialSelected = !isAllSelected && filtered.some(t => selectedIds.has(t.id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
  }

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
    if (!error) setTransactions((prev) => prev.filter((t) => t.id !== id))
    setDeletingId(null)
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    const supabase = createClient()
    const ids = [...selectedIds]
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (!error) {
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)))
      setSelectedIds(new Set())
    }
    setIsBulkDeleting(false)
    setConfirmDeleteOpen(false)
  }

  const handleSaved = useCallback((saved: Transaction, isEdit: boolean) => {
    setTransactions((prev) =>
      isEdit ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]
    )
    setModalOpen(false)
  }, [])

  const handleImported = useCallback((imported: Transaction[]) => {
    setTransactions((prev) => [...imported, ...prev])
  }, [])

  const filename = `transacoes_${MONTHS[filters.month - 1]}_${filters.year}`

  const sel = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} transações encontradas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPdfImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            📄 Importar PDF
          </button>
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            📤 Importar Excel
          </button>
          <button onClick={() => exportToExcel(filtered, filename)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            📊 Exportar Excel
          </button>
          <button onClick={() => exportToCSV(filtered, filename)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            📥 CSV
          </button>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
            <span className="text-lg leading-none">+</span> Nova transação
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Year dropdown — only years with data + Ano atual + Período */}
          <select
            value={filters.filterMode === 'ytd' ? 'ytd' : filters.filterMode === 'range' ? 'range' : filters.year}
            onChange={e => {
              const v = e.target.value
              if (v === 'ytd')    setFilters(p => ({ ...p, filterMode: 'ytd' }))
              else if (v === 'range') setFilters(p => ({ ...p, filterMode: 'range' }))
              else setFilters(p => ({ ...p, filterMode: 'monthly', year: Number(v) }))
            }}
            className={sel}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            <option disabled>──────────</option>
            <option value="ytd">📆 Ano atual</option>
            <option value="range">🗓 Período</option>
          </select>

          {/* Month — only shown in monthly mode */}
          {filters.filterMode === 'monthly' && (
            <select value={filters.month} onChange={e => updateFilter('month', Number(e.target.value))} className={sel}>
              <option value={0}>Todos os meses</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}

          {/* Date pickers — shown in range mode */}
          {filters.filterMode === 'range' && (
            <>
              <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className={sel} />
              <input type="date" value={filters.dateTo}   onChange={e => updateFilter('dateTo',   e.target.value)} className={sel} />
            </>
          )}

          <select value={filters.type} onChange={e => updateFilter('type', e.target.value as TransactionFilters['type'])} className={sel}>
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select value={filters.expense_type} onChange={e => updateFilter('expense_type', e.target.value as TransactionFilters['expense_type'])} className={sel}>
            <option value="">Fixo e variável</option>
            <option value="fixed">📌 Fixo</option>
            <option value="variable">🔄 Variável</option>
          </select>
          <select value={filters.category} onChange={e => updateFilter('category', e.target.value as TransactionFilters['category'])} className={sel}>
            <option value="">Todas as categorias</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Buscar..."
            className={`${sel} placeholder-gray-400`} />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-4 py-3 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Receitas</p>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-4 py-3 text-center">
          <p className="text-xs text-red-500 dark:text-red-400 font-medium">Despesas</p>
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 px-4 py-3 text-center">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">📌 Fixas</p>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-400">{formatCurrency(totalFixed)}</p>
        </div>
        <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 px-4 py-3 text-center">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">🔄 Variáveis</p>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totalVariable)}</p>
        </div>
      </div>

      {/* Table / List */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
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
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {['Data','Categoria','Nome','Tipo','Valor','Gasto'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-2">
                      <span>Ações</span>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isPartialSelected }}
                        onChange={toggleSelectAll}
                        title="Selecionar todos"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer accent-blue-600"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: `${CATEGORY_COLORS[t.category]}25`, color: CATEGORY_COLORS[t.category] }}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 max-w-[220px]">
                      <span className="block truncate" title={t.description}>{t.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${t.type === 'income' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {t.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${t.expense_type === 'fixed' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                        {t.expense_type === 'fixed' ? '📌 Fixo' : '🔄 Variável'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">✏️</button>
                        <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors disabled:opacity-50">🗑️</button>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer accent-blue-600"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map(t => (
                <div key={t.id} className={`px-4 py-3 ${selectedIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Date + category row */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                        <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                          style={{ backgroundColor: `${CATEGORY_COLORS[t.category]}25`, color: CATEGORY_COLORS[t.category] }}>
                          {t.category}
                        </span>
                      </div>
                      {/* Name */}
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                      {/* Type + gasto */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${t.type === 'income' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                          {t.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                        </span>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${t.expense_type === 'fixed' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                          {t.expense_type === 'fixed' ? '📌 Fixo' : '🔄 Var.'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(t)} className="rounded p-1 text-gray-400 hover:text-blue-600">✏️</button>
                        <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-50">🗑️</button>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating bulk-delete bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-gray-900 dark:bg-gray-100 px-5 py-3 shadow-2xl">
          <span className="text-sm font-medium text-white dark:text-gray-900">
            {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors">
            Cancelar
          </button>
          <button onClick={() => setConfirmDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors">
            🗑️ Deletar {selectedIds.size}
          </button>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isBulkDeleting && setConfirmDeleteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
              Deletar transações
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Tem certeza que deseja deletar{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedIds.size} {selectedIds.size === 1 ? 'transação' : 'transações'}</span>?
              <br />Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isBulkDeleting}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                {isBulkDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Deletando...
                  </>
                ) : 'Sim, deletar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        transaction={editingTransaction}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      <PdfImportModal
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  )
}
