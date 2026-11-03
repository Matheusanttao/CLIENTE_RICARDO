function trim(value: string | undefined) {
  return value?.trim() || ''
}

export const env = {
  appUrl: trim(import.meta.env.VITE_APP_URL) || (typeof window !== 'undefined' ? window.location.origin : ''),
  supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey:
    trim(import.meta.env.VITE_SUPABASE_ANON_KEY) || trim(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

export function getAppUrl() {
  if (env.appUrl) return env.appUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
