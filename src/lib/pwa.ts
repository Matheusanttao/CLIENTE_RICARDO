import { registerSW } from 'virtual:pwa-register'

/**
 * Atualização automática: quando sobe uma versão nova na Vercel, o app
 * baixa e recarrega sozinho. Também confere ao voltar para o app e a cada 5 min.
 */
export function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update()
      }
      setInterval(check, 5 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
    onNeedRefresh() {
      void updateSW(true)
    },
  })
}
