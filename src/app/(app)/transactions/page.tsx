import { createClient } from '@/lib/supabase/server'
import TransactionsClient from '@/components/transactions/transactions-client'
import { Transaction } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
  }

  return <TransactionsClient initialTransactions={(transactions as Transaction[]) ?? []} />
}
