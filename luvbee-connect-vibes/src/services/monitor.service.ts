import { supabase } from '@/integrations/supabase'
import { auditService } from './audit.service'
import { metricsService } from './metrics.service'
import { safeLog } from '@/lib/safe-log'
import type { IntegrationTestReport, TestResult } from './integration-test.service'

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: HealthCheck
    auth: HealthCheck
    storage: HealthCheck
    realtime: HealthCheck
    api: HealthCheck
  }
  lastCheck: string
  uptime: number
}

export interface HealthCheck {
  status: 'up' | 'down' | 'warning'
  responseTime: number
  lastCheck: string
  message: string
  error?: any
}

export interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  totalLocations: number
  totalMessages: number
  apiCalls: number
  errorRate: number
  averageResponseTime: number
  storageUsage: number
}

export interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  resolved: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
}

/**
 * Serviço de monitoramento do sistema
 */
export class MonitorService {
  private static instance: MonitorService
  private healthCheckInterval: NodeJS.Timeout | null = null
  private alerts: Alert[] = []
  private systemHealth: SystemHealth | null = null

  private constructor() {}

  static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService()
    }
    return MonitorService.instance
  }

  /**
   * Iniciar monitoramento automático
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    safeLog('info', '🔍 Iniciando monitoramento automático...')

    // Executar primeiro check imediatamente
    this.performHealthCheck()

    // Configurar intervalo de verificação
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, intervalMs)
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      safeLog('info', '⏹️ Monitoramento parado')
    }
  }

  /**
   * Executar verificação de saúde completa
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now()
    
    try {
      const checks = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkAuthHealth(),
        this.checkStorageHealth(),
        this.checkRealtimeHealth(),
        this.checkApiHealth()
      ])

      const [database, auth, storage, realtime, api] = checks
      
      // Determinar status geral
      const downChecks = checks.filter(c => c.status === 'down').length
      const warningChecks = checks.filter(c => c.status === 'warning').length
      
      let status: SystemHealth['status'] = 'healthy'
      if (downChecks > 0) status = 'unhealthy'
      else if (warningChecks > 0) status = 'degraded'

      this.systemHealth = {
        status,
        checks: {
          database,
          auth,
          storage,
          realtime,
          api
        },
        lastCheck: new Date().toISOString(),
        uptime: Date.now() - startTime
      }

      // Registrar no serviço de auditoria
      await auditService.logAction({
        action: 'HEALTH_CHECK',
        newValues: this.systemHealth
      })

      // Verificar alertas
      await this.checkForAlerts(this.systemHealth)

      safeLog('info', `📊 Health check completo: ${status}`)
      
      return this.systemHealth
    } catch (error) {
      safeLog('error', 'Erro ao executar health check:', error)
      
      const failedHealth: SystemHealth = {
        status: 'unhealthy',
        checks: {
          database: { status: 'down', responseTime: -1, lastCheck: new Date().toISOString(), message: 'Health check failed', error },
          auth: { status: 'down', responseTime: -1, lastCheck: new Date().toISOString(), message: 'Health check failed', error },
          storage: { status: 'down', responseTime: -1, lastCheck: new Date().toISOString(), message: 'Health check failed', error },
          realtime: { status: 'down', responseTime: -1, lastCheck: new Date().toISOString(), message: 'Health check failed', error },
          api: { status: 'down', responseTime: -1, lastCheck: new Date().toISOString(), message: 'Health check failed', error }
        },
        lastCheck: new Date().toISOString(),
        uptime: Date.now() - startTime
      }

      this.systemHealth = failedHealth
      return failedHealth
    }
  }

  /**
   * Verificar saúde do banco de dados
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      if (error) throw error

      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'up' : 'warning',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: `Database responding in ${responseTime}ms`
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        message: 'Database connection failed',
        error
      }
    }
  }

  /**
   * Verificar saúde da autenticação
   */
  private async checkAuthHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) throw error

      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 500 ? 'up' : 'warning',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: 'Auth service responding'
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        message: 'Auth service failed',
        error
      }
    }
  }

  /**
   * Verificar saúde do storage
   */
  private async checkStorageHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Listar buckets disponíveis
      const { data, error } = await supabase.storage.listBuckets()
      
      if (error) throw error

      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'up' : 'warning',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: `${data?.length || 0} buckets available`
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        message: 'Storage service failed',
        error
      }
    }
  }

  /**
   * Verificar saúde do realtime
   */
  private async checkRealtimeHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Testar conexão realtime com um canal de teste
      const channel = supabase.channel('health-check')
      
      const responseTime = Date.now() - startTime
      
      // Limpar canal
      supabase.removeChannel(channel)
      
      return {
        status: responseTime < 500 ? 'up' : 'warning',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: 'Realtime connection available'
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        message: 'Realtime connection failed',
        error
      }
    }
  }

  /**
   * Verificar saúde da API
   */
  private async checkApiHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Testar endpoint de health (se existir)
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 5000
      } as RequestInit)

      const responseTime = Date.now() - startTime
      
      return {
        status: response.ok && responseTime < 1000 ? 'up' : 'warning',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: `API status: ${response.status}`
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        message: 'API health check failed',
        error
      }
    }
  }

  /**
   * Obter métricas do sistema
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Obter contadores principais
      const [
        usersCount,
        locationsCount,
        messagesCount,
        apiCallsCount
      ] = await Promise.all([
        this.getTableCount('users'),
        this.getTableCount('locations'),
        this.getTableCount('messages'),
        this.getApiCallsCount()
      ])

      // Calcular taxa de erro
      const errorRate = await this.calculateErrorRate()
      
      // Calcular tempo médio de resposta
      const avgResponseTime = await this.getAverageResponseTime()

      // Estimar usuários ativos (últimas 24h)
      const activeUsers = await this.getActiveUsersCount()

      return {
        totalUsers: usersCount,
        activeUsers,
        totalLocations: locationsCount,
        totalMessages: messagesCount,
        apiCalls: apiCallsCount,
        errorRate,
        averageResponseTime: avgResponseTime,
        storageUsage: 0 // TODO: Implementar cálculo de storage
      }
    } catch (error) {
      safeLog('error', 'Erro ao obter métricas do sistema:', error)
      throw error
    }
  }

  /**
   * Obter contador de tabela
   */
  private async getTableCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    } catch (error) {
      safeLog('error', `Erro ao contar ${tableName}:`, error)
      return 0
    }
  }

  /**
   * Obter contador de chamadas API
   */
  private async getApiCallsCount(): Promise<number> {
    try {
      // Buscar métricas de API
      const { data, error } = await supabase
        .from('metrics')
        .select('value')
        .eq('name', 'api_calls')
        .limit(1)

      if (error) throw error
      return data?.[0]?.value || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Obter taxa de erro
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      // Buscar logs de erro recentes
      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'ERROR')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error
      return count || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Obter tempo médio de resposta
   */
  private async getAverageResponseTime(): Promise<number> {
    try {
      // Buscar métricas de tempo de resposta
      const { data, error } = await supabase
        .from('metrics')
        .select('value')
        .eq('name', 'response_time')
        .limit(10)

      if (error) throw error
      
      if (data && data.length > 0) {
        const sum = data.reduce((acc, item) => acc + (item.value || 0), 0)
        return Math.round(sum / data.length)
      }
      
      return 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Obter contador de usuários ativos
   */
  private async getActiveUsersCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error
      return count || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Verificar e criar alertas
   */
  private async checkForAlerts(health: SystemHealth): Promise<void> {
    const newAlerts: Alert[] = []

    // Verificar componentes críticos
    Object.entries(health.checks).forEach(([component, check]) => {
      if (check.status === 'down') {
        newAlerts.push({
          id: `alert-${component}-${Date.now()}`,
          type: 'error',
          title: `${component.toUpperCase()} Service Down`,
          message: `${component} service is not responding: ${check.message}`,
          timestamp: new Date().toISOString(),
          resolved: false,
          severity: 'critical',
          component
        })
      } else if (check.status === 'warning') {
        newAlerts.push({
          id: `alert-${component}-${Date.now()}`,
          type: 'warning',
          title: `${component.toUpperCase()} Service Slow`,
          message: `${component} service is responding slowly: ${check.message}`,
          timestamp: new Date().toISOString(),
          resolved: false,
          severity: 'medium',
          component
        })
      }
    })

    // Adicionar novos alertas
    this.alerts.push(...newAlerts)

    // Limitar número de alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Registrar alertas críticos
    for (const alert of newAlerts.filter(a => a.severity === 'critical')) {
      await auditService.logAction({
        action: 'SYSTEM_ALERT',
        newValues: alert
      })
    }
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Obter todos os alertas
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  /**
   * Obter status de saúde atual
   */
  getCurrentHealth(): SystemHealth | null {
    return this.systemHealth
  }

  /**
   * Obter dashboard de monitoramento
   */
  async getDashboard(): Promise<{
    health: SystemHealth
    metrics: SystemMetrics
    alerts: Alert[]
    recentTests: IntegrationTestReport[]
  }> {
    try {
      const [health, metrics, alerts, recentTests] = await Promise.all([
        this.performHealthCheck(),
        this.getSystemMetrics(),
        Promise.resolve(this.getActiveAlerts()),
        this.getRecentTestResults()
      ])

      return {
        health,
        metrics,
        alerts,
        recentTests
      }
    } catch (error) {
      safeLog('error', 'Erro ao obter dashboard:', error)
      throw error
    }
  }

  /**
   * Obter resultados recentes de testes
   */
  private async getRecentTestResults(): Promise<IntegrationTestReport[]> {
    try {
      // Buscar testes de integração recentes
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'INTEGRATION_TEST_RUN')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Transformar em relatórios de teste
      return (data || []).map(log => ({
        timestamp: log.created_at,
        totalTests: log.new_values?.totalTests || 0,
        passedTests: log.new_values?.passedTests || 0,
        failedTests: log.new_values?.failedTests || 0,
        skippedTests: log.new_values?.skippedTests || 0,
        duration: log.new_values?.duration || 0,
        results: [],
        summary: log.new_values?.summary || ''
      }))
    } catch (error) {
      safeLog('error', 'Erro ao obter resultados de testes:', error)
      return []
    }
  }
}

// Exportar instância singleton
export const monitorService = MonitorService.getInstance()
export default monitorService