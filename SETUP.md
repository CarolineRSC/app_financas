# Finança Fácil — Guia de Configuração

## Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) (para deploy)

---

## 1. Liberar espaço em disco (OBRIGATÓRIO)

O disco está cheio. Antes de instalar as dependências, libere pelo menos 1.5 GB:

**Opção mais fácil:** Abra o **Finder → Ir → Biblioteca → Caches** e apague a pasta `com.spotify.client` (4.3 GB).

Ou via Terminal:
```bash
rm -rf ~/Library/Caches/com.spotify.client
```

---

## 2. Instalar dependências

```bash
cd "/Users/Carol/Desktop/App_Finanças/app-financas"
npm install
```

---

## 3. Configurar o Supabase

### 3.1 Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL** e a **anon key** (em Settings > API)

### 3.2 Criar a tabela de transações
1. No Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run**

### 3.3 Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Edite `.env.local` com suas credenciais:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

---

## 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 5. Deploy na Vercel

1. Faça push do código para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente no painel da Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

---

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login
│   │   └── register/page.tsx       # Cadastro
│   └── (app)/
│       ├── layout.tsx              # Layout com sidebar
│       ├── dashboard/page.tsx      # Dashboard
│       └── transactions/page.tsx   # Transações
├── components/
│   ├── layout/sidebar.tsx          # Sidebar responsiva
│   ├── dashboard/
│   │   ├── dashboard-client.tsx    # Dashboard interativo
│   │   └── category-chart.tsx      # Gráfico de pizza
│   └── transactions/
│       ├── transactions-client.tsx # Lista com CRUD e filtros
│       └── transaction-modal.tsx   # Formulário de transação
└── lib/
    ├── types.ts                    # Tipos TypeScript
    ├── categories.ts               # Categorias e cores
    ├── utils.ts                    # Utilitários (cn, formatCurrency, exportToCSV...)
    └── supabase/
        ├── client.ts               # Cliente browser
        └── server.ts               # Cliente server (SSR)
```

## Stack
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Auth + PostgreSQL + RLS)
- **Recharts** (gráfico de pizza)
