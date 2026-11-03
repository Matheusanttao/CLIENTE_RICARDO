/**
 * Login de aluno por usuário (sem e-mail). O Supabase Auth exige e-mail,
 * então o usuário vira um e-mail interno que nunca recebe mensagens.
 * Precisa bater com supabase/migrations/20261103000002_student_username_login.sql
 */
export const STUDENT_LOGIN_DOMAIN = 'aluno.personalricardoneves.com.br'

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,39}$/

export const USERNAME_HINT = 'De 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou _ (sem espaço e sem acento).'

/** O que a pessoa digitou no login → e-mail usado no Supabase. */
export function loginIdentifierToEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${STUDENT_LOGIN_DOMAIN}`
}

export function normalizeUsername(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 40)
}

/** "Matheus Antão Silva" → "matheus.silva" */
export function suggestUsername(fullName: string): string {
  const parts = normalizeUsername(fullName).split('.').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  return `${parts[0]}.${parts[parts.length - 1]}`
}

/** Senha fácil de digitar no celular (sem letras/números que confundem). */
export function generatePassword(length = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
