'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/lib/preferences-context'
import { Language, Currency } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { tr, prefs, setLanguage, setCurrency } = usePreferences()
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useState(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  })

  async function handleExport() {
    setExporting(true)
    setExportDone(false)
    try {
      const res = await fetch('/api/export-data')
      if (!res.ok) throw new Error('export failed')
      const json = await res.json()
      for (const [filename, b64] of Object.entries(json.files as Record<string, string>)) {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 200))
      }
      setExportDone(true)
    } catch {
      alert('Error exporting data. Please try again.')
    }
    setExporting(false)
  }

  async function handleDelete() {
    setDeleteError('')
    if (!confirmEmail) { setDeleteError(tr.deleteEmailPlaceholder + '.'); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_email: confirmEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error || 'Error deleting account.'); setDeleting(false); return }
      await createClient().auth.signOut()
      router.push('/login')
    } catch {
      setDeleteError('Connection error. Please try again.')
      setDeleting(false)
    }
  }

  const toggleBtn = (active: boolean) => cn(
    'flex-1 py-1.5 text-xs font-semibold transition-colors',
    active ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{tr.settingsTitle}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tr.settingsSubtitle}</p>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{tr.preferences}</h2>

        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{tr.language}</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {(['en', 'pt'] as Language[]).map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)} className={toggleBtn(prefs.language === lang)}>
                  {lang === 'en' ? 'English' : 'Português'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{tr.currency}</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {(['USD', 'BRL'] as Currency[]).map(cur => (
                <button key={cur} onClick={() => setCurrency(cur)} className={toggleBtn(prefs.currency === cur)}>
                  {cur === 'USD' ? '$ USD' : 'R$ BRL'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{tr.exportData}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tr.exportDataDesc}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          {exporting ? tr.exporting : tr.exportButton}
        </button>
        {exportDone && <p className="text-xs text-green-600 dark:text-green-400">{tr.exportDone}</p>}
      </div>

      {/* Delete account */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">{tr.deleteAccount}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tr.deleteAccountDesc}</p>
        </div>
        {!deleteOpen ? (
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            {tr.deleteButton}
          </button>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
              {tr.deleteConfirmText}
              {userEmail && <> {tr.deleteConfirmType} <strong>{userEmail}</strong> {tr.deleteConfirmType2}</>}
            </div>
            <input
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              placeholder={tr.deleteEmailPlaceholder}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900"
            />
            {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteOpen(false); setConfirmEmail(''); setDeleteError('') }}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? tr.deleting : tr.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legal */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        <p>
          {tr.legalLinks}{' '}
          <a href="/terms" target="_blank" className="underline hover:text-gray-600">{tr.termsOfUse}</a>
          {' '}{tr.and}{' '}
          <a href="/privacy" target="_blank" className="underline hover:text-gray-600">{tr.privacyPolicy}</a>.
        </p>
      </div>
    </div>
  )
}
