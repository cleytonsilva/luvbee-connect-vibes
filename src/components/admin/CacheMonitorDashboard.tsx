import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp, Database, AlertCircle } from 'lucide-react'
import { useCacheMonitor } from '@/lib/cache-monitor'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function CacheMonitorDashboard() {
  const { cacheData, isNearLimit } = useCacheMonitor()
  
  if (!cacheData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Monitoramento de Cache
          </CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  const usagePercentage = Math.min(100, cacheData.percentage)
  const isCritical = usagePercentage >= 80
  const isWarning = usagePercentage >= 60 && usagePercentage < 80
  
  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500'
    if (isWarning) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  
  const getStatusIcon = () => {
    if (isCritical) return <AlertTriangle className="h-5 w-5 text-red-500" />
    if (isWarning) return <AlertCircle className="h-5 w-5 text-yellow-500" />
    return <TrendingUp className="h-5 w-5 text-green-500" />
  }
  
  const getStatusText = () => {
    if (isCritical) return 'CRÍTICO - Ação imediata necessária'
    if (isWarning) return 'ALERTA - Monitore de perto'
    return 'NORMAL - Dentro dos limites'
  }
  
  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Uso de Cache Supabase
            </div>
            {getStatusIcon()}
          </CardTitle>
          <CardDescription>
            {getStatusText()} • Atualizado {format(new Date(cacheData.lastUpdated), 'HH:mm', { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uso Atual</span>
              <span className="font-medium">
                {cacheData.currentUsageGB.toFixed(2)}GB / {cacheData.limitGB}GB
              </span>
            </div>
            <Progress 
              value={usagePercentage} 
              className="h-3"
            />
            <div className="text-xs text-muted-foreground">
              {usagePercentage.toFixed(1)}% do limite utilizado
            </div>
          </div>
          
          {isNearLimit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Atenção!</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Você está usando {usagePercentage.toFixed(1)}% do limite de cache. 
                Considere implementar otimizações para reduzir o consumo.
              </p>
            </div>
          )}
          
          {isCritical && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Crítico!</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Você excedeu 80% do limite de cache. Implemente medidas emergenciais:
                <br />• Reduza tamanho de imagens para 400px máximo
                <br />• Ative compressão em Edge Functions
                <br />• Implemente cache client-side agressivo
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico Diário</CardTitle>
          <CardDescription>Consumo de cache nos últimos dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cacheData.dailyUsage.slice(0, 7).map((day, index) => {
              const dayPercentage = (day.usageGB / cacheData.limitGB) * 100
              const isHighUsage = dayPercentage >= 60
              
              return (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm text-muted-foreground w-20">
                      {format(new Date(day.date), 'dd/MM', { locale: ptBR })}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                      <div 
                        className={`h-2 rounded-full ${
                          dayPercentage >= 80 ? 'bg-red-500' :
                          dayPercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, dayPercentage)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      isHighUsage ? 'text-orange-600' : 'text-muted-foreground'
                    }`}>
                      {day.usageGB.toFixed(1)}GB
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recomendações de Otimização</CardTitle>
          <CardDescription>Ações para reduzir o consumo de cache</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Reduzir tamanho de imagens</p>
                <p className="text-xs text-muted-foreground">
                  Use maxWidth=400px em todas as chamadas de foto para reduzir até 60% do tráfego
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Implementar cache client-side</p>
                <p className="text-xs text-muted-foreground">
                  Use sessionStorage para fotos e dados de locais com TTL de 24h
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Otimizar queries do banco</p>
                <p className="text-xs text-muted-foreground">
                  Selecione apenas colunas necessárias, evite SELECT *
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm font-medium">Configurar cache em Edge Functions</p>
                <p className="text-xs text-muted-foreground">
                  Adicione Cache-Control headers para reduzir requisições repetidas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}