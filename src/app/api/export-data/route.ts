import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const [txRes, acRes, invRes] = await Promise.all([
    supabase.from('transactions').select('date,description,amount,type,category,expense_type').order('date', { ascending: false }),
    supabase.from('accounts').select('name,institution,type,balance').order('name'),
    supabase.from('investments').select('name,type,invested_amount,current_value,purchase_date').order('name'),
  ])

  if (txRes.error || acRes.error || invRes.error) {
    return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 })
  }

  const transactions = toCsv(txRes.data as Record<string, unknown>[])
  const accounts     = toCsv(acRes.data as Record<string, unknown>[])
  const investments  = toCsv(invRes.data as Record<string, unknown>[])

  const boundary = 'ff-export-boundary'
  const timestamp = new Date().toISOString().slice(0, 10)

  // Return a simple JSON with base64-encoded CSVs — client assembles into ZIP or downloads individually
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = (globalThis as any).Buffer
  const payload = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    files: {
      [`transactions_${timestamp}.csv`]: buf.from(transactions || 'date,description,amount,type,category,expense_type').toString('base64'),
      [`accounts_${timestamp}.csv`]:     buf.from(accounts     || 'name,institution,type,balance').toString('base64'),
      [`investments_${timestamp}.csv`]:  buf.from(investments  || 'name,type,invested_amount,current_value,purchase_date').toString('base64'),
    },
  }

  void boundary // suppress unused var warning — kept for future multipart support

  return NextResponse.json(payload)
}
