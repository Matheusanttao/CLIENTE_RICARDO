export type AssessmentCalcError = { ok: false; error: string }
export type AssessmentCalcOk<T> = { ok: true; value: T }

export function calcIMC(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): AssessmentCalcOk<number> | AssessmentCalcError {
  if (weightKg == null || heightCm == null) {
    return { ok: false, error: 'Peso e altura são necessários para calcular o IMC.' }
  }
  if (!(weightKg > 0) || !(heightCm > 0)) {
    return { ok: false, error: 'Peso e altura devem ser maiores que zero.' }
  }
  const heightM = heightCm / 100
  const imc = weightKg / (heightM * heightM)
  if (!Number.isFinite(imc)) {
    return { ok: false, error: 'Não foi possível calcular o IMC com os valores informados.' }
  }
  return { ok: true, value: Math.round(imc * 100) / 100 }
}

export function calcFatMass(
  weightKg: number | null | undefined,
  bodyFatPercent: number | null | undefined,
): AssessmentCalcOk<number> | AssessmentCalcError {
  if (weightKg == null || bodyFatPercent == null) {
    return { ok: false, error: 'Peso e percentual de gordura são necessários.' }
  }
  if (!(weightKg > 0) || bodyFatPercent < 0 || bodyFatPercent > 100) {
    return { ok: false, error: 'Valores inválidos para massa de gordura.' }
  }
  const fatMass = (weightKg * bodyFatPercent) / 100
  return { ok: true, value: Math.round(fatMass * 100) / 100 }
}

export function calcFatFreeMass(
  weightKg: number | null | undefined,
  fatMassKg: number | null | undefined,
): AssessmentCalcOk<number> | AssessmentCalcError {
  if (weightKg == null || fatMassKg == null) {
    return { ok: false, error: 'Peso e massa de gordura são necessários.' }
  }
  if (!(weightKg > 0) || fatMassKg < 0 || fatMassKg > weightKg) {
    return { ok: false, error: 'Valores inválidos para massa livre de gordura.' }
  }
  const ffm = weightKg - fatMassKg
  return { ok: true, value: Math.round(ffm * 100) / 100 }
}

export const JP7_PROTOCOL_CODE = 'jp7_siri'
export const JP7_PROTOCOL_LABEL = 'Jackson & Pollock 7 dobras + Siri'

export const JP7_SKINFOLDS = [
  { key: 'peitoral', label: 'Peitoral' },
  { key: 'axilar_media', label: 'Axilar média' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'subescapular', label: 'Subescapular' },
  { key: 'abdominal', label: 'Abdominal' },
  { key: 'supra_iliaca', label: 'Supra-ilíaca' },
  { key: 'coxa', label: 'Coxa' },
] as const

export type Jp7SkinfoldKey = (typeof JP7_SKINFOLDS)[number]['key']
export type Jp7Skinfolds = Record<Jp7SkinfoldKey, number>
export type BiologicalSex = 'male' | 'female'

export function sumSkinfolds7(
  folds: Partial<Record<Jp7SkinfoldKey, number | null | undefined>>,
): AssessmentCalcOk<number> | AssessmentCalcError {
  let sum = 0
  for (const { key, label } of JP7_SKINFOLDS) {
    const v = folds[key]
    if (v == null || Number.isNaN(v)) {
      return { ok: false, error: `Informe a dobra ${label}.` }
    }
    if (!(v > 0)) {
      return { ok: false, error: `A dobra ${label} deve ser maior que zero.` }
    }
    sum += v
  }
  return { ok: true, value: Math.round(sum * 100) / 100 }
}

export function calcBodyDensityJP7(
  s7: number,
  ageYears: number | null | undefined,
  sex: BiologicalSex | null | undefined,
): AssessmentCalcOk<number> | AssessmentCalcError {
  if (sex !== 'male' && sex !== 'female') {
    return { ok: false, error: 'Selecione o sexo (masculino ou feminino) para o protocolo.' }
  }
  if (ageYears == null || !(ageYears > 0)) {
    return { ok: false, error: 'Informe a idade para o protocolo.' }
  }
  if (!(s7 > 0)) {
    return { ok: false, error: 'Soma das dobras inválida.' }
  }
  const dc =
    sex === 'male'
      ? 1.112 - 0.00043499 * s7 + 0.00000055 * s7 * s7 - 0.00028826 * ageYears
      : 1.097 - 0.00046971 * s7 + 0.00000056 * s7 * s7 - 0.00012828 * ageYears
  if (!Number.isFinite(dc) || dc <= 0) {
    return { ok: false, error: 'Não foi possível calcular a densidade corporal.' }
  }
  return { ok: true, value: Math.round(dc * 100000) / 100000 }
}

export function calcSiriBodyFat(density: number): AssessmentCalcOk<number> | AssessmentCalcError {
  if (!(density > 0)) {
    return { ok: false, error: 'Densidade corporal inválida.' }
  }
  const bf = 495 / density - 450
  if (!Number.isFinite(bf) || bf < 0 || bf > 100) {
    return { ok: false, error: 'Percentual de gordura fora do intervalo válido. Confira as dobras.' }
  }
  return { ok: true, value: Math.round(bf * 100) / 100 }
}

export type Jp7Result = {
  s7: number
  density: number
  bodyFatPercent: number
  fatMassKg: number
  fatFreeMassKg: number
}

export function calcJP7Assessment(input: {
  weightKg: number | null | undefined
  ageYears: number | null | undefined
  sex: BiologicalSex | null | undefined
  skinfolds: Partial<Record<Jp7SkinfoldKey, number | null | undefined>>
}): AssessmentCalcOk<Jp7Result> | AssessmentCalcError {
  const s7 = sumSkinfolds7(input.skinfolds)
  if (!s7.ok) return s7
  const dc = calcBodyDensityJP7(s7.value, input.ageYears, input.sex)
  if (!dc.ok) return dc
  const bf = calcSiriBodyFat(dc.value)
  if (!bf.ok) return bf
  const fat = calcFatMass(input.weightKg, bf.value)
  if (!fat.ok) return fat
  const ffm = calcFatFreeMass(input.weightKg, fat.value)
  if (!ffm.ok) return ffm
  return {
    ok: true,
    value: {
      s7: s7.value,
      density: dc.value,
      bodyFatPercent: bf.value,
      fatMassKg: fat.value,
      fatFreeMassKg: ffm.value,
    },
  }
}

export function calcAgeYears(birthDate: string | null | undefined, at: Date = new Date()): number | null {
  if (!birthDate) return null
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  let age = at.getFullYear() - y
  const monthDiff = at.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < d)) age--
  return age >= 0 ? age : null
}
