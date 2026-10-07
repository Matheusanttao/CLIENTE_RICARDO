export const BRAND = {
  name: 'Ricardo Neves Personal',
  shortName: 'RN Personal',
  monogram: 'RN',
  slogan: 'Seu treino. Sua evolução. Seu resultado.',
  orgSlug: 'ricardo-neves-personal',
  orgId: 'a0000000-0000-4000-8000-000000000001',
} as const

export const GOALS = [
  'Emagrecimento',
  'Hipertrofia',
  'Força',
  'Condicionamento',
  'Saúde',
  'Qualidade de vida',
  'Performance',
] as const

export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Peito' },
  { value: 'back', label: 'Costas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'quadriceps', label: 'Quadríceps' },
  { value: 'hamstrings', label: 'Posteriores' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'calves', label: 'Panturrilhas' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'other', label: 'Outro' },
] as const

export const WEEKDAYS = [
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
  { value: 'sun', label: 'Dom' },
] as const

export const ANAMNESIS_FORM_VERSION = '1.0'
export const CONSENT_PRIVACY_VERSION = '1.0'

export const ALLOWED_AUTH_RETURN_PREFIXES = ['/aluno', '/personal'] as const
