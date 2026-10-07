import { ALLOWED_AUTH_RETURN_PREFIXES } from '@/lib/constants'

/**
 * Restringe redirects pós-login a caminhos internos permitidos.
 * Nunca retorna URLs externas ou protocol-relative (`//`).
 */
export function sanitizeReturnTo(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path?.trim()) return fallback

  let decoded = path.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return fallback
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
  if (decoded.includes('://') || decoded.includes('\\')) return fallback

  const allowed = ALLOWED_AUTH_RETURN_PREFIXES.some(
    (prefix) => decoded === prefix || decoded.startsWith(`${prefix}/`),
  )

  return allowed ? decoded : fallback
}

export function areaFromPath(pathname: string): 'aluno' | 'personal' {
  return pathname.startsWith('/personal') ? 'personal' : 'aluno'
}
