/** Marca adicionada ao user agent pelo app Android (capacitor.config.ts → appendUserAgent). */
export const NATIVE_APP_UA_MARK = 'RNPersonalApp'

/** True quando o site está rodando dentro do app instalado (APK), não no navegador. */
export function isNativeApp(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes(NATIVE_APP_UA_MARK)
}
