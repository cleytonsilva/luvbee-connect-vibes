import { PostgrestError } from '@supabase/supabase-js';
import { safeLog } from '@/lib/safe-log';

export interface SupabaseErrorDetails {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  statusCode?: number;
  query?: string;
  parameters?: any[];
  table?: string;
  column?: string;
}

export class SupabaseErrorHandler {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 segundo

  /**
   * Trata erros do Supabase de forma centralizada
   */
  static handleError(error: PostgrestError | Error | any, context: string): SupabaseErrorDetails {
    const errorDetails = this.extractErrorDetails(error);
    
    // Log detalhado do erro
    safeLog('error', `[SupabaseErrorHandler] ${context}`, {
      code: errorDetails.code,
      message: errorDetails.message,
      details: errorDetails.details,
      hint: errorDetails.hint,
      statusCode: errorDetails.statusCode,
      table: errorDetails.table,
      column: errorDetails.column,
      query: errorDetails.query,
      parameters: errorDetails.parameters
    });

    return errorDetails;
  }

  /**
   * Extrai detalhes do erro de forma consistente
   */
  private static extractErrorDetails(error: any): SupabaseErrorDetails {
    // Erro Postgrest padrão
    if (error?.code && error?.message) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        statusCode: error.statusCode || this.getStatusCodeFromCode(error.code)
      };
    }

    // Erros HTTP/Network
    if (error?.status) {
      return {
        code: `HTTP_${error.status}`,
        message: error.message || `HTTP ${error.status} error`,
        statusCode: error.status,
        details: error.details || error.body
      };
    }

    // Erros de coluna/tabela inexistente
    if (error?.message?.includes('does not exist')) {
      const match = error.message.match(/column "([^"]+)" of relation "([^"]+)" does not exist/);
      return {
        code: 'COLUMN_NOT_FOUND',
        message: `Coluna não encontrada: ${match?.[1] || 'desconhecida'}`,
        details: error.message,
        table: match?.[2],
        column: match?.[1]
      };
    }

    // Erros de permissão/RLS
    if (error?.message?.includes('permission denied') || error?.code === '42501') {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Permissão negada para esta operação',
        details: error.message,
        hint: 'Verifique as políticas RLS do Supabase'
      };
    }

    // Erros de constraint única
    if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
      return {
        code: 'UNIQUE_VIOLATION',
        message: 'Registro duplicado detectado',
        details: error.message
      };
    }

    // Erro genérico
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Erro desconhecido',
      details: error?.toString()
    };
  }

  /**
   * Mapeia códigos de erro do Postgrest para status HTTP
   */
  private static getStatusCodeFromCode(code: string): number {
    const statusMap: Record<string, number> = {
      'PGRST100': 400, // Bad Request
      'PGRST101': 401, // Unauthorized
      'PGRST102': 403, // Forbidden
      'PGRST103': 404, // Not Found
      'PGRST104': 409, // Conflict
      'PGRST105': 422, // Unprocessable Entity
      'PGRST106': 413, // Payload Too Large
      'PGRST107': 429, // Too Many Requests
      'PGRST108': 503, // Service Unavailable
      'PGRST116': 406, // Not Acceptable
      'PGRST301': 409, // Unique Violation
      '42703': 400,  // Undefined Column
      '42P01': 404,  // Undefined Table
      '42501': 403,  // Insufficient Privilege
      '23505': 409,  // Unique Violation
      '23503': 409,  // Foreign Key Violation
    };

    return statusMap[code] || 500;
  }

  /**
   * Verifica se um erro é recuperável (merece retry)
   */
  static isRecoverableError(error: SupabaseErrorDetails): boolean {
    const recoverableCodes = [
      'HTTP_429',     // Too Many Requests
      'HTTP_503',     // Service Unavailable
      'HTTP_502',     // Bad Gateway
      'HTTP_504',     // Gateway Timeout
      'PGRST107',     // Too Many Requests
      'PGRST108',     // Service Unavailable
      'NETWORK_ERROR',
      'TIMEOUT_ERROR'
    ];

    return recoverableCodes.includes(error.code) || 
           (error.statusCode && [429, 502, 503, 504].includes(error.statusCode));
  }

  /**
   * Executa uma função com retry automático para erros recuperáveis
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorDetails = this.handleError(error, `${context} - attempt ${attempt + 1}`);

        // Se não for recuperável ou for a última tentativa, lançar o erro
        if (!this.isRecoverableError(errorDetails) || attempt === maxRetries) {
          throw error;
        }

        // Aguardar antes de retry
        const delay = this.RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
        safeLog('warn', `[SupabaseErrorHandler] Retry ${context} - attempt ${attempt + 2} after ${delay}ms`);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Delay assíncrono para retry
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Valida parâmetros antes de executar query
   */
  static validateQueryParams(params: Record<string, any>, context: string): void {
    const errors: string[] = [];

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        errors.push(`Parâmetro '${key}' é nulo ou indefinido`);
      }
      
      if (typeof value === 'string' && value.trim() === '') {
        errors.push(`Parâmetro '${key}' é uma string vazia`);
      }

      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        errors.push(`Parâmetro '${key}' é um número inválido`);
      }
    });

    if (errors.length > 0) {
      const error = new Error(`Validação de parâmetros falhou: ${errors.join(', ')}`);
      this.handleError(error, `${context} - parameter validation`);
      throw error;
    }
  }

  /**
   * Formata mensagem de erro amigável para o usuário
   */
  static getUserFriendlyMessage(errorDetails: SupabaseErrorDetails): string {
    const messages: Record<string, string> = {
      'COLUMN_NOT_FOUND': 'Esta funcionalidade está temporariamente indisponível. Tente novamente mais tarde.',
      'PERMISSION_DENIED': 'Você não tem permissão para esta ação.',
      'UNIQUE_VIOLATION': 'Este registro já existe.',
      'HTTP_429': 'Muitas requisições. Aguarde um momento.',
      'HTTP_503': 'Serviço temporariamente indisponível. Tente novamente.',
      'NETWORK_ERROR': 'Problema de conexão. Verifique sua internet.',
      'TIMEOUT_ERROR': 'A requisição demorou muito. Tente novamente.'
    };

    return messages[errorDetails.code] || 
           'Ocorreu um erro inesperado. Tente novamente mais tarde.';
  }
}

export default SupabaseErrorHandler;