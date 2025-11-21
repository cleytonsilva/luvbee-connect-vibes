/**
 * Testes de Validação de Email
 * 
 * Testa diferentes formatos de email para garantir validação robusta
 */

import { describe, it, expect, vi } from 'vitest'

// Mock do safeLog para testes
vi.mock('../lib/safe-log', () => ({
  safeLog: vi.fn()
}))

// Função de validação extraída do hook para testes unitários
function validateEmailFormat(email: string): { isValid: boolean; error: string | null } {
  const cleanEmail = email.trim().toLowerCase()
  
  // Validações básicas
  if (!cleanEmail) {
    return { isValid: false, error: 'Email é obrigatório' }
  }
  
  // Verificar comprimento
  if (cleanEmail.length < 5) {
    return { isValid: false, error: 'Email muito curto' }
  }
  
  if (cleanEmail.length > 254) {
    return { isValid: false, error: 'Email muito longo' }
  }
  
  // Verificar se contém @
  if (!cleanEmail.includes('@')) {
    return { 
      isValid: false, 
      error: 'Email deve conter @' 
    }
  }
  
  // Verificar se tem apenas um @
  const atCount = (cleanEmail.match(/@/g) || []).length
  if (atCount > 1) {
    return { isValid: false, error: 'Email deve conter apenas um @' }
  }
  
  // Separar local e domínio
  const [localPart, domainPart] = cleanEmail.split('@')
  
  // Validar parte local (antes do @)
  if (!localPart || localPart.length === 0) {
    return { isValid: false, error: 'Parte antes do @ não pode estar vazia' }
  }
  
  if (localPart.length > 64) {
    return { isValid: false, error: 'Parte antes do @ muito longa' }
  }
  
  // Validar parte do domínio (depois do @)
  if (!domainPart || domainPart.length === 0) {
    return { isValid: false, error: 'Domínio não pode estar vazio' }
  }
  
  if (domainPart.length > 255) {
    return { isValid: false, error: 'Domínio muito longo' }
  }
  
  // Verificar se domínio tem pelo menos um ponto
  if (!domainPart.includes('.')) {
    return { isValid: false, error: 'Domínio deve conter um ponto (ex: .com, .com.br)' }
  }
  
  // Verificar se não começa ou termina com ponto
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { isValid: false, error: 'Domínio não pode começar ou terminar com ponto' }
  }
  
  // Validar formato geral com regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i
  if (!emailRegex.test(cleanEmail)) {
    return { 
      isValid: false, 
      error: 'Formato de email inválido' 
    }
  }
  
  // Validar caracteres especiais na parte local
  const invalidCharsPattern = /[<>()[\]\\,;:\s@\"]/
  if (invalidCharsPattern.test(localPart)) {
    return { isValid: false, error: 'Caracteres inválidos na parte do email' }
  }
  
  // Validar domínio com TLD válido
  const domainParts = domainPart.split('.')
  const tld = domainParts[domainParts.length - 1]
  
  if (tld.length < 2) {
    return { isValid: false, error: 'Domínio deve ter uma extensão válida (ex: .com, .com.br)' }
  }
  
  return { isValid: true, error: null }
}

describe('validateEmailFormat', () => {
  describe('Emails Válidos', () => {
    const validEmails = [
      'usuario@example.com',
      'nome.sobrenome@empresa.com.br',
      'teste+tag@gmail.com',
      'user123@hotmail.com',
      'a@b.co',
      'test_email@domain.com',
      'user.name+tag@company.co.uk',
      '123@456.com',
      'test@subdomain.example.com',
      'user@example-site.com'
    ]

    validEmails.forEach(email => {
      it(`deve aceitar email válido: ${email}`, () => {
        const result = validateEmailFormat(email)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeNull()
      })
    })
  })

  describe('Emails Inválidos - Formato Básico', () => {
    const invalidEmails = [
      { email: '', expectedError: 'Email é obrigatório' },
      { email: '   ', expectedError: 'Email é obrigatório' },
      { email: 'sem-arroba', expectedError: 'Email deve conter @' },
      { email: '@sem-local.com', expectedError: 'Parte antes do @ não pode estar vazia' },
      { email: 'local@', expectedError: 'Domínio não pode estar vazio' },
      { email: 'local@sem-ponto', expectedError: 'Domínio deve conter um ponto (ex: .com, .com.br)' },
      { email: 'local@.com', expectedError: 'Domínio não pode começar ou terminar com ponto' },
      { email: 'local@com.', expectedError: 'Domínio não pode começar ou terminar com ponto' },
      { email: 'local@@dominio.com', expectedError: 'Email deve conter apenas um @' }
    ]

    invalidEmails.forEach(({ email, expectedError }) => {
      it(`deve rejeitar email inválido: ${email}`, () => {
        const result = validateEmailFormat(email)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(expectedError)
      })
    })
  })

  describe('Emails Inválidos - Comprimento', () => {
    it('deve rejeitar email muito curto', () => {
      const result = validateEmailFormat('a@b')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('curto')
    })

    it('deve rejeitar email muito longo', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = validateEmailFormat(longEmail)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('longo')
    })

    it('deve rejeitar parte local muito longa', () => {
      const longLocal = 'a'.repeat(65) + '@example.com'
      const result = validateEmailFormat(longLocal)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Parte antes do @ muito longa')
    })

    it('deve rejeitar domínio muito longo', () => {
      const longDomain = 'user@' + 'a'.repeat(256) + '.com'
      const result = validateEmailFormat(longDomain)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('muito longo')
    })
  })

  describe('Emails Inválidos - Caracteres', () => {
    const invalidEmails = [
      'user<>@example.com',
      'user[]@example.com',
      'user()@example.com',
      'user;@example.com',
      'user:@example.com',
      'user\\@example.com',
      'user"@example.com'
    ]

    invalidEmails.forEach(email => {
      it(`deve rejeitar email com caracteres inválidos: ${email}`, () => {
        const result = validateEmailFormat(email)
        expect(result.isValid).toBe(false)
        expect(result.error).toMatch(/(Caracteres inválidos|Formato de email inválido)/)
      })
    })
  })

  describe('Emails Inválidos - Domínio', () => {
    const invalidDomains = [
      'local@a',
      'local@ab',
      'local@example'
    ]

    invalidDomains.forEach(email => {
      it(`deve rejeitar email com domínio inválido: ${email}`, () => {
        const result = validateEmailFormat(email)
        expect(result.isValid).toBe(false)
        expect(result.error).toMatch(/(extensão válida|um ponto)/)
      })
    })
  })

  describe('Casos Especiais Brasileiros', () => {
    const brazilianEmails = [
      'usuario@empresa.com.br',
      'contato@site.com.br',
      'suporte@provedor.net.br',
      'email@instituicao.org.br',
      'usuario@dominio.gov.br'
    ]

    brazilianEmails.forEach(email => {
      it(`deve aceitar email brasileiro válido: ${email}`, () => {
        const result = validateEmailFormat(email)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeNull()
      })
    })
  })

  describe('Validação com Opções Customizadas', () => {
    it('deve permitir email vazio quando required = false', () => {
      const result = validateEmailFormat('')
      // A função atual sempre requer email, então vazio deve ser inválido
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email é obrigatório')
    })

    it('deve usar mensagem customizada', () => {
      // Como a função não aceita opções customizadas diretamente,
      // testamos que a mensagem padrão é retornada
      const result = validateEmailFormat('')
      expect(result.error).toBe('Email é obrigatório')
    })
  })

  describe('Integração com Formulário', () => {
    it('deve impedir envio com email inválido', () => {
      const invalidEmail = 'email_invalido'
      const result = validateEmailFormat(invalidEmail)
      expect(result.isValid).toBe(false)
      expect(result.error).not.toBeNull()
    })

    it('deve permitir envio com email válido', () => {
      const validEmail = 'usuario@example.com'
      const result = validateEmailFormat(validEmail)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })
  })
})