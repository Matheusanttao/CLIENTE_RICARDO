import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RequireAuth } from '@/features/auth/RequireAuth'
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
} from '@/features/auth/AuthForms'
import { ThemeProvider } from '@/lib/theme'
import { StudentLayout } from '@/layouts/StudentLayout'
import { PersonalLayout } from '@/layouts/PersonalLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { AreaGate } from '@/pages/AreaGate'

import { HomePage as StudentHomePage } from '@/features/student/HomePage'
import { WorkoutsPage as StudentWorkoutsPage } from '@/features/student/WorkoutsPage'
import { WorkoutDetailPage as StudentWorkoutDetailPage } from '@/features/student/WorkoutDetailPage'
import { ActiveWorkoutPage } from '@/features/student/ActiveWorkoutPage'
import { AnamnesisPage as StudentAnamnesisPage } from '@/features/student/AnamnesisPage'
import { AssessmentsPage as StudentAssessmentsPage } from '@/features/student/AssessmentsPage'
import { PaymentsPage as StudentPaymentsPage } from '@/features/student/PaymentsPage'
import { ProfilePage as StudentProfilePage } from '@/features/student/ProfilePage'
import { InvitePage } from '@/features/student/InvitePage'
import { AccessRequestPage } from '@/features/student/AccessRequestPage'

import { DashboardPage as PersonalDashboardPage } from '@/features/personal/DashboardPage'
import { StudentsPage as PersonalStudentsPage } from '@/features/personal/StudentsPage'
import { StudentDetailPage as PersonalStudentDetailPage } from '@/features/personal/StudentDetailPage'
import { AssessmentsPage as PersonalAssessmentsPage } from '@/features/personal/AssessmentsPage'
import { ExercisesPage as PersonalExercisesPage } from '@/features/personal/ExercisesPage'
import { WorkoutsPage as PersonalWorkoutsPage } from '@/features/personal/WorkoutsPage'
import { FinancePage as PersonalFinancePage } from '@/features/personal/FinancePage'
import { SettingsPage as PersonalSettingsPage } from '@/features/personal/SettingsPage'

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
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/aluno" element={<AreaGate area="aluno" />} />
              <Route path="/aluno/entrar" element={<LoginPage area="aluno" />} />
              <Route path="/aluno/recuperar-senha" element={<ForgotPasswordPage area="aluno" />} />
              <Route path="/aluno/redefinir-senha" element={<ResetPasswordPage area="aluno" />} />
              <Route path="/aluno/auth/callback" element={<AuthCallbackPage area="aluno" />} />
              <Route path="/aluno/convite" element={<InvitePage />} />
              <Route path="/aluno/solicitar-acesso" element={<AccessRequestPage />} />

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
              <Route path="/personal/recuperar-senha" element={<ForgotPasswordPage area="personal" />} />
              <Route path="/personal/redefinir-senha" element={<ResetPasswordPage area="personal" />} />
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
