/**
 * Error Handling System - LuvBee Core Platform
 * 
 * Sistema centralizado de tratamento de erros
 */

import { ERROR_MESSAGES } from '@/lib/constants'

// ============================================
// Error Types
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class NetworkError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NETWORK_ERROR) {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ServerError extends AppError {
  constructor(message: string = ERROR_MESSAGES.SERVER_ERROR) {
    super(message, 'SERVER_ERROR', 500)
    this.name = 'ServerError'
    Object.setPrototypeOf(this, ServerError.prototype)
  }
}

// ============================================
// Error Handler
// ============================================

export class ErrorHandler {
  /**
   * Converte erro do Supabase para AppError
   */
  static handleSupabaseError(error: unknown): AppError {
    if (error && typeof error === 'object' && 'message' in error) {
      const supabaseError = error as { message: string; code?: string; statusCode?: number }

      // Mapear códigos do Supabase para nossos erros
      if (supabaseError.statusCode === 401) {
        return new UnauthorizedError(supabaseError.message)
      }
      if (supabaseError.statusCode === 403) {
        return new ForbiddenError(supabaseError.message)
      }
      if (supabaseError.statusCode === 404) {
        return new NotFoundError(supabaseError.message)
      }
      if (supabaseError.statusCode && supabaseError.statusCode >= 500) {
        return new ServerError(supabaseError.message)
      }

      return new AppError(
        supabaseError.message,
        supabaseError.code,
        supabaseError.statusCode
      )
    }

    return new AppError(ERROR_MESSAGES.UNKNOWN_ERROR)
  }

  /**
   * Converte qualquer erro para AppError
   */
  static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(error.message)
    }

    if (typeof error === 'string') {
      return new AppError(error)
    }

    return new AppError(ERROR_MESSAGES.UNKNOWN_ERROR)
  }

  /**
   * Loga erro (em produção, enviaria para serviço de monitoramento)
   */
  static logError(error: AppError, context?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorHandler]', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        context,
        stack: error.stack,
      })
    }

    // Em produção, enviar para serviço de monitoramento (Sentry, etc.)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: context })
    // }
  }

  /**
   * Obtém mensagem amigável para o usuário
   */
  static getUserMessage(error: AppError): string {
    // Mensagens específicas por código
    if (error.code === 'VALIDATION_ERROR') {
      return ERROR_MESSAGES.VALIDATION_ERROR
    }
    if (error.code === 'NETWORK_ERROR') {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    if (error.code === 'UNAUTHORIZED') {
      return ERROR_MESSAGES.UNAUTHORIZED
    }
    if (error.code === 'FORBIDDEN') {
      return ERROR_MESSAGES.FORBIDDEN
    }
    if (error.code === 'NOT_FOUND') {
      return ERROR_MESSAGES.NOT_FOUND
    }
    if (error.code === 'SERVER_ERROR') {
      return ERROR_MESSAGES.SERVER_ERROR
    }

    // Mensagem padrão ou mensagem do erro
    return error.message || ERROR_MESSAGES.UNKNOWN_ERROR
  }
}

// ============================================
// Error Boundary (React)
// ============================================

export interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
}

// ============================================
// Helper Functions
// ============================================

/**
 * Wrapper para funções async que captura erros automaticamente
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (error) {
    const appError = ErrorHandler.normalizeError(error)
    ErrorHandler.logError(appError, context)
    return { data: null, error: appError }
  }
}

/**
 * Wrapper para funções sync que captura erros automaticamente
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: Record<string, unknown>
): { data: T | null; error: AppError | null } {
  try {
    const data = fn()
    return { data, error: null }
  } catch (error) {
    const appError = ErrorHandler.normalizeError(error)
    ErrorHandler.logError(appError, context)
    return { data: null, error: appError }
  }
}

