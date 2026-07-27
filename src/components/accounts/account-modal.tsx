'use client'

import { useState, useEffect } from 'react'
import { Account, AccountType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (account: Account, isEdit: boolean) => void
  account: Account | null
}

const today = new Date().toISOString().split('T')[0]

const TYPES: { value: AccountType; label: string; icon: string; desc: string; isDebt: boolean }[] = [
  { value: 'checking',   label: 'Conta Corrente',   icon: '🏦', desc: 'Ex: Bank of America Checking', isDebt: false },
  { value: 'savings',    label: 'Poupança',          icon: '💵', desc: 'Ex: Savings account',          isDebt: false },
  { value: 'high_yield', label: 'Conta Rendimento',  icon: '💰', desc: 'Ex: Marcus, Ally, SoFi',       isDebt: false },
  { value: 'credit_card',label: 'Cartão de Crédito', icon: '💳', desc: 'Ex: Amex, Discover, Chase',    isDebt: true  },
  { value: 'other',      label: 'Outro',             icon: '📁', desc: 'Outro tipo de conta',           isDebt: false },
]

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100'

export default function AccountModal({ open, onClose, onSaved, account }: Props) {
  const isEdit = !!account

  const [name,        setName]        = useState('')
  const [institution, setInstitution] = useState('')
  const [type,        setType]        = useState<AccountType>('checking')
  const [balance,     setBalance]     = useState('')
  const [updatedAt,   setUpdatedAt]   = useState(today)
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (account) {
      setName(account.name)
      setInstitution(account.institution)
      setType(account.type)
      setBalance(account.balance.toString())
      setUpdatedAt(account.updated_at)
      setNotes(account.notes ?? '')
    } else {
      setName('')
      setInstitution('')
      setType('checking')
      setBalance('')
      setUpdatedAt(today)
      setNotes('')
    }
    setError('')
  }, [account, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const bal = parseFloat(balance.replace(',', '.'))
    if (isNaN(bal) || bal < 0) { setError('Informe um saldo válido (zero ou positivo).'); return }
    if (!name.trim()) { setError('Informe um nome para a conta.'); return }
    if (!institution.trim()) { setError('Informe a instituição.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sessão expirada.'); setLoading(false); return }

    const payload = {
      name: name.trim(),
      institution: institution.trim(),
      type,
      balance: bal,
      updated_at: updatedAt,
      notes: notes.trim() || null,
    }

    if (isEdit && account) {
      const { data, error: err } = await supabase.from('accounts').update(payload).eq('id', account.id).select().single()
      if (err) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Account, true)
    } else {
      const { data, error: err } = await supabase.from('accounts').insert({ ...payload, user_id: user.id }).select().single()
      if (err) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Account, false)
    }
    setLoading(false)
  }

  const selectedType = TYPES.find(t => t.value === type)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar conta' : 'Nova conta'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de conta</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex flex-col items-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                    type === t.value
                      ? t.isDebt
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                  <span className="text-lg mb-1">{t.icon}</span>
                  <span className="text-center leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
            {selectedType?.isDebt && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                💳 O saldo do cartão representa o que você <strong>deve</strong> (será subtraído do seu patrimônio)
              </p>
            )}
          </div>

          {/* Institution + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Banco / Instituição</label>
              <input type="text" value={institution} onChange={e => setInstitution(e.target.value)}
                required maxLength={100} placeholder="Ex: Bank of America" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Apelido</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                required maxLength={100} placeholder="Ex: Checking" className={inputCls} />
            </div>
          </div>

          {/* Balance + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {selectedType?.isDebt ? 'Fatura atual ($)' : 'Saldo atual ($)'}
              </label>
              <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
                required min="0" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Última atualização</label>
              <input type="date" value={updatedAt} onChange={e => setUpdatedAt(e.target.value)} required className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Observações (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              maxLength={300} placeholder="Ex: Joint account, fecha dia 10..." className={inputCls} />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
