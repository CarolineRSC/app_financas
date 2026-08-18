'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Preferences, DEFAULT_PREFERENCES, Language, Currency, t, formatCurrency } from '@/lib/i18n'

type Translations = Record<string, string>

interface PreferencesContextValue {
  prefs: Preferences
  tr: Translations
  fmt: (amount: number) => string
  setLanguage: (lang: Language) => Promise<void>
  setCurrency: (cur: Currency) => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: DEFAULT_PREFERENCES,
  tr: t.en as Translations,
  fmt: (n) => String(n),
  setLanguage: async () => {},
  setCurrency: async () => {},
})

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('user_preferences')
        .select('language, currency')
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row) setPrefs({ language: row.language as Language, currency: row.currency as Currency })
        })
    })
  }, [])

  const save = useCallback(async (next: Preferences) => {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    await supabase.from('user_preferences').upsert({
      user_id: data.user.id,
      language: next.language,
      currency: next.currency,
      updated_at: new Date().toISOString(),
    })
    setPrefs(next)
  }, [])

  const setLanguage = useCallback((lang: Language) => save({ ...prefs, language: lang }), [prefs, save])
  const setCurrency = useCallback((cur: Currency) => save({ ...prefs, currency: cur }), [prefs, save])

  const tr = t[prefs.language] as Translations
  const fmt = useCallback((amount: number) => formatCurrency(amount, prefs.currency), [prefs.currency])

  return (
    <PreferencesContext.Provider value={{ prefs, tr, fmt, setLanguage, setCurrency }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}
