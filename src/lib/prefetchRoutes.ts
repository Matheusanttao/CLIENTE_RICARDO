/**
 * Baixa o código das outras telas em segundo plano logo após entrar,
 * para a troca de tela ser instantânea (sem barrinha de carregamento).
 */
function whenIdle(fn: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(fn)
  else setTimeout(fn, 800)
}

export function prefetchStudentRoutes() {
  whenIdle(() => {
    void import('@/features/student/HomePage')
    void import('@/features/student/WorkoutsPage')
    void import('@/features/student/WorkoutDetailPage')
    void import('@/features/student/ActiveWorkoutPage')
    void import('@/features/student/PaymentsPage')
    void import('@/features/student/ProfilePage')
    void import('@/features/student/AssessmentsPage')
    void import('@/features/student/AnamnesisPage')
  })
}

export function prefetchPersonalRoutes() {
  whenIdle(() => {
    void import('@/features/personal/DashboardPage')
    void import('@/features/personal/StudentsPage')
    void import('@/features/personal/StudentDetailPage')
    void import('@/features/personal/ExercisesPage')
    void import('@/features/personal/WorkoutsPage')
    void import('@/features/personal/FinancePage')
    void import('@/features/personal/AssessmentsPage')
    void import('@/features/personal/SettingsPage')
  })
}
