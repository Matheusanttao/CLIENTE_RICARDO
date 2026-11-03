import logoMark from '@/assets/logo-mark.png'

/**
 * Abertura enquanto o app confere o login. Sem texto: só a marca pulsando.
 * Só aparece se demorar (atraso de 250ms), então não "pisca" em carregamentos rápidos.
 */
export function LoadingScreen({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-[rn-fade-in_.3s_ease-out_.25s_both]">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--graphite)] p-3 shadow-2xl shadow-primary/10 animate-[rn-pulse_1.6s_ease-in-out_infinite]">
        <img src={logoMark} alt="" className="h-full w-full object-contain" />
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {label}
      </span>
    </div>
  )
}

/** Troca de tela: barrinha fina no topo em vez de tela cheia. */
export function RouteProgress() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" role="progressbar" aria-label="Carregando">
      <div className="h-full w-1/3 bg-primary animate-[rn-progress_1s_ease-in-out_infinite]" />
    </div>
  )
}
