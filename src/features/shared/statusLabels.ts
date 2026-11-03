import type {
  AnamnesisStatus,
  ChargeStatus,
  MemberRole,
  PlanInterval,
  ProgramStatus,
  StudentStatus,
  TrainingLogStatus,
} from '@/types/database'

type Tone = 'success' | 'warning' | 'danger' | 'secondary' | 'default'

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}
export const CHARGE_STATUS_TONE: Record<ChargeStatus, Tone> = {
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
}

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}
export const PROGRAM_STATUS_TONE: Record<ProgramStatus, Tone> = {
  draft: 'warning',
  published: 'success',
  archived: 'secondary',
}

export const ANAMNESIS_STATUS_LABEL: Record<AnamnesisStatus, string> = {
  draft: 'Rascunho',
  submitted: 'Enviada',
  under_review: 'Em revisão',
  reviewed: 'Revisada',
}
export const ANAMNESIS_STATUS_TONE: Record<AnamnesisStatus, Tone> = {
  draft: 'secondary',
  submitted: 'warning',
  under_review: 'warning',
  reviewed: 'success',
}

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  archived: 'Arquivado',
}
export const STUDENT_STATUS_TONE: Record<StudentStatus, Tone> = {
  active: 'success',
  pending: 'warning',
  archived: 'secondary',
}

export const PLAN_INTERVAL_LABEL: Record<PlanInterval, string> = {
  weekly: 'semanal',
  monthly: 'mensal',
  quarterly: 'trimestral',
  yearly: 'anual',
  custom: 'personalizado',
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Administrador',
  admin: 'Administrador',
  coach: 'Personal',
  student: 'Aluno',
}

export const TRAINING_LOG_STATUS_LABEL: Record<TrainingLogStatus, string> = {
  in_progress: 'Em andamento',
  completed: 'Concluído',
  partial: 'Parcial',
}
