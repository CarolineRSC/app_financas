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

/* ── Minimal OOXML builder (no external deps) ── */

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colLetter(n: number): string {
  let s = ''
  let col = n + 1
  while (col > 0) {
    const r = (col - 1) % 26
    s = String.fromCharCode(65 + r) + s
    col = Math.floor((col - 1) / 26)
  }
  return s
}

type XlsxRow = (string | number)[]

function buildXlsx(headers: string[], rows: XlsxRow[]): Uint8Array {
  const allRows = [headers, ...rows]
  const sharedStrings: string[] = []
  const ssMap = new Map<string, number>()

  function si(v: string): number {
    if (!ssMap.has(v)) { ssMap.set(v, sharedStrings.length); sharedStrings.push(v) }
    return ssMap.get(v)!
  }

  const sheetRows = allRows.map((row, ri) =>
    `<row r="${ri + 1}">${row.map((cell, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`
      if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`
      return `<c r="${ref}" t="s"><v>${si(escapeXml(String(cell)))}</v></c>`
    }).join('')}</row>`
  ).join('')

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\
<sheetData>${sheetRows}</sheetData></worksheet>`

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">\
${sharedStrings.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" \
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\
<sheets><sheet name="Transações" sheetId="1" r:id="rId1"/></sheets></workbook>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\
</Relationships>`

  const pkgRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\
</Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\
<Default Extension="xml" ContentType="application/xml"/>\
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>\
</Types>`

  const enc = new TextEncoder()
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(pkgRels),
    'xl/workbook.xml': enc.encode(wbXml),
    'xl/_rels/workbook.xml.rels': enc.encode(wbRels),
    'xl/worksheets/sheet1.xml': enc.encode(sheetXml),
    'xl/sharedStrings.xml': enc.encode(ssXml),
  }

  // Minimal ZIP writer (stored, no compression)
  const parts: Uint8Array[] = []
  const centralDir: Uint8Array[] = []
  let offset = 0

  for (const [name, data] of Object.entries(files)) {
    const nameBytes = enc.encode(name)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const dv = new DataView(local.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, data.length, true)
    dv.setUint32(22, data.length, true)
    dv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)

    const cd = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(cd.buffer)
    cdv.setUint32(0, 0x02014b50, true)
    cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true)
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, data.length, true)
    cdv.setUint32(24, data.length, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)

    parts.push(local)
    centralDir.push(cd)
    offset += local.length
  }

  const cdSize = centralDir.reduce((s, b) => s + b.length, 0)
  const eocd = new Uint8Array(22)
  const eodv = new DataView(eocd.buffer)
  eodv.setUint32(0, 0x06054b50, true)
  eodv.setUint16(8, centralDir.length, true)
  eodv.setUint16(10, centralDir.length, true)
  eodv.setUint32(12, cdSize, true)
  eodv.setUint32(16, offset, true)

  const all = [...parts, ...centralDir, eocd]
  const total = all.reduce((s, b) => s + b.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const b of all) { out.set(b, pos); pos += b.length }
  return out
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function downloadXlsx(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ── Excel export (transações filtradas) ── */
export function exportToExcel(transactions: Transaction[], filename: string) {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Tipo de Gasto', 'Valor (R$)']
  const rows: XlsxRow[] = transactions.map((t) => [
    formatDate(t.date),
    t.description,
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.category,
    t.expense_type === 'fixed' ? 'Fixo' : 'Variável',
    t.amount,
  ])
  downloadXlsx(buildXlsx(headers, rows), `${filename}.xlsx`)
}

/* ── Excel template (planilha em branco para preenchimento) ── */
export function downloadImportTemplate() {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Tipo de Gasto', 'Valor (R$)']
  const rows: XlsxRow[] = [
    ['01/06/2026', 'Salário',      'Receita', 'Salário',      'Fixo',     5000],
    ['05/06/2026', 'Supermercado', 'Despesa', 'Alimentação',  'Variável',  350.5],
    ['10/06/2026', 'Netflix',      'Despesa', 'Lazer',        'Fixo',      55.9],
  ]
  downloadXlsx(buildXlsx(headers, rows), 'template_importacao.xlsx')
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

/* ── Minimal XLSX reader (no external deps) ── */

function readZipEntry(buf: ArrayBuffer, name: string): string | null {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  const enc = new TextEncoder()
  const nameBytes = enc.encode(name)
  for (let i = 0; i < bytes.length - 4; i++) {
    if (view.getUint32(i, true) !== 0x04034b50) continue
    const fnLen = view.getUint16(i + 26, true)
    const extraLen = view.getUint16(i + 28, true)
    const fn = bytes.slice(i + 30, i + 30 + fnLen)
    if (fn.length !== nameBytes.length) continue
    if (!fn.every((b, j) => b === nameBytes[j])) continue
    const dataStart = i + 30 + fnLen + extraLen
    const compSize = view.getUint32(i + 18, true)
    const dec = new TextDecoder()
    return dec.decode(bytes.slice(dataStart, dataStart + compSize))
  }
  return null
}

function parseXlsxSharedStrings(xml: string): string[] {
  const result: string[] = []
  const re = /<si>[\s\S]*?<\/si>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const t = m[0].match(/<t[^>]*>([\s\S]*?)<\/t>/g)
    result.push(t ? t.map(s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")).join('') : '')
  }
  return result
}

function parseXlsxSheet(xml: string, ss: string[]): Record<string, string | number>[] {
  const headerMap: Record<string, string> = {}
  const dataRows: Record<string, string | number>[] = []
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g
  let rowM: RegExpExecArray | null
  let rowIdx = 0
  while ((rowM = rowRe.exec(xml)) !== null) {
    const cells: Record<string, string | number> = {}
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g
    let cM: RegExpExecArray | null
    while ((cM = cellRe.exec(rowM[1])) !== null) {
      const col = cM[1]
      const attrs = cM[3]
      const inner = cM[4]
      const vM = inner.match(/<v>([\s\S]*?)<\/v>/)
      if (!vM) continue
      const raw = vM[1]
      let val: string | number
      if (/t="s"/.test(attrs)) {
        val = ss[parseInt(raw)] ?? ''
      } else if (/t="str"/.test(attrs)) {
        val = raw
      } else {
        const n = parseFloat(raw)
        val = isNaN(n) ? raw : n
      }
      cells[col] = val
    }
    if (rowIdx === 0) {
      Object.entries(cells).forEach(([col, v]) => { headerMap[col] = String(v) })
    } else if (Object.keys(cells).length > 0) {
      const mapped: Record<string, string | number> = {}
      Object.entries(cells).forEach(([col, v]) => {
        if (headerMap[col]) mapped[headerMap[col]] = v
      })
      dataRows.push(mapped)
    }
    rowIdx++
  }
  return dataRows
}

/* ── Excel import (lê arquivo e retorna linhas validadas) ── */
export async function parseImportFile(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer()
  const ssXml  = readZipEntry(buffer, 'xl/sharedStrings.xml') ?? ''
  const shXml  = readZipEntry(buffer, 'xl/worksheets/sheet1.xml') ?? ''
  const ss     = parseXlsxSharedStrings(ssXml)
  const raw    = parseXlsxSheet(shXml, ss)

  return raw.map((row): ImportRow => {
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
