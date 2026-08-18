'use client'

import { useState, useEffect, ReactElement } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/lib/preferences-context'

const NAV_ICONS: Record<string, ReactElement> = {
  '/dashboard': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  '/transactions': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),
  '/net-worth': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  '/settings': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
}

export default function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { tr } = usePreferences()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [dark, setDark]             = useState(false)

  const navItems = [
    { href: '/dashboard',    label: tr.dashboard    },
    { href: '/transactions', label: tr.transactions },
    { href: '/net-worth',    label: tr.netWorthNav  },
    { href: '/settings',     label: tr.settings     },
  ]

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-600 flex-shrink-0 shadow-sm shadow-blue-500/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span className="font-semibold text-[15px] text-gray-900 dark:text-white tracking-tight">Simple Budget</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
              )}
            >
              <span className={cn('flex-shrink-0 transition-colors', active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}>
                {NAV_ICONS[item.href]}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 space-y-0.5 border-t border-gray-100 dark:border-gray-800 mt-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-gray-600 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:bg-gray-800/60 transition-all duration-200"
        >
          <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </span>
          {dark ? tr.lightMode : tr.darkMode}
        </button>

        <div className="px-3 py-2">
          <p className="text-[12px] text-gray-400 dark:text-gray-500 truncate">{userEmail}</p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all duration-200 disabled:opacity-50"
        >
          <span className="flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          {signingOut ? tr.signingOut : tr.signOut}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-blue-600">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-[14px] tracking-tight">Simple Budget</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={cn(
        'fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-gray-950 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden border-r border-gray-100 dark:border-gray-800',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:flex-shrink-0 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800">
        <SidebarContent />
      </aside>
    </>
  )
}
