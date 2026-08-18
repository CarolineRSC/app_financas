import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Investment, InvestmentSnapshot } from '@/lib/types'
import InvestmentsClient from '@/components/investments/investments-client'

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: investments }, { data: snapshots }] = await Promise.all([
    supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('investment_snapshots').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }),
  ])

  return (
    <InvestmentsClient
      initialInvestments={(investments ?? []) as Investment[]}
      initialSnapshots={(snapshots ?? []) as InvestmentSnapshot[]}
    />
  )
}
