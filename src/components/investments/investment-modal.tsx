'use client'

import { useState, useEffect } from 'react'
import { Investment, InvestmentType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (investment: Investment, isEdit: boolean) => void
  investment: Investment | null
}

const today = new Date().toISOString().split('T')[0]

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100'

export default function InvestmentModal({ open, onClose, onSaved, investment }: Props) {
  const isEdit = !!investment
  const { tr, prefs } = usePreferences()
  const en = prefs.language === 'en'

  const TYPES: { value: InvestmentType; label: string; icon: string; desc: string }[] = [
    { value: 'savings',      label: en ? 'Savings'    : 'Poupança',         icon: '🏦', desc: en ? 'Savings account'                : 'Caderneta de poupança'   },
    { value: 'high_yield',   label: en ? 'High Yield' : 'Conta Rendimento', icon: '💰', desc: en ? 'e.g. Marcus, Ally, SoFi'         : 'Ex: Nubank, Inter'       },
    { value: 'stocks',       label: en ? 'Stocks'     : 'Ações',            icon: '📈', desc: en ? 'Stocks & ETFs'                   : 'Ações na bolsa (B3)'    },
    { value: 'fixed_income', label: en ? 'Bonds'      : 'Renda Fixa',       icon: '📄', desc: en ? 'Bonds, CDs, Treasuries'          : 'CDB, LCI, Tesouro Direto'},
    { value: 'crypto',       label: en ? 'Crypto'     : 'Cripto',           icon: '🪙', desc: en ? 'Bitcoin, Ethereum, etc.'         : 'Bitcoin, Ethereum etc.'  },
    { value: 'other',        label: tr.others,                               icon: '📁', desc: en ? 'Other investment types'          : 'Outros tipos'            },
  ]

  const [name,           setName]           = useState('')
  const [type,           setType]           = useState<InvestmentType>('high_yield')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentValue,   setCurrentValue]   = useState('')
  const [date,           setDate]           = useState(today)
  const [notes,          setNotes]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    if (investment) {
      setName(investment.name)
      setType(investment.type)
      setInvestedAmount(investment.invested_amount.toString())
      setCurrentValue(investment.current_value.toString())
      setDate(investment.date)
      setNotes(investment.notes ?? '')
    } else {
      setName('')
      setType('high_yield')
      setInvestedAmount('')
      setCurrentValue('')
      setDate(today)
      setNotes('')
    }
    setError('')
  }, [investment, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const invested = parseFloat(investedAmount.replace(',', '.'))
    const current  = parseFloat(currentValue.replace(',', '.'))
    if (isNaN(invested) || invested < 0) {
      setError(en ? 'Enter a valid invested amount.' : 'Informe um valor investido válido.')
      return
    }
    if (isNaN(current) || current < 0) {
      setError(en ? 'Enter a valid current value.' : 'Informe o valor atual válido.')
      return
    }
    if (!name.trim()) {
      setError(en ? 'Enter a name.' : 'Informe um nome.')
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
      name: name.trim(),
      type,
      invested_amount: invested,
      current_value: current,
      date,
      notes: notes.trim() || null,
    }

    if (isEdit && investment) {
      const { data, error: err } = await supabase.from('investments').update(payload).eq('id', investment.id).select().single()
      if (err) { setError(en ? 'Failed to save. Please try again.' : 'Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Investment, true)
    } else {
      const { data, error: err } = await supabase.from('investments').insert({ ...payload, user_id: user.id }).select().single()
      if (err) { setError(en ? 'Failed to save. Please try again.' : 'Erro ao salvar. Tente novamente.'); setLoading(false); return }
      onSaved(data as Investment, false)
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? (en ? 'Edit investment' : 'Editar investimento') : tr.addInvestment}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {en ? 'Type' : 'Tipo'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex flex-col items-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}>
                  <span className="text-lg mb-1">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {en ? 'Name / Institution' : 'Nome / Instituição'}
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              required maxLength={100}
              placeholder={`e.g. ${TYPES.find(t => t.value === type)?.desc}`}
              className={inputCls} />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {en ? 'Amount invested' : 'Valor investido'}
              </label>
              <input type="number" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)}
                required min="0" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {en ? 'Current value' : 'Valor atual'}
              </label>
              <input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)}
                required min="0" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {en ? 'Last updated' : 'Última atualização'}
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {en ? 'Notes (optional)' : 'Observações (opcional)'}
            </label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              maxLength={300}
              placeholder={en ? 'e.g. Matures Dec 2026...' : 'Ex: Vencimento em Dez 2026...'}
              className={inputCls} />
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
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? tr.loading : isEdit ? tr.saveChanges : tr.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
