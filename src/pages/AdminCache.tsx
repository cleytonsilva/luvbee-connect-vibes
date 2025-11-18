import React from 'react';
import { CacheMonitorDashboard } from '@/components/admin/CacheMonitorDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, BarChart3 } from 'lucide-react';

export default function AdminCachePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Administração do Cache
              </h1>
              <p className="text-muted-foreground">
                Monitoramento e gerenciamento do sistema de cache de imagens
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sistema</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Cache de Imagens</div>
              <p className="text-xs text-muted-foreground">
                Armazenamento de fotos do Google Places
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tecnologia</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Supabase</div>
              <p className="text-xs text-muted-foreground">
                Storage + PostgreSQL + Edge Functions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ativo</div>
              <p className="text-xs text-muted-foreground">
                Monitoramento em tempo real
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cache Monitor Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Monitoramento do Cache</CardTitle>
            <CardDescription>
              Visualização em tempo real das métricas e performance do sistema de cache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CacheMonitorDashboard />
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Documentação do Sistema</CardTitle>
            <CardDescription>
              Informações sobre o funcionamento do cache de imagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Como funciona:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Imagens são baixadas do Google Places API</li>
                  <li>• Armazenadas no bucket "div" do Supabase</li>
                  <li>• Referências salvas na tabela cached_place_photos</li>
                  <li>• Próximas requisições usam o cache local</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Benefícios:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Reduz custos com Google Places API</li>
                  <li>• Melhora performance de carregamento</li>
                  <li>• Menos dependência de APIs externas</li>
                  <li>• Maior disponibilidade das imagens</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Componentes do Sistema:</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edge Function:</span>
                  <span className="font-mono text-xs">cache-place-photo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Bucket:</span>
                  <span className="font-mono text-xs">div</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tabela:</span>
                  <span className="font-mono text-xs">cached_place_photos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Função SQL:</span>
                  <span className="font-mono text-xs">get_cached_photo_url</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}