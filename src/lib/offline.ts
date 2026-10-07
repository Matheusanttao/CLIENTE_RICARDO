export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export const OFFLINE_SAVE_MESSAGE =
  'Sem conexão. Os registros ainda não foram salvos. Reconecte e tente novamente.'
