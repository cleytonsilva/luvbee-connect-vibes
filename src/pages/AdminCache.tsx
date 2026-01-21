import React from 'react';
import { CacheMonitorDashboard } from '@/components/admin/CacheMonitorDashboard';
import { VenueInsertionForm } from '@/components/admin/VenueInsertionForm';
import { SpiderEventsTest } from '@/components/admin/SpiderEventsTest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, BarChart3, Plus, MapPin, Bug } from 'lucide-react';

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
                Administração do Sistema Híbrido
              </h1>
              <p className="text-muted-foreground">
                Gerenciamento do sistema de busca híbrida com cache inteligente e inserção manual
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
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Busca Híbrida</div>
              <p className="text-xs text-muted-foreground">
                Local database + Google API com cache inteligente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inserção</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manual</div>
              <p className="text-xs text-muted-foreground">
                Adicione locais manualmente ao banco
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Inteligente</div>
              <p className="text-xs text-muted-foreground">
                Evita chamadas redundantes à API
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Venue Insertion Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <CardTitle>Inserção Manual de Locais</CardTitle>
            </div>
            <CardDescription>
              Adicione novos locais ao banco de dados para expandir a cobertura do sistema híbrido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VenueInsertionForm />
          </CardContent>
        </Card>

        {/* Spider Events Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              <CardTitle>Teste do Sistema de Eventos</CardTitle>
            </div>
            <CardDescription>
              Teste e monitoramento do robô de scraping de eventos (Sympla, Eventbrite, Ingresse, Shotgun)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpiderEventsTest />
          </CardContent>
        </Card>

        {/* Cache Monitor Dashboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Monitoramento do Cache</CardTitle>
            </div>
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
                <h4 className="font-semibold">Sistema Híbrido de Busca:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Busca local prioritária (tabela locations)</li>
                  <li>• Cache inteligente com Google Places API</li>
                  <li>• Fallback manual por cidade/estado</li>
                  <li>• Modos Normal e Solo (Adulto)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Benefícios:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Reduz custos com Google Places API</li>
                  <li>• Funciona offline/GPS desativado</li>
                  <li>• Performance superior com cache local</li>
                  <li>• Conteúdo adulto filtrado por modo</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Componentes do Sistema:</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edge Function:</span>
                  <span className="font-mono text-xs">fetch-places-google</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tabela Principal:</span>
                  <span className="font-mono text-xs">locations</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tabela de Cache:</span>
                  <span className="font-mono text-xs">search_cache_logs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Função RPC:</span>
                  <span className="font-mono text-xs">get_places_nearby</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hook Frontend:</span>
                  <span className="font-mono text-xs">useVibePlaces</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}