import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Account, Investment, InvestmentSnapshot } from '@/lib/types'
import NetWorthClient from '@/components/net-worth/net-worth-client'

export default async function NetWorthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: investments }, { data: snapshots }] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('investment_snapshots').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }),
  ])

  return (
    <NetWorthClient
      initialAccounts={(accounts ?? []) as Account[]}
      initialInvestments={(investments ?? []) as Investment[]}
      initialSnapshots={(snapshots ?? []) as InvestmentSnapshot[]}
    />
  )
}
