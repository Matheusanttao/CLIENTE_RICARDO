import { Link, Navigate } from 'react-router-dom'
import { GraduationCap, Dumbbell } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND } from '@/lib/constants'

/**
 * Tela inicial do app (APK). Substitui o site institucional:
 * se já houver sessão vai direto para a área certa; senão pergunta quem é.
 */
export function AppEntryPage() {
  const auth = useAuth()

  if (auth.configured && auth.loading) return <LoadingScreen />
  if (auth.session && auth.isStaff) return <Navigate to="/personal/dashboard" replace />
  if (auth.session && auth.isStudent) return <Navigate to="/aluno/inicio" replace />

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark className="justify-center" size="lg" />
        <p className="text-sm text-muted-foreground">{BRAND.slogan}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button asChild size="lg">
          <Link to="/aluno">
            <GraduationCap className="h-5 w-5" aria-hidden />
            Sou aluno
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/personal">
            <Dumbbell className="h-5 w-5" aria-hidden />
            Sou personal
          </Link>
        </Button>
      </div>
    </main>
  )
}
