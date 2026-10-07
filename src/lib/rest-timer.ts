/** Rest timer baseado em horário final — correto após trocar de app. */
export function remainingSeconds(endsAtIso: string | null | undefined, nowMs = Date.now()) {
  if (!endsAtIso) return 0
  const ends = new Date(endsAtIso).getTime()
  if (!Number.isFinite(ends)) return 0
  return Math.max(0, Math.ceil((ends - nowMs) / 1000))
}

export function endsAtFromDuration(seconds: number, nowMs = Date.now()) {
  return new Date(nowMs + seconds * 1000).toISOString()
}

export function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
