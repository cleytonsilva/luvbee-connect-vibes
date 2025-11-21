import { safeLog } from '@/lib/safe-log';

export interface SupabaseQueryLog {
  timestamp: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  table?: string;
  functionName?: string;
  query: string;
  parameters: any[];
  duration: number;
  success: boolean;
  error?: string;
  affectedRows?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface SupabasePerformanceMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageDuration: number;
  slowQueries: number;
  queriesByTable: Record<string, number>;
  queriesByOperation: Record<string, number>;
  errorRate: number;
  lastUpdated: string;
}

export class SupabaseLogger {
  private static queryLogs: SupabaseQueryLog[] = [];
  private static readonly MAX_LOGS = 1000;
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 segundo
  private static performanceMetrics: SupabasePerformanceMetrics;

  /**
   * Registra uma query do Supabase
   */
  static logQuery(log: Omit<SupabaseQueryLog, 'timestamp'>): void {
    const fullLog: SupabaseQueryLog = {
      ...log,
      timestamp: new Date().toISOString()
    };

    // Adicionar ao array de logs
    this.queryLogs.push(fullLog);

    // Limitar tamanho do cache
    if (this.queryLogs.length > this.MAX_LOGS) {
      this.queryLogs = this.queryLogs.slice(-this.MAX_LOGS);
    }

    // Log no console em desenvolvimento
    if (import.meta.env.DEV) {
      console.group(`[SupabaseLogger] ${log.operation} ${log.table || log.functionName || 'unknown'}`);
      console.log('Query:', log.query);
      console.log('Parameters:', log.parameters);
      console.log('Duration:', `${log.duration}ms`);
      console.log('Success:', log.success);
      if (log.error) console.error('Error:', log.error);
      console.groupEnd();
    }

    // Log estruturado para análise
    safeLog(
      log.success ? 'info' : 'error',
      `[SupabaseLogger] ${log.operation} ${log.success ? 'success' : 'failed'}`,
      {
        operation: log.operation,
        table: log.table,
        functionName: log.functionName,
        duration: log.duration,
        success: log.success,
        error: log.error,
        affectedRows: log.affectedRows,
        userId: log.userId
      }
    );

    // Atualizar métricas de performance
    this.updatePerformanceMetrics(fullLog);

    // Alertar sobre queries lentas
    if (log.duration > this.SLOW_QUERY_THRESHOLD) {
      safeLog('warn', '[SupabaseLogger] Slow query detected', {
        operation: log.operation,
        table: log.table,
        functionName: log.functionName,
        duration: log.duration,
        query: log.query
      });
    }
  }

  /**
   * Cria um interceptor para queries Supabase
   */
  static createQueryInterceptor(operation: string, table?: string, functionName?: string) {
    const startTime = Date.now();
    
    return {
      success: (result?: any, metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        
        this.logQuery({
          operation: this.getOperationType(operation),
          table,
          functionName,
          query: operation,
          parameters: [],
          duration,
          success: true,
          affectedRows: this.getAffectedRows(result),
          metadata
        });
      },
      
      error: (error: any, metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        
        this.logQuery({
          operation: this.getOperationType(operation),
          table,
          functionName,
          query: operation,
          parameters: [],
          duration,
          success: false,
          error: error.message || error.toString(),
          metadata
        });
      }
    };
  }

  /**
   * Registra uma query SELECT com detalhes
   */
  static logSelect(table: string, columns: string[], filters?: Record<string, any>, result?: any): void {
    const query = `SELECT ${columns.join(', ')} FROM ${table}`;
    const parameters = filters ? Object.entries(filters).map(([k, v]) => `${k}=${v}`) : [];
    
    this.logQuery({
      operation: 'SELECT',
      table,
      query,
      parameters,
      duration: 0, // Será preenchido pelo interceptor
      success: !result?.error,
      error: result?.error?.message,
      affectedRows: Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0
    });
  }

  /**
   * Registra uma query INSERT
   */
  static logInsert(table: string, data: any, result?: any): void {
    const query = `INSERT INTO ${table}`;
    
    this.logQuery({
      operation: 'INSERT',
      table,
      query,
      parameters: [JSON.stringify(data)],
      duration: 0,
      success: !result?.error,
      error: result?.error?.message,
      affectedRows: result?.data ? 1 : 0
    });
  }

  /**
   * Registra uma query UPDATE
   */
  static logUpdate(table: string, data: any, filters?: Record<string, any>, result?: any): void {
    const query = `UPDATE ${table}`;
    const parameters = [
      `SET: ${JSON.stringify(data)}`,
      ...(filters ? Object.entries(filters).map(([k, v]) => `WHERE ${k}=${v}`) : [])
    ];
    
    this.logQuery({
      operation: 'UPDATE',
      table,
      query,
      parameters,
      duration: 0,
      success: !result?.error,
      error: result?.error?.message,
      affectedRows: result?.count || (result?.data ? 1 : 0)
    });
  }

  /**
   * Registra uma chamada RPC
   */
  static logRPC(functionName: string, params?: Record<string, any>, result?: any, duration?: number): void {
    this.logQuery({
      operation: 'RPC',
      functionName,
      query: `RPC ${functionName}`,
      parameters: params ? [JSON.stringify(params)] : [],
      duration: duration || 0,
      success: !result?.error,
      error: result?.error?.message,
      affectedRows: Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0
    });
  }

  /**
   * Atualiza métricas de performance
   */
  private static updatePerformanceMetrics(log: SupabaseQueryLog): void {
    if (!this.performanceMetrics) {
      this.performanceMetrics = {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        queriesByTable: {},
        queriesByOperation: {},
        errorRate: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const metrics = this.performanceMetrics;
    
    // Atualizar contadores
    metrics.totalQueries++;
    if (log.success) {
      metrics.successfulQueries++;
    } else {
      metrics.failedQueries++;
    }

    // Atualizar duração média
    const totalDuration = (metrics.averageDuration * (metrics.totalQueries - 1)) + log.duration;
    metrics.averageDuration = totalDuration / metrics.totalQueries;

    // Contar queries lentas
    if (log.duration > this.SLOW_QUERY_THRESHOLD) {
      metrics.slowQueries++;
    }

    // Contar por tabela
    if (log.table) {
      metrics.queriesByTable[log.table] = (metrics.queriesByTable[log.table] || 0) + 1;
    }

    // Contar por operação
    metrics.queriesByOperation[log.operation] = (metrics.queriesByOperation[log.operation] || 0) + 1;

    // Calcular taxa de erro
    metrics.errorRate = (metrics.failedQueries / metrics.totalQueries) * 100;

    metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Obtém as métricas de performance atuais
   */
  static getPerformanceMetrics(): SupabasePerformanceMetrics {
    return this.performanceMetrics || {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageDuration: 0,
      slowQueries: 0,
      queriesByTable: {},
      queriesByOperation: {},
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Obtém logs recentes
   */
  static getRecentLogs(limit: number = 100): SupabaseQueryLog[] {
    return this.queryLogs.slice(-limit);
  }

  /**
   * Obtém logs filtrados
   */
  static getFilteredLogs(filters: {
    table?: string;
    operation?: string;
    success?: boolean;
    userId?: string;
    minDuration?: number;
    maxDuration?: number;
    startDate?: Date;
    endDate?: Date;
  }): SupabaseQueryLog[] {
    return this.queryLogs.filter(log => {
      if (filters.table && log.table !== filters.table) return false;
      if (filters.operation && log.operation !== filters.operation) return false;
      if (filters.success !== undefined && log.success !== filters.success) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.minDuration && log.duration < filters.minDuration) return false;
      if (filters.maxDuration && log.duration > filters.maxDuration) return false;
      
      if (filters.startDate) {
        const logDate = new Date(log.timestamp);
        if (logDate < filters.startDate) return false;
      }
      
      if (filters.endDate) {
        const logDate = new Date(log.timestamp);
        if (logDate > filters.endDate) return false;
      }
      
      return true;
    });
  }

  /**
   * Limpa todos os logs (útil para desenvolvimento)
   */
  static clearLogs(): void {
    this.queryLogs = [];
    this.performanceMetrics = null as any;
    safeLog('info', '[SupabaseLogger] All logs cleared');
  }

  /**
   * Exporta logs para análise
   */
  static exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,operation,table,functionName,query,duration,success,error,affectedRows,userId';
      const rows = this.queryLogs.map(log => 
        `${log.timestamp},${log.operation},${log.table || ''},${log.functionName || ''},"${log.query}",${log.duration},${log.success},"${log.error || ''}",${log.affectedRows || 0},${log.userId || ''}`
      );
      return [headers, ...rows].join('\n');
    }
    
    return JSON.stringify({
      logs: this.queryLogs,
      metrics: this.getPerformanceMetrics(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Helper para determinar tipo de operação
   */
  private static getOperationType(operation: string): SupabaseQueryLog['operation'] {
    const upperOp = operation.toUpperCase();
    if (upperOp.includes('SELECT')) return 'SELECT';
    if (upperOp.includes('INSERT')) return 'INSERT';
    if (upperOp.includes('UPDATE')) return 'UPDATE';
    if (upperOp.includes('DELETE')) return 'DELETE';
    if (upperOp.includes('RPC')) return 'RPC';
    return 'SELECT'; // Default
  }

  /**
   * Helper para obter número de linhas afetadas
   */
  private static getAffectedRows(result: any): number {
    if (Array.isArray(result)) return result.length;
    if (result?.data) return Array.isArray(result.data) ? result.data.length : 1;
    if (result?.count !== undefined) return result.count;
    return 0;
  }
}

export default SupabaseLogger;