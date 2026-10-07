import type { AnamnesisStatus, ChargeStatus, ProgramStatus, TrainingLogStatus } from '@/types/database'

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}

export const ANAMNESIS_STATUS_LABEL: Record<AnamnesisStatus, string> = {
  draft: 'Rascunho',
  submitted: 'Enviada',
  under_review: 'Em revisão',
  reviewed: 'Revisada',
}

export const TRAINING_LOG_STATUS_LABEL: Record<TrainingLogStatus, string> = {
  in_progress: 'Em andamento',
  completed: 'Concluído',
  partial: 'Parcial',
}
