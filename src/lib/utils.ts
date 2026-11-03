import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return 'Aluno'
  return fullName.trim().split(/\s+/)[0] ?? 'Aluno'
}

export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** "2026-11-07" → Date local (evita mostrar um dia antes por causa do fuso UTC). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—'
  return parseDateOnly(value).toLocaleDateString('pt-BR')
}
