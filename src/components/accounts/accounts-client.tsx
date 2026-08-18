'use client'

import { useState, useCallback } from 'react'
import { Account, AccountType } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'
import AccountModal from './account-modal'

export default function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts,   setAccounts]   = useState<Account[]>(initialAccounts)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState<Account | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { tr, fmt, prefs } = usePreferences()

  const TYPE_META: Record<AccountType, { label: string; icon: string; color: string; isDebt: boolean }> = {
    checking:    { label: tr.checking,    icon: '🏦', color: '#3b82f6', isDebt: false },
    savings:     { label: tr.savings,     icon: '💵', color: '#22c55e', isDebt: false },
    high_yield:  { label: prefs.language === 'en' ? 'High Yield' : 'Conta Rendimento', icon: '💰', color: '#8b5cf6', isDebt: false },
    credit_card: { label: tr.creditCard,  icon: '💳', color: '#ef4444', isDebt: true  },
    other:       { label: tr.others,      icon: '📁', color: '#6b7280', isDebt: false },
  }

  const liquid = accounts.filter(a => !TYPE_META[a.type].isDebt).reduce((s, a) => s + a.balance, 0)
  const debt   = accounts.filter(a =>  TYPE_META[a.type].isDebt).reduce((s, a) => s + a.balance, 0)
  const net    = liquid - debt

  function handleAdd()            { setEditing(null); setModalOpen(true) }
  function handleEdit(a: Account) { setEditing(a);    setModalOpen(true) }

  async function handleDelete(id: string) {
    if (!confirm(prefs.language === 'en' ? 'Delete this account?' : 'Deseja excluir esta conta?')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) setAccounts(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
  }

  const handleSaved = useCallback((saved: Account, isEdit: boolean) => {
    setAccounts(prev => isEdit ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev])
    setModalOpen(false)
  }, [])

  const cardCls = 'rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5'

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.accounts}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {accounts.length} {prefs.language === 'en' ? `account${accounts.length !== 1 ? 's' : ''}` : `conta${accounts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm self-start sm:self-auto">
          <span className="text-lg leading-none">+</span> {tr.addAccount}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={cardCls}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">💵 {tr.availableBalance}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(liquid)}</p>
        </div>
        <div className={cardCls}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">💳 {tr.creditCardDebt}</p>
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{fmt(debt)}</p>
        </div>
        <div className={cardCls}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">📊 {tr.balance}</p>
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{fmt(net)}</p>
        </div>
      </div>

      <div className={`${cardCls} p-0 overflow-hidden`}>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">🏦</span>
            <p className="text-sm font-medium">{tr.noAccounts}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {accounts.map(acc => {
              const meta = TYPE_META[acc.type]
              return (
                <div key={acc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 text-xl"
                    style={{ backgroundColor: `${meta.color}20` }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{acc.institution}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-400">{acc.name}</span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400">{formatDate(acc.updated_at)}</span>
                    </div>
                    {acc.notes && <p className="text-xs text-gray-400 mt-0.5">{acc.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${meta.isDebt ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                      {meta.isDebt ? '-' : ''}{fmt(acc.balance)}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(acc)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">✏️</button>
                    <button onClick={() => handleDelete(acc.id)} disabled={deletingId === acc.id}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors disabled:opacity-50">🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AccountModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} account={editing} />
    </div>
  )
}
