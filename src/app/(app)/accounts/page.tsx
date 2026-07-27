import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Account } from '@/lib/types'
import AccountsClient from '@/components/accounts/accounts-client'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <AccountsClient initialAccounts={(data ?? []) as Account[]} />
}
