import { describe, expect, it } from 'vitest'
import { calcFatFreeMass, calcFatMass, calcIMC } from './assessment'
import { remainingSeconds, endsAtFromDuration } from './rest-timer'
import { sanitizeReturnTo } from './auth/redirect'
import { parseBRLToCents, formatBRL } from './money'

describe('calcIMC', () => {
  it('converte altura cm→m e calcula IMC', () => {
    const r = calcIMC(80, 180)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeCloseTo(24.69, 1)
  })
  it('rejeita dados ausentes', () => {
    expect(calcIMC(null, 180).ok).toBe(false)
  })
})

describe('composição corporal', () => {
  it('massa de gordura e livre de gordura', () => {
    const fat = calcFatMass(80, 20)
    expect(fat.ok).toBe(true)
    if (fat.ok) {
      expect(fat.value).toBe(16)
      const ffm = calcFatFreeMass(80, fat.value)
      expect(ffm.ok).toBe(true)
      if (ffm.ok) expect(ffm.value).toBe(64)
    }
  })
})

describe('rest timer', () => {
  it('usa deadline absoluto', () => {
    const ends = endsAtFromDuration(90, 1_000_000)
    expect(remainingSeconds(ends, 1_000_000)).toBe(90)
    expect(remainingSeconds(ends, 1_030_000)).toBe(60)
  })
})

describe('sanitizeReturnTo', () => {
  it('bloqueia URLs externas', () => {
    expect(sanitizeReturnTo('https://evil.com', '/aluno/inicio')).toBe('/aluno/inicio')
    expect(sanitizeReturnTo('//evil.com', '/aluno/inicio')).toBe('/aluno/inicio')
    expect(sanitizeReturnTo('/aluno/treinos', '/aluno/inicio')).toBe('/aluno/treinos')
    expect(sanitizeReturnTo('/admin', '/aluno/inicio')).toBe('/aluno/inicio')
  })
})

describe('money', () => {
  it('formata e parseia BRL', () => {
    expect(formatBRL(19990)).toContain('199')
    expect(parseBRLToCents('199,90')).toBe(19990)
  })
})
