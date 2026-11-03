import { describe, expect, it } from 'vitest'
import { generatePassword, loginIdentifierToEmail, normalizeUsername, suggestUsername, USERNAME_PATTERN } from './username'

describe('login por usuário', () => {
  it('converte usuário em e-mail interno e mantém e-mail', () => {
    expect(loginIdentifierToEmail(' Matheus.Antao ')).toBe('matheus.antao@aluno.personalricardoneves.com.br')
    expect(loginIdentifierToEmail('personalricardoneves@gmail.com')).toBe('personalricardoneves@gmail.com')
  })

  it('sugere usuário sem acento a partir do nome', () => {
    expect(suggestUsername('Matheus Antão')).toBe('matheus.antao')
    expect(suggestUsername('Maria da Conceição Silva')).toBe('maria.silva')
    expect(normalizeUsername('João Ç!')).toBe('joao.c')
  })

  it('gera senha válida', () => {
    const p = generatePassword()
    expect(p).toHaveLength(8)
    expect(USERNAME_PATTERN.test('matheus.antao')).toBe(true)
    expect(USERNAME_PATTERN.test('ab')).toBe(false)
  })
})
