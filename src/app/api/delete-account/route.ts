import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  // Verify confirmation email from request body
  const body = await req.json().catch(() => ({}))
  if (!body.confirm_email || body.confirm_email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'E-mail de confirmação incorreto.' }, { status: 400 })
  }

  // Delete all user data from tables (RLS ensures only this user's rows are deleted)
  const { error: txErr }  = await supabase.from('transactions').delete().eq('user_id', user.id)
  const { error: acErr }  = await supabase.from('accounts').delete().eq('user_id', user.id)
  const { error: invErr } = await supabase.from('investments').delete().eq('user_id', user.id)

  if (txErr || acErr || invErr) {
    console.error('delete-account data error:', { txErr, acErr, invErr })
    return NextResponse.json({ error: 'Erro ao remover dados. Tente novamente.' }, { status: 500 })
  }

  // Delete the Auth user — requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    // Graceful fallback: data is deleted, auth account remains but is empty.
    // Set SUPABASE_SERVICE_ROLE_KEY in .env.local and Vercel to enable full deletion.
    console.warn('delete-account: SUPABASE_SERVICE_ROLE_KEY not set — data deleted, auth user kept')
    return NextResponse.json({ partial: true, message: 'Dados removidos. Conta Auth não deletada (configure SUPABASE_SERVICE_ROLE_KEY).' })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: authErr } = await adminClient.auth.admin.deleteUser(user.id)
  if (authErr) {
    console.error('delete-account auth error:', authErr)
    return NextResponse.json({ error: 'Dados removidos, mas falha ao deletar conta Auth.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
