import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Category } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: Category
  expense_type: 'fixed' | 'variable'
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase()
  if (/restaurant|food|pizza|mcdonald|burger|taco|sushi|cafe|coffee|starbucks|chick|wendy|subway|eat|dine|grubhub|doordash|uber.eat/i.test(d)) return 'Alimentação'
  if (/uber|lyft|gas|fuel|parking|toll|transit|transport|shell|chevron|bp |exxon/i.test(d)) return 'Transporte'
  if (/rent|mortgage|hoa|electric|water|internet|utility|comcast|xfinity/i.test(d)) return 'Moradia'
  if (/netflix|spotify|hulu|disney|prime|openai|chatgpt|apple.one|cinema|movie|theater|game|steam/i.test(d)) return 'Lazer'
  if (/pharmacy|cvs|walgreen|doctor|hospital|clinic|dental|vision|health|medical/i.test(d)) return 'Saúde'
  if (/tuition|school|college|university|course|udemy|coursera|book/i.test(d)) return 'Educação'
  if (/salary|payroll|direct deposit|paycheck/i.test(d)) return 'Salário'
  if (/freelance|consulting|invoice|client/i.test(d)) return 'Freelance'
  return 'Outros'
}

function parseBofA(text: string): ParsedRow[] {
  const results: ParsedRow[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  let section: 'income' | 'expense' | null = null
  const txnRe = /^(\d{2}\/\d{2}\/\d{2})\s*(.*?)\s*(-?\d{1,3}(?:,\d{3})*\.\d{2})$/

  for (const line of lines) {
    if (/deposits and other additions/i.test(line))  { section = 'income';  continue }
    if (/withdrawals|subtractions|payments/i.test(line)) { section = 'expense'; continue }
    if (/^(date|total|page \d|bank of america|description|amount|\$[\d,]+)/i.test(line)) continue
    if (/^(caroline|continued on|scam|pause)/i.test(line)) continue

    const m = line.match(txnRe)
    if (!m || !section) continue

    const [, rawDate, rawDesc, rawAmt] = m
    const numAmt = parseFloat(rawAmt.replace(/,/g, ''))
    if (isNaN(numAmt)) continue

    const [mo, dy, yr] = rawDate.split('/')
    const date = `20${yr}-${mo}-${dy}`
    const description = rawDesc.trim() || 'Transação'
    const amount = Math.abs(numAmt)
    const type: 'income' | 'expense' = numAmt > 0 ? 'income' : 'expense'

    results.push({
      date, description, amount, type,
      category: guessCategory(description),
      expense_type: 'variable',
    })
  }

  return results
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    if (!file.type.includes('pdf'))
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo permitido: 10MB.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // Use internal path to avoid pdf-parse loading test files on import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const parsed = await pdfParse(buffer)

    const rows = parseBofA(parsed.text)

    if (rows.length === 0) {
      return NextResponse.json({
        error: 'Nenhuma transação encontrada. Certifique-se que é um extrato do Bank of America em PDF.',
      }, { status: 422 })
    }

    return NextResponse.json({ rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('parse-pdf error:', message)
    return NextResponse.json({ error: `Erro ao processar: ${message}` }, { status: 500 })
  }
}
