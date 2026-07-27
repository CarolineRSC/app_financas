import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Transaction, TransactionFilters, Category, TransactionType, ExpenseType } from './types'
import { ALL_CATEGORIES } from './categories'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR')
}

export function getCurrentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  return transactions.filter((t) => {
    // Date filtering
    if (filters.filterMode === 'monthly') {
      const [year, month] = t.date.split('-').map(Number)
      if (year !== filters.year) return false
      if (filters.month !== 0 && month !== filters.month) return false
    } else if (filters.filterMode === 'ytd') {
      const currentYear = new Date().getFullYear()
      const [year] = t.date.split('-').map(Number)
      if (year !== currentYear) return false
    } else if (filters.filterMode === 'range') {
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo   && t.date > filters.dateTo)   return false
    }

    if (filters.category    && t.category     !== filters.category)    return false
    if (filters.type        && t.type         !== filters.type)         return false
    if (filters.expense_type && t.expense_type !== filters.expense_type) return false
    if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })
}

export function exportToCSV(transactions: Transaction[], filename: string) {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Tipo de Gasto', 'Valor']
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.description,
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.category,
    t.expense_type === 'fixed' ? 'Fixo' : 'Variável',
    t.amount.toFixed(2).replace('.', ','),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(';'))
    .join('\n')

  const BOM = '﻿'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/* ── Excel export (transações filtradas) ── */
export async function exportToExcel(transactions: Transaction[], filename: string) {
  const XLSX = await import('xlsx')

  const rows = transactions.map((t) => ({
    Data: formatDate(t.date),
    Descrição: t.description,
    Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
    Categoria: t.category,
    'Tipo de Gasto': t.expense_type === 'fixed' ? 'Fixo' : 'Variável',
    'Valor (R$)': t.amount,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 12 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transações')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/* ── Excel template (planilha em branco para preenchimento) ── */
export async function downloadImportTemplate() {
  const XLSX = await import('xlsx')

  const example = [
    {
      Data: '01/06/2026',
      Descrição: 'Salário',
      Tipo: 'Receita',
      Categoria: 'Salário',
      'Tipo de Gasto': 'Fixo',
      'Valor (R$)': 5000,
    },
    {
      Data: '05/06/2026',
      Descrição: 'Supermercado',
      Tipo: 'Despesa',
      Categoria: 'Alimentação',
      'Tipo de Gasto': 'Variável',
      'Valor (R$)': 350.5,
    },
    {
      Data: '10/06/2026',
      Descrição: 'Netflix',
      Tipo: 'Despesa',
      Categoria: 'Lazer',
      'Tipo de Gasto': 'Fixo',
      'Valor (R$)': 55.9,
    },
  ]

  const ws = XLSX.utils.json_to_sheet(example)
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 12 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transações')
  XLSX.writeFile(wb, 'template_importacao.xlsx')
}

export interface ImportRow {
  date: string
  description: string
  type: TransactionType
  category: Category
  expense_type: ExpenseType
  amount: number
  error?: string
}

/* ── Excel import (lê arquivo e retorna linhas validadas) ── */
export async function parseImportFile(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws)

  return raw.map((row, i): ImportRow => {
    const errors: string[] = []

    // Data — aceita DD/MM/YYYY ou YYYY-MM-DD
    let date = ''
    const rawDate = String(row['Data'] ?? '').trim()
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/')
      date = `${y}-${m}-${d}`
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      date = rawDate
    } else {
      errors.push('Data inválida (use DD/MM/YYYY)')
    }

    // Tipo
    const rawType = String(row['Tipo'] ?? '').trim().toLowerCase()
    const type: TransactionType = rawType === 'receita' ? 'income' : 'expense'
    if (!['receita', 'despesa'].includes(rawType)) errors.push('Tipo inválido (use Receita ou Despesa)')

    // Categoria
    const category = String(row['Categoria'] ?? '').trim() as Category
    if (!ALL_CATEGORIES.includes(category)) errors.push(`Categoria inválida: ${category}`)

    // Tipo de gasto
    const rawExpense = String(row['Tipo de Gasto'] ?? '').trim().toLowerCase()
    const expense_type: ExpenseType = rawExpense === 'fixo' ? 'fixed' : 'variable'

    // Valor
    const rawAmount = row['Valor (R$)']
    const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(',', '.'))
    if (isNaN(amount) || amount <= 0) errors.push('Valor inválido')

    const description = String(row['Descrição'] ?? '').trim()
    if (!description) errors.push('Descrição obrigatória')

    return {
      date,
      description,
      type,
      category,
      expense_type,
      amount,
      ...(errors.length ? { error: errors.join('; ') } : {}),
    }
  })
}
