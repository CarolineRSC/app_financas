import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Investment } from '@/lib/types'
import InvestmentsClient from '@/components/investments/investments-client'

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <InvestmentsClient initialInvestments={(data ?? []) as Investment[]} />
}
