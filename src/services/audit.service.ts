import { supabase } from '@/integrations/supabase'
import type { Database } from '@/integrations/database.types'
import { safeLog } from '@/lib/safe-log'

export type AuditAction = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT' 
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'LOCATION_CREATE'
  | 'LOCATION_UPDATE'
  | 'LOCATION_DELETE'
  | 'MATCH_CREATE'
  | 'MATCH_UPDATE'
  | 'MESSAGE_SEND'
  | 'MESSAGE_DELETE'
  | 'FILE_UPLOAD'
  | 'FILE_DELETE'
  | 'PREFERENCE_UPDATE'
  | 'CHECK_IN'
  | 'CHECK_OUT'

export interface AuditFilters {
  userId?: string
  action?: AuditAction
  tableName?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface AuditLogData {
  userId?: string
  action: AuditAction
  tableName?: string
  recordId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Serviço de auditoria para registrar e consultar logs de operações
 */
export class AuditService {
  private static instance: AuditService

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  /**
   * Registrar uma ação de auditoria
   */
  async logAction(data: AuditLogData): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: data.userId,
          action: data.action,
          table_name: data.tableName,
          record_id: data.recordId,
          old_values: data.oldValues,
          new_values: data.newValues,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
          created_at: new Date().toISOString()
        })

      if (error) {
        safeLog('error', 'Erro ao registrar auditoria:', error)
        throw error
      }

      safeLog('info', `Auditoria registrada: ${data.action} - User: ${data.userId || 'anon'}`)
    } catch (error) {
      safeLog('error', 'Erro crítico no serviço de auditoria:', error)
      // Não propagar erro para não quebrar a operação principal
    }
  }

  /**
   * Obter logs de auditoria com filtros
   */
  async getAuditLogs(filters: AuditFilters = {}): Promise<{
    data: Database['public']['Tables']['audit_logs']['Row'][]
    count: number
    error: any
  }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })

      // Aplicar filtros
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      // Ordenar por data decrescente
      query = query.order('created_at', { ascending: false })

      // Paginação
      const limit = filters.limit || 50
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query

      if (error) {
        safeLog('error', 'Erro ao buscar logs de auditoria:', error)
        return { data: [], count: 0, error }
      }

      return { data: data || [], count: count || 0, error: null }
    } catch (error) {
      safeLog('error', 'Erro crítico ao buscar auditoria:', error)
      return { data: [], count: 0, error }
    }
  }

  /**
   * Obter estatísticas de auditoria
   */
  async getAuditStats(timeRange: { start: Date; end: Date }): Promise<{
    totalActions: number
    actionsByType: Record<AuditAction, number>
    topUsers: Array<{ userId: string; actionCount: number }>
    errorRate: number
  }> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, user_id, created_at')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())

      if (error || !data) {
        safeLog('error', 'Erro ao buscar estatísticas:', error)
        throw error
      }

      const stats = {
        totalActions: data.length,
        actionsByType: {} as Record<AuditAction, number>,
        topUsers: [] as Array<{ userId: string; actionCount: number }>,
        errorRate: 0
      }

      // Contar ações por tipo
      data.forEach(log => {
        stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1
      })

      // Top usuários
      const userCounts = data.reduce((acc, log) => {
        if (log.user_id) {
          acc[log.user_id] = (acc[log.user_id] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      stats.topUsers = Object.entries(userCounts)
        .map(([userId, actionCount]) => ({ userId, actionCount }))
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 10)

      return stats
    } catch (error) {
      safeLog('error', 'Erro ao calcular estatísticas:', error)
      throw error
    }
  }

  /**
   * Limpar logs antigos
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deletedCount: number
    error: any
  }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const { error, count } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        safeLog('error', 'Erro ao limpar logs antigos:', error)
        return { deletedCount: 0, error }
      }

      safeLog('info', `Logs antigos removidos: ${count || 0} registros`)
      return { deletedCount: count || 0, error: null }
    } catch (error) {
      safeLog('error', 'Erro crítico ao limpar logs:', error)
      return { deletedCount: 0, error }
    }
  }

  /**
   * Registrar login de usuário
   */
  async logLogin(userId: string, metadata?: {
    ipAddress?: string
    userAgent?: string
    provider?: string
  }): Promise<void> {
    await this.logAction({
      userId,
      action: 'USER_LOGIN',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    })
  }

  /**
   * Registrar logout de usuário
   */
  async logLogout(userId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'USER_LOGOUT'
    })
  }

  /**
   * Registrar criação de usuário
   */
  async logUserCreate(userId: string, userData: any): Promise<void> {
    await this.logAction({
      userId,
      action: 'USER_CREATE',
      tableName: 'users',
      recordId: userId,
      newValues: userData
    })
  }

  /**
   * Registrar atualização de usuário
   */
  async logUserUpdate(userId: string, oldData: any, newData: any): Promise<void> {
    await this.logAction({
      userId,
      action: 'USER_UPDATE',
      tableName: 'users',
      recordId: userId,
      oldValues: oldData,
      newValues: newData
    })
  }

  /**
   * Registrar envio de mensagem
   */
  async logMessageSent(userId: string, messageId: string, content: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'MESSAGE_SEND',
      tableName: 'messages',
      recordId: messageId,
      newValues: { content }
    })
  }

  /**
   * Registrar check-in
   */
  async logCheckIn(userId: string, locationId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'CHECK_IN',
      tableName: 'check_ins',
      recordId: locationId
    })
  }

  /**
   * Registrar check-out
   */
  async logCheckOut(userId: string, locationId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'CHECK_OUT',
      tableName: 'check_ins',
      recordId: locationId
    })
  }
}

// Exportar instância singleton
export const auditService = AuditService.getInstance()
export default auditService