'use client'

import { useState, useMemo, useCallback } from 'react'
import { Account, AccountType, Investment, InvestmentType, InvestmentSnapshot } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AccountModal from '@/components/accounts/account-modal'
import InvestmentModal from '@/components/investments/investment-modal'

type Tab = 'overview' | 'accounts' | 'investments'

const ACCOUNT_META: Record<AccountType, { label: string; labelPt: string; icon: string; color: string; isDebt: boolean }> = {
  checking:    { label: 'Checking',    labelPt: 'Corrente',     icon: '🏦', color: '#3b82f6', isDebt: false },
  savings:     { label: 'Savings',     labelPt: 'Poupança',     icon: '💵', color: '#22c55e', isDebt: false },
  cash:        { label: 'Cash',        labelPt: 'Dinheiro',     icon: '💴', color: '#10b981', isDebt: false },
  credit_card: { label: 'Credit Card', labelPt: 'Cartão',       icon: '💳', color: '#ef4444', isDebt: true  },
  other:       { label: 'Other',       labelPt: 'Outros',       icon: '📁', color: '#6b7280', isDebt: false },
}

const INVESTMENT_META: Record<InvestmentType, { label: string; icon: string; color: string }> = {
  '401k':      { label: '401k',          icon: '🏢', color: '#3b82f6' },
  ira:         { label: 'IRA',           icon: '🏦', color: '#8b5cf6' },
  roth_ira:    { label: 'Roth IRA',      icon: '⭐', color: '#6366f1' },
  stocks_etf:  { label: 'Stocks & ETFs', icon: '📈', color: '#22c55e' },
  index_fund:  { label: 'Index Fund',    icon: '📊', color: '#10b981' },
  high_yield:  { label: 'High Yield',    icon: '💰', color: '#f59e0b' },
  bonds:       { label: 'Bonds',         icon: '📄', color: '#64748b' },
  crypto:      { label: 'Crypto',        icon: '🪙', color: '#f97316' },
  real_estate: { label: 'Real Estate',   icon: '🏠', color: '#ec4899' },
  other:       { label: 'Other',         icon: '📁', color: '#6b7280' },
}

interface Props {
  initialAccounts: Account[]
  initialInvestments: Investment[]
  initialSnapshots: InvestmentSnapshot[]
}

export default function NetWorthClient({ initialAccounts, initialInvestments, initialSnapshots }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [accounts, setAccounts]       = useState<Account[]>(initialAccounts)
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments)
  const [snapshots, setSnapshots]     = useState<InvestmentSnapshot[]>(initialSnapshots)

  const [accModalOpen, setAccModalOpen]   = useState(false)
  const [editingAcc, setEditingAcc]       = useState<Account | null>(null)
  const [deletingAccId, setDeletingAccId] = useState<string | null>(null)

  const [invModalOpen, setInvModalOpen]   = useState(false)
  const [editingInv, setEditingInv]       = useState<Investment | null>(null)
  const [deletingInvId, setDeletingInvId] = useState<string | null>(null)

  const { tr, fmt, prefs } = usePreferences()
  const en = prefs.language === 'en'

  // Totals
  const liquidCash   = accounts.filter(a => !ACCOUNT_META[a.type].isDebt).reduce((s, a) => s + a.balance, 0)
  const totalDebt    = accounts.filter(a =>  ACCOUNT_META[a.type].isDebt).reduce((s, a) => s + a.balance, 0)
  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0)
  const totalInvValue = investments.reduce((s, i) => s + i.current_value, 0)
  const netWorth     = liquidCash + totalInvValue - totalDebt
  const totalGain    = totalInvValue - totalInvested
  const gainPct      = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  // Portfolio chart
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    snapshots.forEach(s => { byDate[s.recorded_at] = (byDate[s.recorded_at] ?? 0) + s.value })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: date.slice(5), value, fullDate: date }))
  }, [snapshots])

  // Allocation by investment type
  const byInvType = useMemo(() => {
    const map: Record<string, number> = {}
    investments.forEach(i => { map[i.type] = (map[i.type] ?? 0) + i.current_value })
    return Object.entries(map)
      .map(([type, value]) => ({ type: type as InvestmentType, value, pct: totalInvValue > 0 ? (value / totalInvValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [investments, totalInvValue])

  // Accounts handlers
  async function handleDeleteAccount(id: string) {
    if (!confirm(en ? 'Delete this account?' : 'Deseja excluir esta conta?')) return
    setDeletingAccId(id)
    const { error } = await createClient().from('accounts').delete().eq('id', id)
    if (!error) setAccounts(prev => prev.filter(a => a.id !== id))
    setDeletingAccId(null)
  }
  const handleAccountSaved = useCallback((saved: Account, isEdit: boolean) => {
    setAccounts(prev => isEdit ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev])
    setAccModalOpen(false)
  }, [])

  // Investments handlers
  async function handleDeleteInvestment(id: string) {
    if (!confirm(en ? 'Delete this investment?' : 'Deseja excluir este investimento?')) return
    setDeletingInvId(id)
    const { error } = await createClient().from('investments').delete().eq('id', id)
    if (!error) {
      setInvestments(prev => prev.filter(i => i.id !== id))
      setSnapshots(prev => prev.filter(s => s.investment_id !== id))
    }
    setDeletingInvId(null)
  }
  const handleInvestmentSaved = useCallback((saved: Investment, isEdit: boolean) => {
    setInvestments(prev => isEdit ? prev.map(i => i.id === saved.id ? saved : i) : [saved, ...prev])
    setSnapshots(prev => [...prev, {
      id: crypto.randomUUID(),
      user_id: saved.user_id,
      investment_id: saved.id,
      value: saved.current_value,
      recorded_at: saved.date,
      created_at: new Date().toISOString(),
    }])
    setInvModalOpen(false)
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',     label: en ? 'Overview'    : 'Visão Geral' },
    { id: 'accounts',     label: en ? 'Accounts'    : 'Contas'      },
    { id: 'investments',  label: en ? 'Investments' : 'Investimentos'},
  ]

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {en ? 'Net Worth' : 'Patrimônio'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {en ? 'Your complete financial picture' : 'Sua visão financeira completa'}
        </p>
      </div>

      {/* Big net worth number */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 p-6 mb-6 text-white shadow-lg shadow-blue-500/20">
        <p className="text-sm font-medium text-blue-200 mb-1">{en ? 'Total Net Worth' : 'Patrimônio Total'}</p>
        <p className="text-4xl font-bold tracking-tight tabular-nums">{fmt(netWorth)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-xs text-blue-300">{en ? 'Liquid cash' : 'Dinheiro líquido'}</p>
            <p className="text-base font-semibold tabular-nums">{fmt(liquidCash)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300">{en ? 'Investments' : 'Investimentos'}</p>
            <p className="text-base font-semibold tabular-nums">{fmt(totalInvValue)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300">{en ? 'Debt' : 'Dívidas'}</p>
            <p className="text-base font-semibold tabular-nums text-red-300">−{fmt(totalDebt)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label={en ? 'Liquid Cash' : 'Dinheiro Líquido'} value={fmt(liquidCash)} color="green" />
            <SummaryCard label={en ? 'Investments' : 'Investimentos'} value={fmt(totalInvValue)} color="blue"
              sub={totalGain !== 0 ? `${totalGain >= 0 ? '+' : ''}${fmt(totalGain)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)` : undefined}
              subColor={totalGain >= 0 ? 'text-green-500' : 'text-red-400'}
            />
            <SummaryCard label={en ? 'Debt' : 'Dívidas'} value={fmt(totalDebt)} color="red" />
            <SummaryCard label={en ? 'Invested (cost)' : 'Investido (custo)'} value={fmt(totalInvested)} color="gray" />
          </div>

          {/* Portfolio chart */}
          {chartData.length > 1 && (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {en ? 'Investment portfolio over time' : 'Evolução do portfólio'}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-gray-700" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v).replace(/\.00$/, '')} width={80} />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), en ? 'Portfolio' : 'Portfólio']}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: 'white' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Allocation */}
          {byInvType.length > 0 && (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {en ? 'Investment allocation' : 'Alocação de investimentos'}
              </h2>
              <div className="space-y-3">
                {byInvType.map(item => {
                  const meta = INVESTMENT_META[item.type]
                  return (
                    <div key={item.type}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{meta.icon} {meta.label}</span>
                        <span className="text-gray-500 tabular-nums">{fmt(item.value)} · {item.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${item.pct}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accounts tab */}
      {tab === 'accounts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {accounts.length} {en ? `account${accounts.length !== 1 ? 's' : ''}` : `conta${accounts.length !== 1 ? 's' : ''}`}
            </p>
            <button onClick={() => { setEditingAcc(null); setAccModalOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm">
              + {tr.addAccount}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <MiniCard label={`💵 ${tr.availableBalance}`} value={fmt(liquidCash)} bold="green" />
            <MiniCard label={`💳 ${tr.creditCardDebt}`} value={fmt(totalDebt)} bold="red" />
            <MiniCard label={`📊 ${tr.balance}`} value={fmt(liquidCash - totalDebt)} bold={liquidCash - totalDebt >= 0 ? 'blue' : 'red'} />
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">🏦</span>
                <p className="text-sm font-medium">{tr.noAccounts}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {accounts.map(acc => {
                  const meta = ACCOUNT_META[acc.type]
                  return (
                    <div key={acc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 text-xl"
                        style={{ backgroundColor: `${meta.color}18` }}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{acc.institution}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
                            {en ? meta.label : meta.labelPt}
                          </span>
                          <span className="text-xs text-gray-400">{acc.name}</span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-400">{formatDate(acc.updated_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${meta.isDebt ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                          {meta.isDebt ? '−' : ''}{fmt(acc.balance)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingAcc(acc); setAccModalOpen(true) }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">✏️</button>
                        <button onClick={() => handleDeleteAccount(acc.id)} disabled={deletingAccId === acc.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors disabled:opacity-40">🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investments tab */}
      {tab === 'investments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {investments.length} {en ? `asset${investments.length !== 1 ? 's' : ''}` : `ativo${investments.length !== 1 ? 's' : ''}`}
            </p>
            <button onClick={() => { setEditingInv(null); setInvModalOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm">
              + {tr.addInvestment}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <MiniCard label={`💼 ${tr.totalInvested}`} value={fmt(totalInvested)} bold="gray" />
            <MiniCard label={`📈 ${tr.totalCurrentValue}`} value={fmt(totalInvValue)} bold="blue" />
            <MiniCard label={`✨ ${tr.totalReturn}`} value={`${totalGain >= 0 ? '+' : ''}${fmt(totalGain)}`}
              bold={totalGain >= 0 ? 'green' : 'red'}
              sub={`${totalGain >= 0 ? '▲' : '▼'} ${Math.abs(gainPct).toFixed(2)}%`} />
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {investments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">💼</span>
                <p className="text-sm font-medium">{tr.noInvestments}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {investments.map(inv => {
                  const meta = INVESTMENT_META[inv.type]
                  const gain  = inv.current_value - inv.invested_amount
                  const gainP = inv.invested_amount > 0 ? (gain / inv.invested_amount) * 100 : 0
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 text-lg"
                        style={{ backgroundColor: `${meta.color}18` }}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{inv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(inv.date)}</span>
                        </div>
                        {inv.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{inv.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-200">{fmt(inv.current_value)}</p>
                        <p className={`text-xs font-medium tabular-nums ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainP >= 0 ? '+' : ''}{gainP.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingInv(inv); setInvModalOpen(true) }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">✏️</button>
                        <button onClick={() => handleDeleteInvestment(inv.id)} disabled={deletingInvId === inv.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors disabled:opacity-40">🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <AccountModal open={accModalOpen} onClose={() => setAccModalOpen(false)} onSaved={handleAccountSaved} account={editingAcc} />
      <InvestmentModal open={invModalOpen} onClose={() => setInvModalOpen(false)} onSaved={handleInvestmentSaved} investment={editingInv} />
    </div>
  )
}

function SummaryCard({ label, value, color, sub, subColor }: {
  label: string; value: string; color: 'green' | 'blue' | 'red' | 'gray'
  sub?: string; subColor?: string
}) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    blue:  'text-blue-600 dark:text-blue-400',
    red:   'text-red-500 dark:text-red-400',
    gray:  'text-gray-700 dark:text-gray-200',
  }
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${colors[color]}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 font-medium ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

function MiniCard({ label, value, bold, sub }: {
  label: string; value: string; bold: 'green' | 'blue' | 'red' | 'gray'; sub?: string
}) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    blue:  'text-blue-600 dark:text-blue-400',
    red:   'text-red-500 dark:text-red-400',
    gray:  'text-gray-700 dark:text-gray-200',
  }
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${colors[bold]}`}>{value}</p>
      {sub && <p className="text-xs mt-0.5 text-gray-400">{sub}</p>}
    </div>
  )
}
