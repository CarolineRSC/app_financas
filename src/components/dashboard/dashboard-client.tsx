'use client'

import { useState, useMemo } from 'react'
import { Transaction, Account, Investment } from '@/lib/types'
import { filterTransactions, getCurrentMonthYear } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/categories'
import { usePreferences } from '@/lib/preferences-context'
import CategoryChart from './category-chart'

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)
const selectCls = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
const cardCls   = 'rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5'

interface Props {
  initialTransactions: Transaction[]
  initialAccounts: Account[]
  initialInvestments: Investment[]
}

export default function DashboardClient({ initialTransactions, initialAccounts, initialInvestments }: Props) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear()
  const [month, setMonth] = useState(curMonth)
  const [year,  setYear]  = useState(curYear)
  const { tr, fmt, prefs } = usePreferences()

  const MONTHS = prefs.language === 'en' ? MONTHS_EN : MONTHS_PT

  const filtered = useMemo(
    () => filterTransactions(initialTransactions, {
      filterMode: 'monthly', month, year,
      dateFrom: '', dateTo: '', category: '', search: '', type: '', expense_type: '',
    }),
    [initialTransactions, month, year]
  )

  const totalIncome   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense  = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalFixed    = filtered.filter(t => t.type === 'expense' && t.expense_type === 'fixed').reduce((s, t) => s + t.amount, 0)
  const totalVariable = filtered.filter(t => t.type === 'expense' && t.expense_type === 'variable').reduce((s, t) => s + t.amount, 0)
  const balance       = totalIncome - totalExpense

  const liquidCash  = initialAccounts.filter(a => a.type !== 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalDebt   = initialAccounts.filter(a => a.type === 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalInvested = initialInvestments.reduce((s, i) => s + i.invested_amount, 0)
  const totalInvValue = initialInvestments.reduce((s, i) => s + i.current_value, 0)
  const netWorth = liquidCash + totalInvValue - totalDebt

  const avgMonthlySpend = useMemo(() => {
    const months: number[] = []
    for (let i = 1; i <= 3; i++) {
      let m = curMonth - i; let y = curYear
      if (m <= 0) { m += 12; y -= 1 }
      const total = initialTransactions
        .filter(t => { const [ty, tm] = t.date.split('-').map(Number); return t.type === 'expense' && ty === y && tm === m })
        .reduce((s, t) => s + t.amount, 0)
      months.push(total)
    }
    const nonZero = months.filter(v => v > 0)
    return nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0
  }, [initialTransactions, curMonth, curYear])

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] ?? '#6b7280' }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.dashboard}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tr.thisMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selectCls}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectCls}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Net worth */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{tr.netWorth}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">💵 {tr.availableBalance}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(liquidCash)}</p>
          </div>
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📈 {tr.totalInvested}</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{fmt(totalInvValue)}</p>
            <p className={`text-xs mt-1 font-medium ${totalInvValue >= totalInvested ? 'text-green-500' : 'text-red-400'}`}>
              {totalInvValue >= totalInvested ? '▲' : '▼'} {fmt(Math.abs(totalInvValue - totalInvested))}
            </p>
          </div>
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">💳 {tr.creditCardDebt}</p>
            <p className="text-xl font-bold text-red-500 dark:text-red-400">{fmt(totalDebt)}</p>
          </div>
          <div className={`${cardCls} ${netWorth >= 0 ? 'border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' : 'border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">🏦 {tr.netWorth}</p>
            <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600'}`}>{fmt(netWorth)}</p>
          </div>
        </div>
      </div>

      {/* Monthly */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          {MONTHS[month - 1]} {year}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">↑ {tr.income}</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalIncome)}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.filter(t => t.type === 'income').length} {tr.transactions.toLowerCase()}</p>
          </div>
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">↓ {tr.expenses}</p>
            <p className="text-xl font-bold text-red-500">{fmt(totalExpense)}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.filter(t => t.type === 'expense').length} {tr.transactions.toLowerCase()}</p>
          </div>
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📌 {tr.fixed}</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{fmt(totalFixed)}</p>
            {totalExpense > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${Math.round((totalFixed / totalExpense) * 100)}%` }} />
              </div>
            )}
          </div>
          <div className={cardCls}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">🔄 {tr.variable}</p>
            <p className="text-xl font-bold text-orange-500 dark:text-orange-400">{fmt(totalVariable)}</p>
            {totalExpense > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${Math.round((totalVariable / totalExpense) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance + avg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className={`${cardCls} flex items-center gap-4`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-2xl ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
            {balance >= 0 ? '✅' : '⚠️'}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{tr.balance}</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{fmt(balance)}</p>
            <p className="text-xs text-gray-400">{tr.income.toLowerCase()} − {tr.expenses.toLowerCase()}</p>
          </div>
        </div>
        <div className={`${cardCls} flex items-center gap-4`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-2xl bg-amber-50 dark:bg-amber-900/30">📅</div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {prefs.language === 'en' ? 'Avg spend / month' : 'Gasto médio / mês'}
            </p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(avgMonthlySpend)}</p>
            <p className="text-xs text-gray-400">{prefs.language === 'en' ? 'last 3 months avg' : 'média dos últimos 3 meses'}</p>
          </div>
        </div>
      </div>

      {/* Category chart */}
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{tr.byCategory}</h2>
        {categoryData.length > 0 ? (
          <CategoryChart data={categoryData} fmt={fmt} />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm">{prefs.language === 'en' ? 'No expenses this period' : 'Sem despesas neste período'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
