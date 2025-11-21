/**
 * Utility for logging email validation errors in the specific format requested
 */

import { safeLog } from './safe-log'

export interface EmailValidationError {
  email: string
  error: string
  code: string
}

/**
 * Log email validation errors in the specific format requested by the user
 * Format: [AuthService] signUp error {message: Email address "email@example.com" is invalid, status: 400, code: email_address_invalid, translated: Dados inválidos. Verifique suas informações e tente novamente.}
 */
export function logEmailValidationError(error: EmailValidationError): void {
  const translatedMessage = getTranslatedErrorMessage(error.code)
  
  safeLog('error', '[AuthService] signUp error', {
    message: `Email address "${error.email}" is invalid`,
    status: 400,
    code: error.code,
    translated: translatedMessage
  })
}

/**
 * Get translated error message based on error code
 */
function getTranslatedErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    'email_address_invalid': 'Dados inválidos. Verifique suas informações e tente novamente.',
    'email_missing_at': 'Email deve conter @',
    'email_multiple_at': 'Email deve conter apenas um @',
    'email_domain_invalid': 'Domínio deve conter um ponto (ex: .com, .com.br)',
    'email_domain_dots': 'Domínio não pode começar ou terminar com ponto',
    'email_format_invalid': 'Formato de email inválido',
    'email_chars_invalid': 'Caracteres inválidos na parte do email',
    'email_tld_invalid': 'Domínio deve ter uma extensão válida (ex: .com, .com.br)',
    'email_too_short': 'Email muito curto',
    'email_too_long': 'Email muito longo',
    'email_local_too_long': 'Parte antes do @ muito longa',
    'email_domain_too_long': 'Domínio muito longo',
    'email_local_empty': 'Parte antes do @ não pode estar vazia',
    'email_domain_empty': 'Domínio não pode estar vazio'
  }
  
  return errorMessages[code] || 'Dados inválidos. Verifique suas informações e tente novamente.'
}

/**
 * Extract error code from validation error message
 */
export function getErrorCode(errorMessage: string): string {
  if (errorMessage.includes('@')) {
    if (errorMessage.includes('deve conter @')) return 'email_missing_at'
    if (errorMessage.includes('apenas um @')) return 'email_multiple_at'
  }
  
  if (errorMessage.includes('domínio') || errorMessage.includes('Domínio')) {
    if (errorMessage.includes('ponto')) return 'email_domain_invalid'
    if (errorMessage.includes('começar ou terminar')) return 'email_domain_dots'
    if (errorMessage.includes('extensão válida')) return 'email_tld_invalid'
    if (errorMessage.includes('muito longo')) return 'email_domain_too_long'
    if (errorMessage.includes('vazio')) return 'email_domain_empty'
  }
  
  if (errorMessage.includes('formato')) return 'email_format_invalid'
  if (errorMessage.includes('Caracteres inválidos')) return 'email_chars_invalid'
  if (errorMessage.includes('muito curto')) return 'email_too_short'
  if (errorMessage.includes('muito longo')) return 'email_too_long'
  if (errorMessage.includes('antes do @')) return 'email_local_too_long'
  
  return 'email_address_invalid'
}