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
