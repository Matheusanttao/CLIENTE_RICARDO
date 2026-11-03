/**
 * "Lembrar meu acesso": guarda só o USUÁRIO (nunca a senha) e mantém a pessoa logada.
 * Desligado: o login vale só enquanto o app/aba estiver aberto.
 * A senha pode ser salva com segurança pelo gerenciador de senhas do Android/navegador.
 */
const USER_KEY = (area: string) => `rn-remember-user:${area}`
const TEMP_KEY = 'rn-temp-session'
const ALIVE_KEY = 'rn-session-alive'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function getRememberedUser(area: string): string {
  return safe(() => localStorage.getItem(USER_KEY(area)) ?? '', '')
}

export function hasRememberChoice(area: string): boolean {
  return safe(() => localStorage.getItem(TEMP_KEY) !== '1' || localStorage.getItem(USER_KEY(area)) !== null, true)
}

/** Chamado após login com sucesso. */
export function saveRememberChoice(area: string, remember: boolean, identifier: string) {
  safe(() => {
    if (remember) {
      localStorage.setItem(USER_KEY(area), identifier.trim())
      localStorage.removeItem(TEMP_KEY)
    } else {
      localStorage.removeItem(USER_KEY(area))
      localStorage.setItem(TEMP_KEY, '1')
      sessionStorage.setItem(ALIVE_KEY, '1')
    }
  }, undefined)
}

/** Na abertura do app: se o login era temporário e o app foi fechado, encerra a sessão. */
export function temporarySessionExpired(): boolean {
  return safe(() => localStorage.getItem(TEMP_KEY) === '1' && sessionStorage.getItem(ALIVE_KEY) !== '1', false)
}

export function clearTemporaryFlag() {
  safe(() => localStorage.removeItem(TEMP_KEY), undefined)
}
