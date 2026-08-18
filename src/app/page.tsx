'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const features = [
  {
    icon: '📊',
    title: 'Visual Dashboard',
    description: 'See your income, expenses, and balance at a glance with clear cards and category charts.',
  },
  {
    icon: '💸',
    title: 'Transaction Tracking',
    description: 'Log income and expenses with description, category, and date. Edit or delete anytime.',
  },
  {
    icon: '🔍',
    title: 'Filters & Search',
    description: 'Filter by month, category, or type. Search transactions by description instantly.',
  },
  {
    icon: '📥',
    title: 'Import & Export',
    description: 'Import from Excel or PDF bank statements. Export your data as CSV anytime.',
  },
  {
    icon: '🔒',
    title: 'Your Data, Secure',
    description: 'Email and password authentication. Your data is private and protected with row-level security.',
  },
  {
    icon: '📱',
    title: 'Works Everywhere',
    description: 'Use on any device. Fully responsive layout for desktop and mobile.',
  },
]

const categories = [
  { name: 'Food',       light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-900/40 text-orange-300' },
  { name: 'Transport',  light: 'bg-blue-100 text-blue-700',     dark: 'bg-blue-900/40 text-blue-300' },
  { name: 'Housing',    light: 'bg-purple-100 text-purple-700', dark: 'bg-purple-900/40 text-purple-300' },
  { name: 'Leisure',    light: 'bg-pink-100 text-pink-700',     dark: 'bg-pink-900/40 text-pink-300' },
  { name: 'Health',     light: 'bg-teal-100 text-teal-700',     dark: 'bg-teal-900/40 text-teal-300' },
  { name: 'Education',  light: 'bg-amber-100 text-amber-700',   dark: 'bg-amber-900/40 text-amber-300' },
  { name: 'Salary',     light: 'bg-green-100 text-green-700',   dark: 'bg-green-900/40 text-green-300' },
  { name: 'Freelance',  light: 'bg-cyan-100 text-cyan-700',     dark: 'bg-cyan-900/40 text-cyan-300' },
  { name: 'Others',     light: 'bg-gray-100 text-gray-700',     dark: 'bg-gray-700 text-gray-300' },
]

export default function LandingPage() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') setDark(true)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const d = dark

  return (
    <div className={d ? 'min-h-screen bg-gray-950 text-white' : 'min-h-screen bg-white text-gray-900'}>

      {/* Navbar */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${d ? 'border-gray-800 bg-gray-950/80' : 'border-gray-100 bg-white/80'}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">SB</div>
            <span className={`font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Simple Budget</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              title={d ? 'Light mode' : 'Dark mode'}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${d ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              {d ? '☀️' : '🌙'}
            </button>
            <Link href="/login" className={`text-sm font-medium transition-colors ${d ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 ${d ? 'bg-gradient-to-b from-blue-950 to-gray-950' : 'bg-gradient-to-b from-blue-50 to-white'}`}>
        <div className="mx-auto max-w-3xl text-center">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mb-4 ${d ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            Free to use
          </span>
          <h1 className={`text-4xl font-bold tracking-tight sm:text-5xl ${d ? 'text-white' : 'text-gray-900'}`}>
            Track your finances{' '}
            <span className="text-blue-500">the simple way</span>
          </h1>
          <p className={`mt-5 text-lg leading-relaxed max-w-2xl mx-auto ${d ? 'text-gray-400' : 'text-gray-600'}`}>
            Log income and expenses, visualize spending by category, and monitor your monthly balance — all in one place, with your data fully private.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-all hover:shadow-lg">
              Get started — it&apos;s free
            </Link>
            <Link href="/login" className={`w-full sm:w-auto rounded-xl border px-8 py-3.5 text-base font-semibold transition-colors ${d ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Mock Dashboard Preview */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4 mb-16">
        <div className={`rounded-2xl border shadow-xl overflow-hidden ${d ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className={`border-b px-4 py-3 flex items-center gap-2 ${d ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className={`ml-2 text-xs font-mono ${d ? 'text-gray-500' : 'text-gray-400'}`}>simplebudget.vercel.app/dashboard</span>
          </div>
          <div className={`p-6 ${d ? 'bg-gray-900' : 'bg-slate-50'}`}>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Income',   val: '$5,800.00', color: 'text-green-500' },
                { label: 'Expenses', val: '$3,240.00', color: 'text-red-400' },
                { label: 'Balance',  val: '$2,560.00', color: 'text-blue-500' },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border shadow-sm p-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</p>
                  <p className={`text-xl font-bold ${c.color}`}>{c.val}</p>
                </div>
              ))}
            </div>
            <div className={`rounded-xl border shadow-sm p-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <p className={`text-sm font-semibold mb-3 ${d ? 'text-gray-200' : 'text-gray-700'}`}>Recent transactions</p>
              {[
                { desc: 'Paycheck',     cat: 'Salary',    val: '+$4,500.00', cor: 'text-green-500' },
                { desc: 'Grocery Store', cat: 'Food',     val: '-$380.00',   cor: 'text-red-400' },
                { desc: 'Rent',          cat: 'Housing',  val: '-$1,200.00', cor: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${d ? 'border-gray-700' : 'border-gray-50'}`}>
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-800'}`}>{item.desc}</p>
                    <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{item.cat}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.cor}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`px-4 py-16 sm:px-6 ${d ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className={`text-center text-2xl font-bold sm:text-3xl mb-3 ${d ? 'text-white' : 'text-gray-900'}`}>
            Everything you need
          </h2>
          <p className={`text-center mb-10 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Built to simplify your day-to-day financial tracking.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className={`font-semibold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${d ? 'text-gray-400' : 'text-gray-500'}`}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className={`text-2xl font-bold mb-3 ${d ? 'text-white' : 'text-gray-900'}`}>
            Built-in categories
          </h2>
          <p className={`mb-8 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Classify your transactions into meaningful categories for better insight.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <span key={cat.name} className={`rounded-full px-4 py-1.5 text-sm font-medium ${d ? cat.dark : cat.light}`}>
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Start tracking your finances today
          </h2>
          <p className="mt-3 text-blue-100">
            Create your free account and take control of your money in minutes.
          </p>
          <Link href="/register" className="mt-6 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-md">
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t px-4 py-8 text-center sm:px-6 ${d ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">SB</div>
          <span className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Simple Budget</span>
        </div>
        <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
          © {new Date().getFullYear()} Simple Budget. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
