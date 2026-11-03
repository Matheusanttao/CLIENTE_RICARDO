import type { CapacitorConfig } from '@capacitor/cli'

/**
 * App Android = "casca" que carrega o site de produção.
 * Todo deploy na Vercel já aparece no app — não precisa gerar APK novo
 * (só se mudar ícone, nome, permissões ou esta configuração).
 */
const APP_URL = 'https://personalricardoneves.com.br'

const config: CapacitorConfig = {
  appId: 'br.com.personalricardoneves.app',
  appName: 'RN Personal',
  // Só uma página local de "sem conexão"; o app real vem de APP_URL.
  webDir: 'native/www',
  server: {
    url: APP_URL,
    cleartext: false,
    errorPath: 'offline.html',
  },
  plugins: {
    // Barras do sistema: conteúdo de ponta a ponta, ícones claros sobre fundo escuro
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
  android: {
    // Usado pelo site para esconder a home institucional (src/lib/native/isNativeApp.ts)
    appendUserAgent: 'RNPersonalApp',
    backgroundColor: '#1a1f1c',
  },
}

export default config
