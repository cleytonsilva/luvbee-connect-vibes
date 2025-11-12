import { supabase } from '@/integrations/supabase'
import { safeLog } from '@/lib/safe-log'

export type MetricName = 
  | 'api_response_time'
  | 'auth_success_rate'
  | 'database_query_time'
  | 'storage_upload_time'
  | 'realtime_connection_count'
  | 'error_rate'
  | 'user_active_count'
  | 'page_load_time'
  | 'api_request_count'
  | 'auth_attempt_count'

export interface MetricData {
  name: MetricName
  value: number
  tags?: Record<string, string>
  timestamp?: Date
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface MetricFilters {
  name?: MetricName
  startDate?: Date
  endDate?: Date
  tags?: Record<string, string>
  limit?: number
}

export interface AlertConfig {
  name: string
  metric: MetricName
  threshold: number
  operator: '>' | '<' | '=' | '>=' | '<='
  duration: number // minutos
  enabled: boolean
  channels: Array<'email' | 'slack' | 'webhook'>
}

/**
 * Serviço de métricas para monitoramento de performance
 */
export class MetricsService {
  private static instance: MetricsService
  private alertConfigs: AlertConfig[] = []
  private alertHistory: Map<string, Date> = new Map()

  private constructor() {
    this.loadAlertConfigs()
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService()
    }
    return MetricsService.instance
  }

  /**
   * Registrar uma métrica
   */
  async recordMetric(data: MetricData): Promise<void> {
    try {
      const { error } = await supabase
        .from('metrics')
        .insert({
          name: data.name,
          value: data.value,
          tags: data.tags || {},
          created_at: (data.timestamp || new Date()).toISOString()
        })

      if (error) {
        safeLog('error', 'Erro ao registrar métrica:', error)
        throw error
      }

      // Verificar alertas
      await this.checkAlerts(data)

      safeLog('info', `Métrica registrada: ${data.name} = ${data.value}`)
    } catch (error) {
      safeLog('error', 'Erro crítico no serviço de métricas:', error)
      // Não propagar erro para não quebrar a operação principal
    }
  }

  /**
   * Registrar métrica de tempo de resposta da API
   */
  async recordApiResponseTime(duration: number, endpoint: string, method: string): Promise<void> {
    await this.recordMetric({
      name: 'api_response_time',
      value: duration,
      tags: { endpoint, method }
    })
  }

  /**
   * Registrar métrica de sucesso/falha de autenticação
   */
  async recordAuthAttempt(success: boolean, provider: string = 'email'): Promise<void> {
    await this.recordMetric({
      name: 'auth_attempt_count',
      value: success ? 1 : 0,
      tags: { provider, success: success.toString() }
    })
  }

  /**
   * Registrar métrica de tempo de query do banco de dados
   */
  async recordDatabaseQueryTime(duration: number, table: string, operation: string): Promise<void> {
    await this.recordMetric({
      name: 'database_query_time',
      value: duration,
      tags: { table, operation }
    })
  }

  /**
   * Registrar métrica de upload de arquivo
   */
  async recordFileUpload(duration: number, fileSize: number, bucket: string): Promise<void> {
    await this.recordMetric({
      name: 'storage_upload_time',
      value: duration,
      tags: { bucket, fileSize: fileSize.toString() }
    })
  }

  /**
   * Obter métricas com filtros
   */
  async getMetrics(filters: MetricFilters = {}): Promise<{
    data: Array<{
      name: MetricName
      value: number
      tags: Record<string, string>
      created_at: string
    }>
    error: any
  }> {
    try {
      let query = supabase
        .from('metrics')
        .select('name,value,tags,created_at')

      // Aplicar filtros
      if (filters.name) {
        query = query.eq('name', filters.name)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      // Ordenar por data decrescente
      query = query.order('created_at', { ascending: false })

      // Limite
      const limit = filters.limit || 1000
      query = query.limit(limit)

      const { data, error } = await query

      if (error) {
        safeLog('error', 'Erro ao buscar métricas:', error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (error) {
      safeLog('error', 'Erro crítico ao buscar métricas:', error)
      return { data: [], error }
    }
  }

  /**
   * Obter estatísticas agregadas
   */
  async getMetricStats(name: MetricName, timeRange: TimeRange): Promise<{
    avg: number
    min: number
    max: number
    count: number
    p95: number
    p99: number
  } | null> {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('value')
        .eq('name', name)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())

      if (error || !data || data.length === 0) {
        return null
      }

      const values = data.map(d => d.value).sort((a, b) => a - b)
      const count = values.length
      const avg = values.reduce((sum, val) => sum + val, 0) / count
      const min = values[0]
      const max = values[count - 1]
      
      // Calcular percentis
      const p95Index = Math.ceil(count * 0.95) - 1
      const p99Index = Math.ceil(count * 0.99) - 1
      const p95 = values[p95Index]
      const p99 = values[p99Index]

      return { avg, min, max, count, p95, p99 }
    } catch (error) {
      safeLog('error', 'Erro ao calcular estatísticas:', error)
      return null
    }
  }

  /**
   * Configurar alertas
   */
  async setupAlerts(configs: AlertConfig[]): Promise<void> {
    try {
      this.alertConfigs = configs.filter(config => config.enabled)
      safeLog('info', `Alertas configurados: ${this.alertConfigs.length}`)
    } catch (error) {
      safeLog('error', 'Erro ao configurar alertas:', error)
    }
  }

  /**
   * Verificar alertas para uma métrica
   */
  private async checkAlerts(metric: MetricData): Promise<void> {
    for (const config of this.alertConfigs) {
      if (config.metric !== metric.name) continue

      const shouldAlert = this.evaluateAlertCondition(config, metric.value)
      if (!shouldAlert) continue

      // Verificar cooldown
      const lastAlert = this.alertHistory.get(config.name)
      if (lastAlert && Date.now() - lastAlert.getTime() < config.duration * 60 * 1000) {
        continue
      }

      // Disparar alerta
      await this.triggerAlert(config, metric)
      this.alertHistory.set(config.name, new Date())
    }
  }

  /**
   * Avaliar condição de alerta
   */
  private evaluateAlertCondition(config: AlertConfig, value: number): boolean {
    switch (config.operator) {
      case '>': return value > config.threshold
      case '<': return value < config.threshold
      case '=': return value === config.threshold
      case '>=': return value >= config.threshold
      case '<=': return value <= config.threshold
      default: return false
    }
  }

  /**
   * Disparar alerta
   */
  private async triggerAlert(config: AlertConfig, metric: MetricData): Promise<void> {
    const message = `🚨 Alerta: ${config.name}\nMétrica: ${metric.name}\nValor: ${metric.value}\nThreshold: ${config.operator} ${config.threshold}`

    safeLog('warn', message)

    // Enviar notificações (implementar conforme necessário)
    for (const channel of config.channels) {
      try {
        switch (channel) {
          case 'email':
            // Implementar envio de email
            break
          case 'slack':
            // Implementar webhook do Slack
            break
          case 'webhook':
            // Implementar webhook genérico
            break
        }
      } catch (error) {
        safeLog('error', `Erro ao enviar alerta para ${channel}:`, error)
      }
    }
  }

  /**
   * Obter dashboard de métricas
   */
  async getDashboard(timeRange: TimeRange): Promise<{
    apiResponseTime: any
    authSuccessRate: number
    errorRate: number
    userActiveCount: number
    topEndpoints: Array<{ endpoint: string; avgTime: number }>
  }> {
    try {
      // Obter estatísticas de tempo de resposta da API
      const apiStats = await this.getMetricStats('api_response_time', timeRange)
      
      // Calcular taxa de sucesso de autenticação
      const authMetrics = await this.getMetrics({
        name: 'auth_attempt_count',
        startDate: timeRange.start,
        endDate: timeRange.end
      })

      const totalAuth = authMetrics.data.length
      const successfulAuth = authMetrics.data.filter(m => m.tags.success === 'true').length
      const authSuccessRate = totalAuth > 0 ? (successfulAuth / totalAuth) * 100 : 0

      // Calcular taxa de erro
      const errorMetrics = await this.getMetrics({
        name: 'error_rate',
        startDate: timeRange.start,
        endDate: timeRange.end
      })

      const avgErrorRate = errorMetrics.data.length > 0 
        ? errorMetrics.data.reduce((sum, m) => sum + m.value, 0) / errorMetrics.data.length 
        : 0

      // Contar usuários ativos
      const userMetrics = await this.getMetrics({
        name: 'user_active_count',
        startDate: timeRange.start,
        endDate: timeRange.end
      })

      const latestUserCount = userMetrics.data.length > 0 
        ? userMetrics.data[0].value 
        : 0

      // Top endpoints por tempo de resposta
      const apiMetrics = await this.getMetrics({
        name: 'api_response_time',
        startDate: timeRange.start,
        endDate: timeRange.end,
        limit: 100
      })

      const endpointTimes: Record<string, number[]> = {}
      apiMetrics.data.forEach(metric => {
        const endpoint = metric.tags.endpoint
        if (!endpointTimes[endpoint]) {
          endpointTimes[endpoint] = []
        }
        endpointTimes[endpoint].push(metric.value)
      })

      const topEndpoints = Object.entries(endpointTimes)
        .map(([endpoint, times]) => ({
          endpoint,
          avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10)

      return {
        apiResponseTime: apiStats,
        authSuccessRate: Math.round(authSuccessRate * 100) / 100,
        errorRate: Math.round(avgErrorRate * 100) / 100,
        userActiveCount: Math.round(latestUserCount),
        topEndpoints
      }
    } catch (error) {
      safeLog('error', 'Erro ao gerar dashboard:', error)
      return {
        apiResponseTime: null,
        authSuccessRate: 0,
        errorRate: 0,
        userActiveCount: 0,
        topEndpoints: []
      }
    }
  }

  /**
   * Carregar configurações de alertas
   */
  private loadAlertConfigs(): void {
    // Configurações padrão de alertas
    this.alertConfigs = [
      {
        name: 'high_api_response_time',
        metric: 'api_response_time',
        threshold: 2000, // 2 segundos
        operator: '>',
        duration: 5, // 5 minutos
        enabled: true,
        channels: ['email']
      },
      {
        name: 'high_error_rate',
        metric: 'error_rate',
        threshold: 0.05, // 5%
        operator: '>',
        duration: 10, // 10 minutos
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        name: 'low_auth_success_rate',
        metric: 'auth_success_rate',
        threshold: 0.8, // 80%
        operator: '<',
        duration: 15, // 15 minutos
        enabled: true,
        channels: ['email']
      }
    ]
  }
}

// Exportar instância singleton
export const metricsService = MetricsService.getInstance()
export default metricsService
