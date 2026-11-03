import { execSync } from 'node:child_process'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * SEO: troca %APP_URL% no index.html pela URL pública (og:image e canonical
 * precisam de URL absoluta) e gera robots.txt + sitemap.xml no build.
 */
function seo(appUrl: string): Plugin {
  return {
    name: 'seo',
    transformIndexHtml(html) {
      return html.replaceAll('%APP_URL%', appUrl)
    },
    generateBundle() {
      if (!appUrl) {
        this.warn('VITE_APP_URL não definido — robots.txt/sitemap.xml não gerados e og:image ficará relativo.')
        return
      }
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          'Disallow: /aluno/',
          'Disallow: /personal/',
          '',
          `Sitemap: ${appUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `  <url><loc>${appUrl}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
          '</urlset>',
          '',
        ].join('\n'),
      })
    },
  }
}

/** Versão do build: data/hora (Brasília) + commit. A Vercel informa o commit em VERCEL_GIT_COMMIT_SHA. */
function buildVersion(): string {
  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date())
    .replace(',', '')
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      sha = ''
    }
  }
  return sha ? `${when} · ${sha.slice(0, 7)}` : when
}

export default defineConfig(({ mode }) => {
  const appUrl = (loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_URL ?? '').trim().replace(/\/$/, '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion()),
    },
    plugins: [
      react(),
      tailwindcss(),
      seo(appUrl),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'Ricardo Neves Personal',
          short_name: 'RN Personal',
          description: 'Seu treino. Sua evolução. Seu resultado.',
          theme_color: '#1a1f1c',
          background_color: '#f7f8f7',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/aluno',
          lang: 'pt-BR',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Cache apenas estáticos públicos — nunca respostas privadas da API
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Bibliotecas em arquivos próprios: mudam pouco e ficam no cache entre deploys
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
    base: '/',
  }
})
