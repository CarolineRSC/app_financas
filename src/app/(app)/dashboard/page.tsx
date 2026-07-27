import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/dashboard-client'
import { Transaction, Account, Investment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: transactions }, { data: accounts }, { data: investments }] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('accounts').select('*').order('created_at', { ascending: false }),
    supabase.from('investments').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <DashboardClient
      initialTransactions={(transactions ?? []) as Transaction[]}
      initialAccounts={(accounts ?? []) as Account[]}
      initialInvestments={(investments ?? []) as Investment[]}
    />
  )
}
