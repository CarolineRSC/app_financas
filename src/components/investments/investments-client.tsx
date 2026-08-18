'use client'

import { useState, useMemo, useCallback } from 'react'
import { Investment, InvestmentType, InvestmentSnapshot } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import InvestmentModal from './investment-modal'

export default function InvestmentsClient({
  initialInvestments,
  initialSnapshots,
}: {
  initialInvestments: Investment[]
  initialSnapshots: InvestmentSnapshot[]
}) {
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments)
  const [snapshots,   setSnapshots]   = useState<InvestmentSnapshot[]>(initialSnapshots)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Investment | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const { tr, fmt, prefs } = usePreferences()
  const en = prefs.language === 'en'

  const TYPE_META: Record<InvestmentType, { label: string; icon: string; color: string }> = {
    '401k':       { label: '401k',                                        icon: '🏢', color: '#3b82f6' },
    ira:          { label: 'IRA',                                         icon: '🏦', color: '#8b5cf6' },
    roth_ira:     { label: 'Roth IRA',                                    icon: '⭐', color: '#6366f1' },
    stocks_etf:   { label: 'Stocks & ETFs',                               icon: '📈', color: '#22c55e' },
    index_fund:   { label: 'Index Fund',                                  icon: '📊', color: '#10b981' },
    high_yield:   { label: 'High Yield',                                  icon: '💰', color: '#f59e0b' },
    bonds:        { label: 'Bonds',                                       icon: '📄', color: '#64748b' },
    crypto:       { label: 'Crypto',                                      icon: '🪙', color: '#f97316' },
    real_estate:  { label: 'Real Estate',                                 icon: '🏠', color: '#ec4899' },
    other:        { label: tr.others,                                     icon: '📁', color: '#6b7280' },
  }

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0)
  const totalCurrent  = investments.reduce((s, i) => s + i.current_value, 0)
  const totalGain     = totalCurrent - totalInvested
  const gainPct       = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  // Portfolio chart data: sum all investment values per date from snapshots
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    snapshots.forEach(s => {
      // Sum all investment values on that date
      byDate[s.recorded_at] = (byDate[s.recorded_at] ?? 0) + s.value
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date: date.slice(5), // show MM-DD
        value,
        fullDate: date,
      }))
  }, [snapshots])

  const byType = useMemo(() => {
    const map: Record<string, { current: number; count: number }> = {}
    investments.forEach(inv => {
      if (!map[inv.type]) map[inv.type] = { current: 0, count: 0 }
      map[inv.type].current += inv.current_value
      map[inv.type].count++
    })
    return Object.entries(map).map(([type, v]) => ({
      type: type as InvestmentType,
      ...v,
      pct: totalCurrent > 0 ? (v.current / totalCurrent) * 100 : 0,
    })).sort((a, b) => b.current - a.current)
  }, [investments, totalCurrent])

  function handleAdd() { setEditing(null); setModalOpen(true) }
  function handleEdit(inv: Investment) { setEditing(inv); setModalOpen(true) }

  async function handleDelete(id: string) {
    if (!confirm(en ? 'Delete this investment?' : 'Deseja excluir este investimento?')) return
    setDeletingId(id)
    const { error } = await createClient().from('investments').delete().eq('id', id)
    if (!error) {
      setInvestments(prev => prev.filter(i => i.id !== id))
      setSnapshots(prev => prev.filter(s => s.investment_id !== id))
    }
    setDeletingId(null)
  }

  const handleSaved = useCallback((saved: Investment, isEdit: boolean) => {
    setInvestments(prev => isEdit ? prev.map(i => i.id === saved.id ? saved : i) : [saved, ...prev])
    // Add a new snapshot entry locally so chart updates immediately
    setSnapshots(prev => [...prev, {
      id: crypto.randomUUID(),
      user_id: saved.user_id,
      investment_id: saved.id,
      value: saved.current_value,
      recorded_at: saved.date,
      created_at: new Date().toISOString(),
    }])
    setModalOpen(false)
  }, [])

  const cardCls = 'rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.investments}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {investments.length} {en ? `asset${investments.length !== 1 ? 's' : ''}` : `ativo${investments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm self-start sm:self-auto">
          + {tr.addInvestment}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${cardCls} p-5`}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{tr.totalInvested}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{fmt(totalInvested)}</p>
        </div>
        <div className={`${cardCls} p-5`}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{tr.totalCurrentValue}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmt(totalCurrent)}</p>
        </div>
        <div className={`${cardCls} p-5`}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{tr.totalReturn}</p>
          <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
          </p>
          <p className={`text-xs mt-1 font-medium ${totalGain >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            {totalGain >= 0 ? '▲' : '▼'} {Math.abs(gainPct).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Portfolio chart */}
      {chartData.length > 1 && (
        <div className={`${cardCls} p-5 mb-6`}>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            📈 {en ? 'Portfolio value over time' : 'Evolução do portfólio'}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => fmt(v).replace(/\.00$/, '')}
                width={80}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), en ? 'Portfolio' : 'Portfólio']}
                labelFormatter={(l) => l}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                  backgroundColor: 'white',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Allocation + Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Allocation by type */}
        <div className={`lg:col-span-2 ${cardCls} p-5`}>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {en ? 'Allocation by type' : 'Alocação por tipo'}
          </h2>
          {byType.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">{tr.noInvestments}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {byType.map(item => {
                const meta = TYPE_META[item.type]
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{meta.icon} {meta.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{fmt(item.current)} · {item.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: meta.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Assets list */}
        <div className={`lg:col-span-3 ${cardCls} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {en ? 'Your assets' : 'Seus ativos'}
            </h2>
          </div>
          {investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-4xl mb-3">💼</span>
              <p className="text-sm font-medium">{tr.noInvestments}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {investments.map(inv => {
                const meta  = TYPE_META[inv.type]
                const gain  = inv.current_value - inv.invested_amount
                const gainP = inv.invested_amount > 0 ? (gain / inv.invested_amount) * 100 : 0
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 text-lg"
                      style={{ backgroundColor: `${meta.color}20` }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{inv.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(inv.date)}</span>
                      </div>
                      {inv.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{inv.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{fmt(inv.current_value)}</p>
                      <p className={`text-xs font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainP >= 0 ? '+' : ''}{gainP.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(inv)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">✏️</button>
                      <button onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors disabled:opacity-50">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <InvestmentModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} investment={editing} />
    </div>
  )
}
