import { describe, expect, it } from 'vitest'
import {
  calcAgeYears,
  calcBodyDensityJP7,
  calcFatFreeMass,
  calcFatMass,
  calcIMC,
  calcJP7Assessment,
  calcSiriBodyFat,
  sumSkinfolds7,
} from './assessment'
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

describe('Jackson & Pollock 7 dobras + Siri', () => {
  const folds = {
    peitoral: 10,
    axilar_media: 12,
    triceps: 14,
    subescapular: 16,
    abdominal: 20,
    supra_iliaca: 15,
    coxa: 13,
  }

  it('soma as sete dobras', () => {
    const r = sumSkinfolds7(folds)
    expect(r.ok && r.value).toBe(100)
  })

  it('exige todas as dobras', () => {
    expect(sumSkinfolds7({ ...folds, coxa: undefined }).ok).toBe(false)
  })

  it('densidade masculina e feminina', () => {
    const m = calcBodyDensityJP7(100, 30, 'male')
    const f = calcBodyDensityJP7(100, 30, 'female')
    expect(m.ok && m.value).toBeCloseTo(1.06535, 5)
    expect(f.ok && f.value).toBeCloseTo(1.05178, 5)
  })

  it('exige sexo e idade', () => {
    expect(calcBodyDensityJP7(100, 30, null).ok).toBe(false)
    expect(calcBodyDensityJP7(100, null, 'male').ok).toBe(false)
  })

  it('Siri', () => {
    const r = calcSiriBodyFat(1.06535)
    expect(r.ok && r.value).toBeCloseTo(14.64, 1)
  })

  it('composição completa', () => {
    const r = calcJP7Assessment({ weightKg: 80, ageYears: 30, sex: 'male', skinfolds: folds })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.s7).toBe(100)
      expect(r.value.bodyFatPercent).toBeCloseTo(14.64, 1)
      expect(r.value.fatMassKg).toBeCloseTo(11.71, 1)
      expect(r.value.fatMassKg + r.value.fatFreeMassKg).toBeCloseTo(80, 5)
    }
  })

  it('idade a partir da data de nascimento', () => {
    expect(calcAgeYears('1990-06-15', new Date(2026, 5, 14))).toBe(35)
    expect(calcAgeYears('1990-06-15', new Date(2026, 5, 15))).toBe(36)
    expect(calcAgeYears(null)).toBeNull()
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
