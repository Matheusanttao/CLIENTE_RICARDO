import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ThemeProvider } from '@/lib/theme'
import { LandingPage } from '@/pages/landing/LandingPage'
import { AreaGate } from '@/pages/AreaGate'
import { AppEntryPage } from '@/pages/AppEntryPage'
import { isNativeApp } from '@/lib/native/isNativeApp'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'

/** Carrega uma página sob demanda — o site público não baixa o código das áreas logadas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesma restrição de React.lazy
function lazyPage<M extends Record<K, ComponentType<any>>, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await load())[name] }))
}

const LoginPage = lazyPage(() => import('@/features/auth/AuthForms'), 'LoginPage')
const AuthCallbackPage = lazyPage(() => import('@/features/auth/AuthForms'), 'AuthCallbackPage')

const StudentLayout = lazyPage(() => import('@/layouts/StudentLayout'), 'StudentLayout')
const StudentHomePage = lazyPage(() => import('@/features/student/HomePage'), 'HomePage')
const StudentWorkoutsPage = lazyPage(() => import('@/features/student/WorkoutsPage'), 'WorkoutsPage')
const StudentWorkoutDetailPage = lazyPage(() => import('@/features/student/WorkoutDetailPage'), 'WorkoutDetailPage')
const ActiveWorkoutPage = lazyPage(() => import('@/features/student/ActiveWorkoutPage'), 'ActiveWorkoutPage')
const StudentAnamnesisPage = lazyPage(() => import('@/features/student/AnamnesisPage'), 'AnamnesisPage')
const StudentAssessmentsPage = lazyPage(() => import('@/features/student/AssessmentsPage'), 'AssessmentsPage')
const StudentPaymentsPage = lazyPage(() => import('@/features/student/PaymentsPage'), 'PaymentsPage')
const StudentProfilePage = lazyPage(() => import('@/features/student/ProfilePage'), 'ProfilePage')

const PersonalLayout = lazyPage(() => import('@/layouts/PersonalLayout'), 'PersonalLayout')
const PersonalDashboardPage = lazyPage(() => import('@/features/personal/DashboardPage'), 'DashboardPage')
const PersonalStudentsPage = lazyPage(() => import('@/features/personal/StudentsPage'), 'StudentsPage')
const PersonalStudentDetailPage = lazyPage(() => import('@/features/personal/StudentDetailPage'), 'StudentDetailPage')
const PersonalAssessmentsPage = lazyPage(() => import('@/features/personal/AssessmentsPage'), 'AssessmentsPage')
const PersonalExercisesPage = lazyPage(() => import('@/features/personal/ExercisesPage'), 'ExercisesPage')
const PersonalWorkoutsPage = lazyPage(() => import('@/features/personal/WorkoutsPage'), 'WorkoutsPage')
const PersonalFinancePage = lazyPage(() => import('@/features/personal/FinancePage'), 'FinancePage')
const PersonalSettingsPage = lazyPage(() => import('@/features/personal/SettingsPage'), 'SettingsPage')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={isNativeApp() ? <AppEntryPage /> : <LandingPage />} />

                <Route path="/aluno" element={<AreaGate area="aluno" />} />
                <Route path="/aluno/entrar" element={<LoginPage area="aluno" />} />
                <Route path="/aluno/auth/callback" element={<AuthCallbackPage area="aluno" />} />

                <Route
                  path="/aluno"
                  element={
                    <RequireAuth area="aluno">
                      <StudentLayout />
                    </RequireAuth>
                  }
                >
                  <Route path="inicio" element={<StudentHomePage />} />
                  <Route path="treinos" element={<StudentWorkoutsPage />} />
                  <Route path="treinos/:id" element={<StudentWorkoutDetailPage />} />
                  <Route path="treino-em-andamento/:id" element={<ActiveWorkoutPage />} />
                  <Route path="anamnese" element={<StudentAnamnesisPage />} />
                  <Route path="avaliacoes" element={<StudentAssessmentsPage />} />
                  <Route path="pagamentos" element={<StudentPaymentsPage />} />
                  <Route path="perfil" element={<StudentProfilePage />} />
                </Route>

                <Route path="/personal" element={<AreaGate area="personal" />} />
                <Route path="/personal/entrar" element={<LoginPage area="personal" />} />
                <Route path="/personal/auth/callback" element={<AuthCallbackPage area="personal" />} />

                <Route
                  path="/personal"
                  element={
                    <RequireAuth area="personal">
                      <PersonalLayout />
                    </RequireAuth>
                  }
                >
                  <Route path="dashboard" element={<PersonalDashboardPage />} />
                  <Route path="alunos" element={<PersonalStudentsPage />} />
                  <Route path="alunos/:id" element={<PersonalStudentDetailPage />} />
                  <Route path="avaliacoes" element={<PersonalAssessmentsPage />} />
                  <Route path="exercicios" element={<PersonalExercisesPage />} />
                  <Route path="treinos" element={<PersonalWorkoutsPage />} />
                  <Route path="financeiro" element={<PersonalFinancePage />} />
                  <Route path="configuracoes" element={<PersonalSettingsPage />} />
                </Route>

                <Route path="/privacidade" element={<PrivacyPage />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
