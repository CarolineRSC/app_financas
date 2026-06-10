import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finança Fácil — Controle suas finanças pessoais',
  description:
    'App de gestão financeira pessoal. Registre receitas e despesas, visualize gráficos e tenha controle total do seu dinheiro.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
