import Link from 'next/link'

const features = [
  {
    icon: '📊',
    title: 'Dashboard Visual',
    description:
      'Visualize receitas, despesas e saldo em cards claros e gráficos de categorias.',
  },
  {
    icon: '💸',
    title: 'Controle de Transações',
    description:
      'Registre receitas e despesas com descrição, categoria e data. Edite ou exclua quando quiser.',
  },
  {
    icon: '🔍',
    title: 'Filtros e Busca',
    description:
      'Filtre por mês, categoria ou tipo. Busque transações pela descrição rapidamente.',
  },
  {
    icon: '📥',
    title: 'Exportar CSV',
    description:
      'Exporte suas transações filtradas em formato CSV para usar em planilhas.',
  },
  {
    icon: '🔒',
    title: 'Dados Seguros',
    description:
      'Autenticação com e-mail e senha. Seus dados são privados e protegidos com RLS.',
  },
  {
    icon: '📱',
    title: 'Responsivo',
    description:
      'Use em qualquer dispositivo. Layout adaptado para desktop e mobile.',
  },
]

const categories = [
  { name: 'Alimentação', color: 'bg-orange-100 text-orange-700' },
  { name: 'Transporte', color: 'bg-blue-100 text-blue-700' },
  { name: 'Moradia', color: 'bg-purple-100 text-purple-700' },
  { name: 'Lazer', color: 'bg-pink-100 text-pink-700' },
  { name: 'Saúde', color: 'bg-teal-100 text-teal-700' },
  { name: 'Educação', color: 'bg-amber-100 text-amber-700' },
  { name: 'Salário', color: 'bg-green-100 text-green-700' },
  { name: 'Freelance', color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Outros', color: 'bg-gray-100 text-gray-700' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              FF
            </div>
            <span className="font-semibold text-gray-900">Finança Fácil</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 mb-4">
            100% Gratuito
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Controle suas finanças{' '}
            <span className="text-blue-600">de forma simples</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Registre receitas e despesas, visualize gráficos por categoria e
            acompanhe seu saldo mensal. Tudo em um só lugar, com segurança.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-all hover:shadow-lg"
            >
              Começar agora — é grátis
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Mock Dashboard Preview */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4 mb-16">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-gray-400 font-mono">app.financafacil.com/dashboard</span>
          </div>
          <div className="p-6 bg-slate-50">
            {/* Mock cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Receitas</p>
                <p className="text-xl font-bold text-green-600">R$ 5.800,00</p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Despesas</p>
                <p className="text-xl font-bold text-red-500">R$ 3.240,00</p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Saldo</p>
                <p className="text-xl font-bold text-blue-600">R$ 2.560,00</p>
              </div>
            </div>
            {/* Mock transactions */}
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Últimas transações</p>
              {[
                { desc: 'Salário', cat: 'Salário', val: '+R$ 4.500,00', cor: 'text-green-600' },
                { desc: 'Supermercado', cat: 'Alimentação', val: '-R$ 380,00', cor: 'text-red-500' },
                { desc: 'Aluguel', cat: 'Moradia', val: '-R$ 1.200,00', cor: 'text-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.desc}</p>
                    <p className="text-xs text-gray-400">{item.cat}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.cor}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl mb-3">
            Tudo que você precisa
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Funcionalidades pensadas para simplificar o controle financeiro do dia a dia.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Categorias pré-definidas
          </h2>
          <p className="text-gray-500 mb-8">
            Classifique suas transações em categorias relevantes para melhor visualização.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <span
                key={cat.name}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${cat.color}`}
              >
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
            Comece a controlar suas finanças hoje
          </h2>
          <p className="mt-3 text-blue-100">
            Crie sua conta grátis e tenha controle total do seu dinheiro em minutos.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-md"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-8 text-center sm:px-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
            FF
          </div>
          <span className="font-semibold text-gray-900 text-sm">Finança Fácil</span>
        </div>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Finança Fácil. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  )
}
