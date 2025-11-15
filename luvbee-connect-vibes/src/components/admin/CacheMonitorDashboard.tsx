import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Database, 
  Clock, 
  HardDrive, 
  RefreshCw, 
  Download,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { cacheMonitor, type CacheMetrics, type CacheHealthStatus } from '@/lib/cache-monitor';

export function CacheMonitorDashboard() {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [health, setHealth] = useState<CacheHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, healthData] = await Promise.all([
        cacheMonitor.getMetrics(),
        cacheMonitor.getHealthStatus()
      ]);
      setMetrics(metricsData);
      setHealth(healthData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading cache metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    try {
      const cleanedCount = await cacheMonitor.cleanup(30);
      alert(`Limpeza concluída! ${cleanedCount} entradas antigas removidas.`);
      loadData(); // Reload metrics
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('Erro durante a limpeza. Verifique o console para detalhes.');
    }
  };

  const handleExport = () => {
    const logs = cacheMonitor.exportLogs('csv');
    const blob = new Blob([logs], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Saudável</Badge>;
      case 'degraded': return <Badge className="bg-yellow-100 text-yellow-800">Degradado</Badge>;
      case 'unhealthy': return <Badge className="bg-red-100 text-red-800">Não Saudável</Badge>;
      default: return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Carregando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(health?.status)}`} />
            Status do Cache
          </CardTitle>
          <CardDescription>
            {lastUpdate && `Última atualização: ${lastUpdate.toLocaleTimeString('pt-BR')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {getStatusBadge(health?.status)}
            <Button onClick={loadData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          
          {health?.issues && health.issues.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotos em Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCachedPhotos || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total de imagens armazenadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cacheHitRate.toFixed(1) || 0}%</div>
            <Progress value={metrics?.cacheHitRate || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.cacheHitRate >= 80 ? 'Excelente' : metrics?.cacheHitRate >= 50 ? 'Boa' : 'Precisa melhorar'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageResponseTime.toFixed(0) || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              Tempo de resposta médio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.storageUsed / 1024 / 1024 || 0).toFixed(1)}MB
            </div>
            <p className="text-xs text-muted-foreground">
              Espaço utilizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações de Manutenção</CardTitle>
          <CardDescription>
            Ferramentas para gerenciar e manter o cache de imagens
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleCleanup} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar Cache Antigo
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics?.cacheHitRate && metrics.cacheHitRate < 50 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  A taxa de acerto está baixa. Considere pré-carregar imagens populares.
                </p>
              </div>
            )}
            
            {metrics?.averageResponseTime && metrics.averageResponseTime > 2000 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  O tempo de resposta está alto. Verifique a conectividade com o Supabase.
                </p>
              </div>
            )}
            
            {metrics?.storageUsed && metrics.storageUsed > 50 * 1024 * 1024 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Armazenamento acima de 50MB. Execute limpeza regularmente.
                </p>
              </div>
            )}
            
            {(!metrics || (metrics.cacheHitRate >= 50 && metrics.averageResponseTime <= 2000 && metrics.storageUsed <= 50 * 1024 * 1024)) && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm text-green-700">
                  O sistema de cache está funcionando corretamente!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}