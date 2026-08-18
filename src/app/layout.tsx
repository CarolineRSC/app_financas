import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Simple Budget — Track your finances, simply',
  description:
    'Personal finance tracking app. Record income and expenses, visualize charts, and stay in control of your money.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
