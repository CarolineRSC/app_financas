'use client'

import { useState, useRef } from 'react'
import { ImportRow, parseImportFile, downloadImportTemplate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import { usePreferences } from '@/lib/preferences-context'

interface Props {
  open: boolean
  onClose: () => void
  onImported: (transactions: Transaction[]) => void
}

export default function ImportModal({ open, onClose, onImported }: Props) {
  const [rows, setRows]       = useState<ImportRow[]>([])
  const [step, setStep]       = useState<'upload' | 'preview'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { tr, fmt, prefs } = usePreferences()
  const en = prefs.language === 'en'

  function reset() {
    setRows([])
    setStep('upload')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() { reset(); onClose() }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > 5 * 1024 * 1024) {
      setError(en ? 'File too large. Maximum: 5MB.' : 'Arquivo muito grande. Máximo permitido: 5MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setLoading(true)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.length === 0) {
        setError(en ? 'Empty file or no valid rows.' : 'Arquivo vazio ou sem linhas válidas.')
        setLoading(false)
        return
      }
      setRows(parsed)
      setStep('preview')
    } catch {
      setError(en ? 'Error reading file. Make sure it is a valid .xlsx.' : 'Erro ao ler o arquivo. Verifique se é um .xlsx válido.')
    }
    setLoading(false)
  }

  const validRows = rows.filter(r => !r.error)
  const errorRows = rows.filter(r => r.error)

  async function handleImport() {
    if (validRows.length === 0) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(en ? 'Session expired.' : 'Sessão expirada.'); setLoading(false); return }

    const payload = validRows.map(r => ({
      user_id: user.id,
      description: r.description,
      amount: r.amount,
      date: r.date,
      type: r.type,
      category: r.category,
      expense_type: r.expense_type,
    }))

    const { data, error: err } = await supabase.from('transactions').insert(payload).select()
    if (err) { setError(`${en ? 'Import error' : 'Erro ao importar'}: ${err.message}`); setLoading(false); return }

    onImported(data as Transaction[])
    handleClose()
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {en ? 'Import transactions via Excel' : 'Importar transações via Excel'}
          </h2>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  {en ? 'Step 1 — Download the template' : 'Passo 1 — Baixe o modelo'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                  {en
                    ? 'Download the template, fill it in with your transactions, then import it back.'
                    : 'Baixe a planilha modelo, preencha com suas transações e importe de volta.'}
                </p>
                <button onClick={downloadImportTemplate}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                  📥 {en ? 'Download template (.xlsx)' : 'Baixar modelo (.xlsx)'}
                </button>
              </div>

              <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 p-6 text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {en ? 'Step 2 — Select the filled file' : 'Passo 2 — Selecione o arquivo preenchido'}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  {en ? 'Only .xlsx files are accepted' : 'Somente arquivos .xlsx são aceitos'}
                </p>
                <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" id="import-file" />
                <label htmlFor="import-file"
                  className="inline-block cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  {loading ? (en ? 'Reading file...' : 'Lendo arquivo...') : `📂 ${en ? 'Select file' : 'Selecionar arquivo'}`}
                </label>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-3 py-2 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">{en ? 'Valid' : 'Válidas'}</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{validRows.length}</p>
                </div>
                <div className="flex-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-3 py-2 text-center">
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium">{en ? 'With error' : 'Com erro'}</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{errorRows.length}</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {[tr.date, tr.description, tr.type, tr.category, tr.expenseType, tr.amount, 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.error ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.date}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-[120px] truncate">{r.description}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${r.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {r.type === 'income' ? tr.incomeLabel : tr.expenseLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.category}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {r.expense_type === 'fixed' ? `📌 ${tr.fixed}` : `🔄 ${en ? 'Var.' : 'Var.'}`}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{fmt(r.amount)}</td>
                        <td className="px-3 py-2">
                          {r.error
                            ? <span className="text-red-500" title={r.error}>⚠️ {en ? 'Error' : 'Erro'}</span>
                            : <span className="text-green-500">✓</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                    {en ? 'Rows with errors (will be skipped):' : 'Linhas com erro (serão ignoradas):'}
                  </p>
                  {errorRows.map((r, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-400">• {r.description || (en ? '(no description)' : '(sem descrição)')}: {r.error}</p>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={reset}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {en ? 'Back' : 'Voltar'}
                </button>
                <button onClick={handleImport} disabled={loading || validRows.length === 0}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {loading
                    ? tr.loading
                    : `${en ? 'Import' : 'Importar'} ${validRows.length} ${tr.transactions.toLowerCase()}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
