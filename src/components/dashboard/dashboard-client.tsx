'use client'

import { useState, useMemo } from 'react'
import { Transaction } from '@/lib/types'
import { filterTransactions, formatCurrency, formatDate, getCurrentMonthYear } from '@/lib/utils'
import { ALL_CATEGORIES, CATEGORY_COLORS } from '@/lib/categories'
import CategoryChart from './category-chart'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function DashboardClient({
  initialTransactions,
}: {
  initialTransactions: Transaction[]
}) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear()
  const [month, setMonth] = useState(curMonth)
  const [year, setYear] = useState(curYear)

  const filtered = useMemo(
    () => filterTransactions(initialTransactions, { month, year, category: '', search: '', type: '' }),
    [initialTransactions, month, year]
  )

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + t.amount
      })
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] ?? '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  const recent = filtered.slice(0, 8)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral das suas finanças</p>
        </div>
        {/* Month/Year filter */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Receitas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">↑</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.filter(t => t.type === 'income').length} transações</p>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Despesas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">↓</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.filter(t => t.type === 'expense').length} transações</p>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Saldo</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>
              ≡
            </span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {balance >= 0 ? 'Positivo' : 'Negativo'} no período
          </p>
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Pie Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Despesas por categoria</h2>
          {categoryData.length > 0 ? (
            <CategoryChart data={categoryData} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">Sem despesas neste período</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-3 rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Transações recentes</h2>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">Nenhuma transação neste período</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recent.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[t.category] ?? '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400">{t.category} · {formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ml-3 ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
