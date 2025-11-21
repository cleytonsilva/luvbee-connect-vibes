/**
 * Sistema de Monitoramento de Cache do Supabase
 * 
 * Monitora o consumo de saída em cache e alerta quando próximo ao limite
 */

import { safeLog } from './safe-log'

export interface CacheUsageData {
  currentUsageGB: number
  limitGB: number
  percentage: number
  dailyUsage: Array<{
    date: string
    usageGB: number
  }>
  lastUpdated: string
}

export class CacheMonitor {
  private static readonly CACHE_KEY = 'supabase-cache-usage'
  private static readonly ALERT_THRESHOLD = 0.8 // 80% do limite
  private static readonly LIMIT_GB = 5 // Plano gratuito
  
  /**
   * Obtém dados de uso de cache (simulado - em produção viria da API do Supabase)
   */
  static async getCacheUsage(): Promise<CacheUsageData> {
    try {
      // Em produção, isso viria da API do Supabase:
      // const response = await fetch(`${SUPABASE_URL}/rest/v1/usage/cache`, {
      //   headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
      // })
      
      // Por enquanto, simulamos com base no histórico armazenado
      const stored = localStorage.getItem(this.CACHE_KEY)
      const defaultData: CacheUsageData = {
        currentUsageGB: 0.07, // Excedente atual
        limitGB: this.LIMIT_GB,
        percentage: (0.07 / this.LIMIT_GB) * 100,
        dailyUsage: [
          { date: '2025-11-18', usageGB: 4.8 },
          { date: '2025-11-17', usageGB: 4.2 },
          { date: '2025-11-16', usageGB: 3.9 },
        ],
        lastUpdated: new Date().toISOString()
      }
      
      return stored ? JSON.parse(stored) : defaultData
    } catch (error) {
      safeLog('error', '[CacheMonitor] Erro ao obter uso de cache', { error })
      throw error
    }
  }
  
  /**
   * Atualiza dados de uso de cache
   */
  static async updateCacheUsage(usageGB: number): Promise<void> {
    try {
      const currentData = await this.getCacheUsage()
      const today = new Date().toISOString().split('T')[0]
      
      // Atualiza ou adiciona uso de hoje
      const todayIndex = currentData.dailyUsage.findIndex(item => item.date === today)
      if (todayIndex >= 0) {
        currentData.dailyUsage[todayIndex].usageGB = usageGB
      } else {
        currentData.dailyUsage.unshift({ date: today, usageGB })
        // Mantém apenas últimos 30 dias
        if (currentData.dailyUsage.length > 30) {
          currentData.dailyUsage = currentData.dailyUsage.slice(0, 30)
        }
      }
      
      currentData.currentUsageGB = usageGB
      currentData.percentage = (usageGB / this.LIMIT_GB) * 100
      currentData.lastUpdated = new Date().toISOString()
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(currentData))
      
      // Verifica se precisa alertar
      if (currentData.percentage >= this.ALERT_THRESHOLD * 100) {
        this.sendAlert(currentData)
      }
    } catch (error) {
      safeLog('error', '[CacheMonitor] Erro ao atualizar uso de cache', { error })
    }
  }
  
  /**
   * Envia alerta quando próximo ao limite
   */
  private static sendAlert(data: CacheUsageData): void {
    const message = `⚠️ Alerta de Cache: ${data.percentage.toFixed(1)}% do limite utilizado (${data.currentUsageGB.toFixed(2)}GB / ${data.limitGB}GB)`
    
    // Log para monitoramento
    safeLog('warn', '[CacheMonitor] Alerta de uso de cache', {
      percentage: data.percentage,
      currentUsageGB: data.currentUsageGB,
      limitGB: data.limitGB
    })
    
    // Notificação visual (se disponível)
    if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
      new Notification('Alerta de Cache Supabase', {
        body: message,
        icon: '/warning-icon.png'
      })
    }
    
    // Toast notification (se disponível)
    try {
      // @ts-ignore - Import dinâmico para evitar dependência circular
      import('sonner').then(({ toast }) => {
        toast.warning(message, {
          duration: 10000,
          position: 'top-center'
        })
      })
    } catch {
      // Fallback para console
      console.warn(message)
    }
  }
  
  /**
   * Verifica se está próximo ao limite
   */
  static isNearLimit(usageGB?: number): boolean {
    const current = usageGB ?? this.getStoredUsage()
    return current >= (this.LIMIT_GB * this.ALERT_THRESHOLD)
  }
  
  /**
   * Obtém uso armazenado localmente
   */
  private static getStoredUsage(): number {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        return data.currentUsageGB || 0
      }
    } catch {
      // Ignora erro
    }
    return 0
  }
  
  /**
   * Calcula projeção de uso baseado na tendência
   */
  static calculateProjectedUsage(daysAhead: number = 7): number {
    try {
      const data = this.getCacheUsage()
      if (data.dailyUsage.length < 2) return data.currentUsageGB
      
      // Calcula tendência linear simples
      const recent = data.dailyUsage.slice(0, 7)
      const avgDailyIncrease = recent.reduce((acc, item, index) => {
        if (index === 0) return acc
        return acc + (item.usageGB - recent[index - 1].usageGB)
      }, 0) / Math.max(1, recent.length - 1)
      
      return Math.max(0, data.currentUsageGB + (avgDailyIncrease * daysAhead))
    } catch {
      return 0
    }
  }
  
  /**
   * Gera relatório de otimização
   */
  static generateOptimizationReport(): string {
    const data = this.getCacheUsage()
    const projected = this.calculateProjectedUsage()
    
    return `
📊 RELATÓRIO DE OTIMIZAÇÃO DE CACHE

📈 Uso Atual: ${data.currentUsageGB.toFixed(2)}GB / ${data.limitGB}GB (${data.percentage.toFixed(1)}%)
🔮 Projeção 7 dias: ${projected.toFixed(2)}GB
⚠️  Status: ${data.percentage >= 80 ? 'CRÍTICO' : data.percentage >= 60 ? 'ALERTA' : 'NORMAL'}

💡 Recomendações:
${data.percentage >= 80 ? '- Implementar medidas emergenciais imediatamente' : ''}
${data.percentage >= 60 ? '- Reduzir tamanho de imagens e ativar compressão' : ''}
- Verificar queries que selecionam muitas colunas
- Implementar cache client-side para imagens
- Monitorar Edge Functions com alto volume

📅 Última atualização: ${new Date(data.lastUpdated).toLocaleString('pt-BR')}
    `.trim()
  }
}

/**
 * Hook para monitoramento em componentes React
 */
export function useCacheMonitor() {
  const [cacheData, setCacheData] = useState<CacheUsageData | null>(null)
  const [isNearLimit, setIsNearLimit] = useState(false)
  
  useEffect(() => {
    const updateCacheData = async () => {
      try {
        const data = await CacheMonitor.getCacheUsage()
        setCacheData(data)
        setIsNearLimit(CacheMonitor.isNearLimit(data.currentUsageGB))
      } catch (error) {
        console.error('[useCacheMonitor] Erro ao obter dados de cache', error)
      }
    }
    
    updateCacheData()
    const interval = setInterval(updateCacheData, 5 * 60 * 1000) // Atualiza a cada 5 minutos
    
    return () => clearInterval(interval)
  }, [])
  
  return { cacheData, isNearLimit }
}