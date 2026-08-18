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
  const en = prefs.language === 'en'

  const MONTHS = en ? MONTHS_EN : MONTHS_PT

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

  const liquidCash    = initialAccounts.filter(a => a.type !== 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalDebt     = initialAccounts.filter(a => a.type === 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalInvested = initialInvestments.reduce((s, i) => s + i.invested_amount, 0)
  const totalInvValue = initialInvestments.reduce((s, i) => s + i.current_value, 0)
  const netWorth      = liquidCash + totalInvValue - totalDebt

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

  const selectCls = 'rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors'

  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">{tr.dashboard}</h1>
          <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{tr.thisMonth}</p>
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

      {/* Net worth banner */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 px-6 py-5 mb-5 shadow-lg shadow-blue-500/15">
        <p className="text-[12px] font-semibold text-blue-200 uppercase tracking-wider mb-1">
          {tr.netWorth}
        </p>
        <p className="text-[32px] font-bold text-white tracking-tight tabular-nums leading-none mb-4">
          {fmt(netWorth)}
        </p>
        <div className="flex flex-wrap gap-5">
          <NetBadge label={en ? 'Cash' : 'Dinheiro'} value={fmt(liquidCash)} />
          <NetBadge label={en ? 'Invested' : 'Investido'} value={fmt(totalInvValue)} />
          <NetBadge label={en ? 'Debt' : 'Dívidas'} value={`−${fmt(totalDebt)}`} danger />
        </div>
      </div>

      {/* Monthly section label */}
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-0.5">
        {MONTHS[month - 1]} {year}
      </p>

      {/* Monthly cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard
          label={`↑ ${tr.income}`}
          value={fmt(totalIncome)}
          sub={`${filtered.filter(t => t.type === 'income').length} ${tr.transactions.toLowerCase()}`}
          valueClass="text-green-600 dark:text-green-400"
        />
        <StatCard
          label={`↓ ${tr.expenses}`}
          value={fmt(totalExpense)}
          sub={`${filtered.filter(t => t.type === 'expense').length} ${tr.transactions.toLowerCase()}`}
          valueClass="text-red-500 dark:text-red-400"
        />
        <StatCard
          label={`📌 ${tr.fixed}`}
          value={fmt(totalFixed)}
          bar={totalExpense > 0 ? totalFixed / totalExpense : 0}
          barColor="#a855f7"
          valueClass="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label={`🔄 ${tr.variable}`}
          value={fmt(totalVariable)}
          bar={totalExpense > 0 ? totalVariable / totalExpense : 0}
          barColor="#f97316"
          valueClass="text-orange-500 dark:text-orange-400"
        />
      </div>

      {/* Balance + avg row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-5 flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0 ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
            {balance >= 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
            )}
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">{tr.balance}</p>
            <p className={`text-[22px] font-bold tabular-nums tracking-tight ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
              {fmt(balance)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{tr.income.toLowerCase()} − {tr.expenses.toLowerCase()}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0 bg-amber-50 dark:bg-amber-950/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">
              {en ? 'Avg spend / month' : 'Gasto médio / mês'}
            </p>
            <p className="text-[22px] font-bold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">{fmt(avgMonthlySpend)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{en ? 'last 3 months' : 'últimos 3 meses'}</p>
          </div>
        </div>
      </div>

      {/* Category chart */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-5">
        <h2 className="text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wider">{tr.byCategory}</h2>
        {categoryData.length > 0 ? (
          <CategoryChart data={categoryData} fmt={fmt} />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 dark:text-gray-600">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <p className="text-[13px] font-medium">{en ? 'No expenses this period' : 'Sem despesas neste período'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, bar, barColor, valueClass }: {
  label: string; value: string; valueClass: string
  sub?: string; bar?: number; barColor?: string
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-4">
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-2">{label}</p>
      <p className={`text-[18px] font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {bar !== undefined && bar > 0 && (
        <div className="mt-2.5 h-1 rounded-full bg-gray-100 dark:bg-gray-700">
          <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${Math.round(bar * 100)}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  )
}

function NetBadge({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-blue-300 font-medium mb-0.5">{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums ${danger ? 'text-red-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}
