import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppSidebar from '@/components/layout/sidebar'
import { PreferencesProvider } from '@/lib/preferences-context'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <PreferencesProvider>
      <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
        <AppSidebar userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </PreferencesProvider>
  )
}
