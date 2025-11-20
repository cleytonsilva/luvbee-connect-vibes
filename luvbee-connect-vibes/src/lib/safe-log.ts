/**
 * Helper para sanitizar logs e evitar exposição de informações sensíveis
 */

/**
 * Remove informações sensíveis de objetos antes de logar
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveKeys = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'authorization',
    'auth',
    'credentials',
    'session',
    'cookie',
  ]

  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    
    // Remover chaves sensíveis
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    // Sanitizar IDs de usuário (mostrar apenas últimos 4 caracteres)
    if (lowerKey.includes('user_id') || lowerKey === 'id') {
      const value = sanitized[key]
      if (typeof value === 'string' && value.length > 8) {
        sanitized[key] = `***${value.slice(-4)}`
      }
    }

    // Recursão para objetos aninhados
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Log seguro que sanitiza dados antes de exibir
 */
export function safeLog(level: 'log' | 'warn' | 'error' | 'info', message: string, data?: any) {
  const sanitizedData = data ? sanitizeLogData(data) : undefined
  
  switch (level) {
    case 'error':
      console.error(message, sanitizedData)
      break
    case 'warn':
      console.warn(message, sanitizedData)
      break
    case 'info':
      console.info(message, sanitizedData)
      break
    default:
      console.log(message, sanitizedData)
  }
}

