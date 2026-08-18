'use client'

import { useState, useRef, useCallback } from 'react'
import { Transaction, Category } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: Category
  expense_type: 'fixed' | 'variable'
  selected: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onImported: (transactions: Transaction[]) => void
}

const ALL_CATEGORIES: Category[] = [
  'Alimentação','Transporte','Moradia','Lazer','Saúde','Educação','Salário','Freelance','Outros',
]

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/restaurant|food|pizza|mcdonald|burger|taco|sushi|cafe|coffee|starbucks|chick|wendy|subway|grubhub|doordash|uber.eat|cheesecake|panera|chipotle|dunkin/i.test(d)) return 'Alimentação'
  if (/uber|lyft|gas|fuel|parking|toll|transit|shell|chevron|exxon|bp |sunoco|wawa|7-eleven/i.test(d)) return 'Transporte'
  if (/rent|mortgage|hoa|electric|water|internet|utility|comcast|xfinity|at&t|verizon|pge|con ed/i.test(d)) return 'Moradia'
  if (/netflix|spotify|hulu|disney|prime|openai|chatgpt|apple|cinema|movie|theater|steam|playstation|xbox/i.test(d)) return 'Lazer'
  if (/pharmacy|cvs|walgreen|doctor|hospital|clinic|dental|health|medical|rite aid/i.test(d)) return 'Saúde'
  if (/tuition|school|college|university|course|udemy|coursera|amazon.*book/i.test(d)) return 'Educação'
  if (/salary|payroll|direct deposit|paycheck|ach credit|zelle|venmo.*credit/i.test(d)) return 'Salário'
  return 'Outros'
}

type Bank = 'bofa' | 'chase' | 'amex' | 'discover' | 'unknown'

function detectBank(text: string): Bank {
  const t = text.slice(0, 3000).toLowerCase()
  if (/bank of america/i.test(t)) return 'bofa'
  if (/chase bank|jpmorgan chase|chase\.com/i.test(t)) return 'chase'
  if (/american express|amex\.com/i.test(t)) return 'amex'
  if (/discover bank|discover\.com|discover card/i.test(t)) return 'discover'
  return 'unknown'
}

function parseBofA(text: string): Omit<ParsedRow, 'selected'>[] {
  const results: Omit<ParsedRow, 'selected'>[] = []
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)

  let section: 'income' | 'expense' | null = null
  const dateRe = /^(\d{2}\/\d{2}\/\d{2})\s+(.+)$/
  const amountRe = /(-?\$?[\d,]+\.\d{2})$/

  let pendingDate = ''
  let pendingDesc = ''

  function flush() {
    if (!pendingDate || !pendingDesc || !section) { pendingDate = ''; pendingDesc = ''; return }
    const m = pendingDesc.match(amountRe)
    if (!m) { pendingDate = ''; pendingDesc = ''; return }
    const numAmt = parseFloat(m[1].replace(/[$,]/g, ''))
    if (isNaN(numAmt) || numAmt === 0) { pendingDate = ''; pendingDesc = ''; return }
    const desc = pendingDesc.slice(0, pendingDesc.lastIndexOf(m[1])).trim()
    const [mo, dy, yr] = pendingDate.split('/')
    results.push({
      date: `20${yr}-${mo}-${dy}`,
      description: desc || 'Transaction',
      amount: Math.abs(numAmt),
      type: section!,
      category: guessCategory(desc),
      expense_type: 'variable',
    })
    pendingDate = ''; pendingDesc = ''
  }

  for (const line of lines) {
    if (/deposits and other additions/i.test(line))                                        { flush(); section = 'income';  continue }
    if (/withdrawals and other subtractions|other subtractions|atm and debit/i.test(line)) { flush(); section = 'expense'; continue }
    if (/service fees/i.test(line))                                                        { flush(); section = null; continue }
    if (/^(date\s|total |page \d|bank of america|description|amount|continued|account #|can you spot|be aware|share these|scan this)/i.test(line)) continue
    if (/^\$[\d,]+/.test(line)) continue
    if (!section) continue

    const m = line.match(dateRe)
    if (m) {
      flush()
      pendingDate = m[1]
      pendingDesc = m[2]
    } else if (pendingDate) {
      pendingDesc += ' ' + line
    }
  }
  flush()
  return results
}

function parseChase(text: string): Omit<ParsedRow, 'selected'>[] {
  const results: Omit<ParsedRow, 'selected'>[] = []
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)

  // Chase format: MM/DD/YYYY  Description  Amount (negative = expense for checking; negative = charge for credit)
  // Also handles: MM/DD  Description  Amount
  const txnRe = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s{2,}(.+?)\s{2,}(-?\$?[\d,]+\.\d{2})$/
  const txnRe2 = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/

  let isCredit = /credit card|sapphire|freedom|slate|ink|reserve/i.test(text.slice(0, 2000))

  for (const line of lines) {
    if (/^(date|description|amount|transaction|page \d|chase|account|total|balance|opening|closing)/i.test(line)) continue
    if (/^[\d,]+\.\d{2}$/.test(line)) continue

    const m = line.match(txnRe) ?? line.match(txnRe2)
    if (!m) continue

    const [, rawDate, rawDesc, rawAmt] = m
    const numAmt = parseFloat(rawAmt.replace(/[$,]/g, ''))
    if (isNaN(numAmt) || numAmt === 0) continue

    // Normalize date
    const parts = rawDate.split('/')
    let date: string
    if (parts.length === 3) {
      const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      date = `${yr}-${parts[0]}-${parts[1]}`
    } else {
      const yr = new Date().getFullYear()
      date = `${yr}-${parts[0]}-${parts[1]}`
    }

    const description = rawDesc.trim()
    const amount = Math.abs(numAmt)

    // For credit cards: negative = charge (expense), positive = payment/credit (income)
    // For checking: negative = withdrawal (expense), positive = deposit (income)
    let type: 'income' | 'expense'
    if (isCredit) {
      type = numAmt < 0 ? 'expense' : 'income'
    } else {
      type = numAmt > 0 ? 'income' : 'expense'
    }

    results.push({ date, description, amount, type, category: guessCategory(description), expense_type: 'variable' })
  }
  return results
}

function parseAmex(text: string): Omit<ParsedRow, 'selected'>[] {
  const results: Omit<ParsedRow, 'selected'>[] = []
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)

  // Amex format: MM/DD/YY  Description  $Amount  (charges are positive, credits are negative or labeled)
  const txnRe = /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/

  for (const line of lines) {
    if (/^(date|description|amount|reference|american express|account|total|page \d|closing|opening|payment|thank you)/i.test(line)) continue
    if (/^\*/.test(line)) continue

    const m = line.match(txnRe)
    if (!m) continue

    const [, rawDate, rawDesc, rawAmt] = m
    const numAmt = parseFloat(rawAmt.replace(/[$,]/g, ''))
    if (isNaN(numAmt) || numAmt === 0) continue

    const [mo, dy, yr] = rawDate.split('/')
    const date = `20${yr}-${mo}-${dy}`
    const description = rawDesc.trim()
    const amount = Math.abs(numAmt)

    // Amex: positive = charge (expense), negative = credit/payment (income)
    const type: 'income' | 'expense' = numAmt > 0 ? 'expense' : 'income'
    results.push({ date, description, amount, type, category: guessCategory(description), expense_type: 'variable' })
  }
  return results
}

function parseDiscover(text: string): Omit<ParsedRow, 'selected'>[] {
  const results: Omit<ParsedRow, 'selected'>[] = []
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)

  // Discover format: MM/DD/YYYY  Description  $Amount
  const txnRe = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/
  const txnRe2 = /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/

  for (const line of lines) {
    if (/^(trans\.|post\s|date|description|amount|discover|account|total|page \d|balance|payment)/i.test(line)) continue

    const m = line.match(txnRe) ?? line.match(txnRe2)
    if (!m) continue

    const [, rawDate, rawDesc, rawAmt] = m
    const numAmt = parseFloat(rawAmt.replace(/[$,]/g, ''))
    if (isNaN(numAmt) || numAmt === 0) continue

    const parts = rawDate.split('/')
    let date: string
    if (parts[2].length === 4) {
      date = `${parts[2]}-${parts[0]}-${parts[1]}`
    } else {
      date = `20${parts[2]}-${parts[0]}-${parts[1]}`
    }

    const description = rawDesc.trim()
    const amount = Math.abs(numAmt)

    // Discover credit: positive = charge (expense), negative = credit (income)
    const type: 'income' | 'expense' = numAmt > 0 ? 'expense' : 'income'
    results.push({ date, description, amount, type, category: guessCategory(description), expense_type: 'variable' })
  }
  return results
}

function parseByBank(bank: Bank, text: string): Omit<ParsedRow, 'selected'>[] {
  switch (bank) {
    case 'bofa':     return parseBofA(text)
    case 'chase':    return parseChase(text)
    case 'amex':     return parseAmex(text)
    case 'discover': return parseDiscover(text)
    default:         return []
  }
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await loadingTask.promise

  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    const pageItems: { x: number; y: number; str: string }[] = []
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        pageItems.push({ x: item.transform[4], y: item.transform[5], str: item.str })
      }
    }

    pageItems.sort((a, b) => b.y - a.y || a.x - b.x)

    const lines: string[][] = []
    let lastY = -Infinity
    for (const item of pageItems) {
      if (Math.abs(item.y - lastY) > 4) { lines.push([]); lastY = item.y }
      lines[lines.length - 1].push(item.str)
    }

    fullText += lines.map(l => l.join('  ')).join('\n') + '\n'
  }

  return fullText
}

const BANK_LABELS: Record<Bank, string> = {
  bofa:    'Bank of America',
  chase:   'Chase',
  amex:    'American Express',
  discover:'Discover',
  unknown: 'Unknown',
}

export default function PdfImportModal({ open, onClose, onImported }: Props) {
  const [rows,       setRows]       = useState<ParsedRow[]>([])
  const [step,       setStep]       = useState<'upload' | 'preview'>('upload')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [detectedBank, setDetectedBank] = useState<Bank>('unknown')
  const inputRef = useRef<HTMLInputElement>(null)
  const { tr, fmt, prefs } = usePreferences()
  const en = prefs.language === 'en'

  function reset() {
    setRows([]); setStep('upload'); setError(''); setDetectedBank('unknown')
    if (inputRef.current) inputRef.current.value = ''
  }
  function handleClose() { reset(); onClose() }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setLoading(true)

    try {
      const text = await extractTextFromPdf(file)
      const bank = detectBank(text)
      setDetectedBank(bank)

      if (bank === 'unknown') {
        setError(en
          ? 'Bank not recognized. Supported: Bank of America, Chase, American Express, Discover.'
          : 'Banco não reconhecido. Suportados: Bank of America, Chase, American Express, Discover.')
        setLoading(false)
        return
      }

      const parsed = parseByBank(bank, text)

      if (parsed.length === 0) {
        setError(en
          ? `No transactions found in this ${BANK_LABELS[bank]} statement. Make sure it's not password-protected.`
          : `Nenhuma transação encontrada no extrato do ${BANK_LABELS[bank]}. Verifique se o arquivo não está protegido por senha.`)
        setLoading(false)
        return
      }

      setRows(parsed.map(r => ({ ...r, selected: true })))
      setStep('preview')
    } catch (err) {
      console.error(err)
      setError(en
        ? 'Error reading PDF. Make sure the file is not password-protected.'
        : 'Erro ao ler o PDF. Verifique se o arquivo não está protegido por senha.')
    }
    setLoading(false)
  }

  function toggleRow(i: number)  { setRows(prev => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r)) }
  function toggleAll()           { const all = rows.every(r => r.selected); setRows(prev => prev.map(r => ({ ...r, selected: !all }))) }
  function updateCategory(i: number, category: Category) { setRows(prev => prev.map((r, idx) => idx === i ? { ...r, category } : r)) }
  function updateType(i: number, type: 'income' | 'expense') { setRows(prev => prev.map((r, idx) => idx === i ? { ...r, type } : r)) }

  const selected     = rows.filter(r => r.selected)
  const totalIncome  = selected.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = selected.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  const handleImport = useCallback(async () => {
    if (selected.length === 0) return
    setLoading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(en ? 'Session expired.' : 'Sessão expirada.'); setLoading(false); return }

    const payload = selected.map(r => ({
      user_id: user.id,
      description: r.description,
      amount: r.amount,
      date: r.date,
      type: r.type,
      category: r.category,
      expense_type: r.expense_type,
    }))

    const { data, error: err } = await supabase.from('transactions').insert(payload).select()
    if (err) { setError(`${en ? 'Error' : 'Erro'}: ${err.message}`); setLoading(false); return }
    onImported(data as Transaction[])
    handleClose()
    setLoading(false)
  }, [selected, onImported, en])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {en ? 'Import PDF statement' : 'Importar extrato PDF'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'preview' && detectedBank !== 'unknown'
                ? `${BANK_LABELS[detectedBank]} · ${rows.length} ${en ? 'transactions found' : 'transações encontradas'}`
                : 'Bank of America · Chase · American Express · Discover'
              }
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Supported banks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['bofa', 'chase', 'amex', 'discover'] as Bank[]).map(b => (
                  <div key={b} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 text-center">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{BANK_LABELS[b]}</p>
                    <p className="text-[10px] text-green-500 mt-0.5">✓ {en ? 'Supported' : 'Suportado'}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  {en ? 'How to download your statement' : 'Como baixar seu extrato'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {en
                    ? 'Log in to your bank → go to Statements or eStatements → select the month → download as PDF → upload below.'
                    : 'Acesse seu banco online → vá em Statements ou eStatements → selecione o mês → baixe o PDF → faça upload abaixo.'}
                </p>
              </div>

              <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 p-8 text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {en ? 'Select your bank statement PDF' : 'Selecione o extrato em PDF'}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  {en ? 'Bank is detected automatically' : 'O banco é detectado automaticamente'}
                </p>
                <input ref={inputRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" id="pdf-file" />
                <label htmlFor="pdf-file"
                  className={`inline-block cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {loading ? `⏳ ${en ? 'Processing...' : 'Processando...'}` : `📂 ${en ? 'Select PDF' : 'Selecionar PDF'}`}
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{en ? 'Found' : 'Encontradas'}</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{rows.length}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400">{en ? 'Income' : 'Receitas'}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(totalIncome)}</p>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-center">
                  <p className="text-xs text-red-500 dark:text-red-400">{en ? 'Expenses' : 'Despesas'}</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalExpense)}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {en
                  ? "Review, adjust category/type, and uncheck what you don't want to import."
                  : 'Revise, ajuste categoria/tipo e desmarque o que não quer importar.'}
              </p>

              <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input type="checkbox" checked={rows.every(r => r.selected)} onChange={toggleAll} className="rounded" />
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold">{tr.date}</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold">{tr.description}</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold">{tr.type}</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-semibold">{tr.category}</th>
                      <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 font-semibold">{tr.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {rows.map((r, i) => (
                      <tr key={i} className={`${!r.selected ? 'opacity-40' : ''} transition-opacity`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={r.selected} onChange={() => toggleRow(i)} className="rounded" />
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-[160px]">
                          <span className="block truncate" title={r.description}>{r.description}</span>
                        </td>
                        <td className="px-3 py-2">
                          <select value={r.type} onChange={e => updateType(i, e.target.value as 'income' | 'expense')}
                            className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 text-xs">
                            <option value="income">{tr.incomeLabel}</option>
                            <option value="expense">{tr.expenseLabel}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select value={r.category} onChange={e => updateCategory(i, e.target.value as Category)}
                            className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 text-xs">
                            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${r.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button onClick={reset}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {en ? 'Back' : 'Voltar'}
            </button>
            <button onClick={handleImport} disabled={loading || selected.length === 0}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading
                ? tr.loading
                : `${en ? 'Import' : 'Importar'} ${selected.length} ${tr.transactions.toLowerCase()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
