import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finança Fácil — Controle suas finanças pessoais',
  description:
    'App de gestão financeira pessoal. Registre receitas e despesas, visualize gráficos e tenha controle total do seu dinheiro.',
}

/* Aplica o tema salvo antes do React hidratar — evita flash */
const themeScript = `
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
