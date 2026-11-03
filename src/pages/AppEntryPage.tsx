import { Link, Navigate } from 'react-router-dom'
import { ChevronRight, Dumbbell, UserRound } from 'lucide-react'
import logoMark from '@/assets/logo-mark.png'
import ricardo from '@/assets/ricardo.webp'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND } from '@/lib/constants'
import { APP_VERSION } from '@/lib/version'

/**
 * Tela de boas-vindas do app (APK). Substitui o site institucional:
 * se já houver sessão vai direto para a área certa; senão pergunta quem é.
 */
export function AppEntryPage() {
  const auth = useAuth()

  if (auth.configured && auth.loading) return <LoadingScreen />
  if (auth.session && auth.isStaff) return <Navigate to="/personal/dashboard" replace />
  if (auth.session && auth.isStudent) return <Navigate to="/aluno/inicio" replace />

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0e1210] text-white">
      {/* foto de fundo com degradê para leitura */}
      <img
        src={ricardo}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1210]/60 via-[#0e1210]/40 to-[#0e1210]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0e1210] via-[#0e1210]/95 to-transparent" aria-hidden />

      <div className="relative flex flex-1 flex-col px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(2.5rem+var(--safe-top))]">
        <div className="flex flex-col items-center gap-2">
          <img src={logoMark} alt="" className="h-16 w-16 drop-shadow-[0_4px_24px_rgba(57,229,57,0.35)]" />
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-white/90">{BRAND.name.replace(' Personal', '')}</p>
        </div>

        <div className="mt-auto space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3e635]">Personal Trainer</p>
            <h1 className="font-display text-4xl font-bold leading-tight">
              Seu treino.
              <br />
              Sua evolução.
              <br />
              <span className="text-[#a3e635]">Seu resultado.</span>
            </h1>
          </div>

          <div className="space-y-3">
            <Link
              to="/aluno"
              className="flex h-16 items-center gap-4 rounded-2xl bg-[#a3e635] px-5 text-[#142014] shadow-lg shadow-[#a3e635]/20 transition-transform active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#142014]/10">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1 text-left">
                <span className="block font-display text-base font-semibold">Sou aluno</span>
                <span className="block text-xs opacity-75">Ver meus treinos e evolução</span>
              </span>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Link>

            <Link
              to="/personal"
              className="flex h-16 items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-5 backdrop-blur transition-transform active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Dumbbell className="h-5 w-5 text-[#a3e635]" aria-hidden />
              </span>
              <span className="flex-1 text-left">
                <span className="block font-display text-base font-semibold">Sou personal</span>
                <span className="block text-xs text-white/60">Painel de alunos e treinos</span>
              </span>
              <ChevronRight className="h-5 w-5 text-white/60" aria-hidden />
            </Link>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/40">
            <Link to="/privacidade" className="underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>
            <span>Versão {APP_VERSION}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
