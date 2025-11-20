import { useState, useCallback, useMemo } from 'react'
import { safeLog } from '@/lib/safe-log'

export interface EmailValidationResult {
  isValid: boolean
  error: string | null
  isValidating: boolean
}

export interface EmailValidationOptions {
  required?: boolean
  customMessage?: string
  onValidation?: (result: EmailValidationResult) => void
}

/**
 * Hook customizado para validação de email com feedback visual
 * 
 * Regras de validação:
 * 1. Deve conter @ obrigatório
 * 2. Deve ter domínio válido (.com, .com.br, etc)
 * 3. Caracteres permitidos antes e depois do @
 * 4. Comprimento mínimo e máximo adequados
 */
export function useEmailValidation(options: EmailValidationOptions = {}) {
  const { required = true, customMessage, onValidation } = options
  const [validation, setValidation] = useState<EmailValidationResult>({
    isValid: false,
    error: null,
    isValidating: false
  })

  const emailRegex = useMemo(() => 
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i, 
    []
  )

  const validateEmail = useCallback(async (email: string): Promise<EmailValidationResult> => {
    // Limpar espaços e converter para minúsculo
    const cleanEmail = email.trim().toLowerCase()

    // Validações básicas
    if (required && !cleanEmail) {
      const result: EmailValidationResult = {
        isValid: false,
        error: customMessage || 'Email é obrigatório',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    if (!required && !cleanEmail) {
      const result: EmailValidationResult = {
        isValid: true,
        error: null,
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Verificar comprimento
    if (cleanEmail.length < 5) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Email muito curto',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    if (cleanEmail.length > 254) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Email muito longo',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Verificar se contém @
    if (!cleanEmail.includes('@')) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Email deve conter @',
        isValidating: false
      }
      setValidation(result)
      
      // Log do erro para debugging
      safeLog('error', '[AuthService] signUp error', {
        message: `Email address "${cleanEmail}" is invalid`,
        status: 400,
        code: 'email_address_invalid',
        translated: result.error
      })
      
      onValidation?.(result)
      return result
    }

    // Verificar se tem apenas um @
    const atCount = (cleanEmail.match(/@/g) || []).length
    if (atCount > 1) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Email deve conter apenas um @',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Separar local e domínio
    const [localPart, domainPart] = cleanEmail.split('@')

    // Validar parte local (antes do @)
    if (!localPart || localPart.length === 0) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Parte antes do @ não pode estar vazia',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    if (localPart.length > 64) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Parte antes do @ muito longa',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Validar parte do domínio (depois do @)
    if (!domainPart || domainPart.length === 0) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Domínio não pode estar vazio',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    if (domainPart.length > 255) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Domínio muito longo',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Verificar se domínio tem pelo menos um ponto
    if (!domainPart.includes('.')) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Domínio deve conter um ponto (ex: .com, .com.br)',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Verificar se não começa ou termina com ponto
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Domínio não pode começar ou terminar com ponto',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Validar formato geral com regex
    if (!emailRegex.test(cleanEmail)) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Formato de email inválido',
        isValidating: false
      }
      setValidation(result)
      
      // Log do erro para debugging
      safeLog('error', '[AuthService] signUp error', {
        message: `Email address "${cleanEmail}" is invalid`,
        status: 400,
        code: 'email_address_invalid',
        translated: result.error
      })
      
      onValidation?.(result)
      return result
    }

    // Validar caracteres especiais na parte local
    const invalidCharsPattern = /[<>()[\]\\,;:\s@\"]/
    if (invalidCharsPattern.test(localPart)) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Caracteres inválidos na parte do email',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Validar domínio com TLD válido
    const domainParts = domainPart.split('.')
    const tld = domainParts[domainParts.length - 1]
    
    if (tld.length < 2) {
      const result: EmailValidationResult = {
        isValid: false,
        error: 'Domínio deve ter uma extensão válida (ex: .com, .com.br)',
        isValidating: false
      }
      setValidation(result)
      onValidation?.(result)
      return result
    }

    // Email válido
    const result: EmailValidationResult = {
      isValid: true,
      error: null,
      isValidating: false
    }
    setValidation(result)
    onValidation?.(result)
    return result
  }, [emailRegex, required, customMessage, onValidation])

  const resetValidation = useCallback(() => {
    setValidation({
      isValid: false,
      error: null,
      isValidating: false
    })
  }, [])

  return {
    validation,
    validateEmail,
    resetValidation,
    isValid: validation.isValid,
    error: validation.error
  }
}