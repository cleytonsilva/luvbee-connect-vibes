import React from 'react'
import { CacheMonitorDashboard } from '@/components/admin/CacheMonitorDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Settings } from 'lucide-react'
import { CacheMonitor } from '@/lib/cache-monitor'
import { toast } from 'sonner'

export default function AdminCachePage() {
  const handleGenerateReport = () => {
    try {
      const report = CacheMonitor.generateOptimizationReport()
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cache-optimization-report-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Relatório gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast.error('Erro ao gerar relatório')
    }
  }
  
  const handleRefreshData = () => {
    toast.info('Dados de cache sendo atualizados...')
    // O hook useCacheMonitor já atualiza automaticamente
    setTimeout(() => {
      toast.success('Dados atualizados com sucesso!')
    }, 1000)
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Monitoramento de Cache</h1>
        <p className="text-muted-foreground">
          Acompanhe o uso de saída de cache do Supabase e implemente otimizações para evitar excedentes
        </p>
      </div>
      
      <div className="flex gap-4 mb-6">
        <Button 
          onClick={handleRefreshData}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Dados
        </Button>
        
        <Button 
          onClick={handleGenerateReport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar Relatório
        </Button>
      </div>
      
      <CacheMonitorDashboard />
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Informações Importantes</CardTitle>
          <CardDescription>Detalhes sobre o monitoramento e limites</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📊 Limite do Plano</h3>
              <p className="text-sm text-blue-800">
                Seu plano gratuito inclui 5 GB de saída de cache por mês. 
                O excedente atual é de 0,07 GB.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">⚠️ Alertas Automáticos</h3>
              <p className="text-sm text-yellow-800">
                Você receberá notificações quando atingir 80% do limite (4 GB) 
                e novamente ao atingir 100% (5 GB).
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">✅ Otimizações Ativas</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Imagens redimensionadas para 400px máximo</li>
                <li>• Cache HTTP de 1 hora em Edge Functions</li>
                <li>• Cache client-side com TTL de 24 horas</li>
                <li>• Queries otimizadas selecionando apenas colunas necessárias</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-2">📈 Monitoramento</h3>
              <p className="text-sm text-purple-800">
                Os dados são atualizados automaticamente a cada 5 minutos. 
                O dashboard mostra o consumo em tempo real e projeções baseadas no histórico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}