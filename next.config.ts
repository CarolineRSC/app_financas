import type { NextConfig } from "next";

const securityHeaders = [
  // Bloqueia o app de ser embutido em iframes de outros sites (anti-clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impede o browser de adivinhar o tipo do arquivo (evita ataques com uploads maliciosos)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Força HTTPS por 1 ano em produção
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Não envia a URL completa do app como "referrer" para sites externos
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desativa funcionalidades de browser que o app não usa (câmera, microfone, geolocalização)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Limita de onde scripts, estilos e dados podem ser carregados
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js precisa de scripts inline para hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind e estilos inline do React
      "style-src 'self' 'unsafe-inline'",
      // Apenas o Supabase como fonte de dados externa
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
      // Imagens apenas do próprio app
      "img-src 'self' data: blob:",
      // Workers para o PDF.js
      "worker-src 'self' blob:",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['canvas'] = false
    config.resolve.alias['encoding'] = false
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
