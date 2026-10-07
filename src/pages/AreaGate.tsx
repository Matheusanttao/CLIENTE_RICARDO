import { Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ConfigMissing } from '@/components/shared/ConfigMissing'
import { useAuth } from '@/features/auth/AuthProvider'

/** Entrada de área: login ou redireciona se já autenticado com vínculo. */
export function AreaGate({ area }: { area: 'aluno' | 'personal' }) {
  const auth = useAuth()

  if (!auth.configured) return <ConfigMissing />
  if (auth.loading) return <LoadingScreen />

  if (area === 'aluno') {
    if (auth.session && auth.isStudent) return <Navigate to="/aluno/inicio" replace />
    return <Navigate to="/aluno/entrar" replace />
  }

  if (auth.session && auth.isStaff) return <Navigate to="/personal/dashboard" replace />
  return <Navigate to="/personal/entrar" replace />
}
