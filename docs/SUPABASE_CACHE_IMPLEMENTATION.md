# 📋 Documentação Completa - Sistema de Cache Supabase para Imagens Google Places

## 🎯 Visão Geral

Este documento descreve a implementação completa do sistema de cache de imagens do Google Places usando Supabase, incluindo Edge Functions, Storage, banco de dados e monitoramento.

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Aplicação     │    │   Supabase       │    │  Google Places  │
│   React/TypeScript│    │   Platform       │    │   API           │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Verifica Cache      │                       │
         ├──────────────────────▶│                       │
         │                       │                       │
         │ 2. Cache Hit/Miss     │                       │
         │◀──────────────────────┤                       │
         │                       │                       │
         │ 3. Chama Edge Function│                       │
         ├──────────────────────▶│                       │
         │                       │                       │
         │                       │ 4. Busca Imagem       │
         │                       ├──────────────────────▶│
         │                       │                       │
         │                       │ 5. Retorna Imagem     │
         │                       │◀──────────────────────┤
         │                       │                       │
         │                       │ 6. Armazena no Cache  │
         │                       │ (Storage + DB)      │
         │                       │                       │
         │ 7. Retorna URL        │◀──────────────────────┤
         │◀──────────────────────┤                       │
```

## 📁 Estrutura de Arquivos

### Backend (Supabase)
```
supabase/
├── functions/
│   └── cache-place-photo/          # Edge Function principal
│       └── index.ts               # Download e upload de imagens
├── migrations/
│   └── 20250112000000_create_div_bucket_and_cached_photos.sql
└── config.toml                    # Configurações do Supabase
```

### Frontend
```
src/
├── hooks/
│   └── usePlacePhoto.ts           # Hook atualizado com cache
├── services/
│   └── location-image-scraper.service.ts  # Scraper interno
├── lib/
│   ├── cache-monitor.ts           # Sistema de monitoramento
│   └── migration-manager.ts       # Gerenciamento de migrações
├── components/
│   └── admin/
│       └── CacheMonitorDashboard.tsx  # Dashboard de monitoramento
├── pages/
│   └── AdminCache.tsx             # Página de administração
└── __tests__/
    └── manual-cache-test.js       # Testes de integração
```

## 🔧 Configuração e Instalação

### 1. Pré-requisitos
```bash
# Node.js (v18+)
node --version

# Supabase CLI
npm install -g supabase

# Dependências do projeto
npm install @supabase/supabase-js
```

### 2. Variáveis de Ambiente
Crie o arquivo `.env.local`:
```env
# Google Maps
VITE_GOOGLE_MAPS_API_KEY=sua-chave-aqui

# Supabase
VITE_SUPABASE_URL=https://zgxtcawgllsnnernlgim.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ambiente
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
```

### 3. Deploy da Edge Function
```bash
# Deploy da função de cache
npx supabase functions deploy cache-place-photo --project-ref zgxtcawgllsnnernlgim
```

## 🚀 Componentes Implementados

### 1. Edge Function - `cache-place-photo`
**Arquivo:** `supabase/functions/cache-place-photo/index.ts`

**Funcionalidades:**
- Download de imagens do Google Places API v1 e v2
- Upload para bucket Supabase Storage
- Armazenamento de metadados no PostgreSQL
- Suporte a OAuth e fallback para API clássica
- Tratamento de erros e logging

**Parâmetros de Entrada:**
```typescript
{
  placeId: string;           // ID do local no Google Places
  photoReference: string;     // Referência da foto
  maxWidth?: number;         // Largura máxima (opcional)
  maxHeight?: number;        // Altura máxima (opcional)
}
```

**Resposta:**
```typescript
{
  success: boolean;
  data?: {
    publicUrl: string;        // URL pública da imagem
    storagePath: string;      // Caminho no storage
    cachedAt: string;         // Timestamp do cache
  };
  error?: string;            // Mensagem de erro (se houver)
}
```

### 2. Hook Atualizado - `usePlacePhoto`
**Arquivo:** `src/hooks/usePlacePhoto.ts`

**Fluxo de Operação:**
1. Verifica se a imagem existe no cache Supabase
2. Se existir, retorna a URL do cache imediatamente
3. Se não existir, chama a Edge Function para criar o cache
4. Retorna a URL do cache após criação

**Estados:**
- `loading`: Carregando imagem
- `photoUrl`: URL da imagem (do cache ou Google)
- `error`: Erro se houver
- `cached`: Indica se veio do cache

### 3. Sistema de Monitoramento
**Arquivo:** `src/lib/cache-monitor.ts`

**Métricas Monitoradas:**
- Total de fotos em cache
- Taxa de acerto do cache (hit rate)
- Tempo médio de resposta
- Uso de armazenamento
- Logs de eventos (hit, miss, store, error)

**Funcionalidades:**
- Coleta automática de métricas
- Exportação de logs (JSON/CSV)
- Limpeza automática de cache antigo
- Health check do sistema

### 4. Dashboard de Administração
**Arquivo:** `src/components/admin/CacheMonitorDashboard.tsx`

**Recursos Visuais:**
- Cards de métricas em tempo real
- Gráfico de taxa de acerto
- Alertas de performance
- Botões de ação (limpeza, exportação)
- Status de saúde do sistema

## 📊 Banco de Dados

### Tabela `cached_place_photos`
```sql
CREATE TABLE public.cached_place_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    place_id TEXT NOT NULL,
    photo_reference TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT unique_place_photo UNIQUE(place_id, photo_reference)
);
```

### Índices
```sql
-- Índice para busca rápida por place_id
CREATE INDEX idx_cached_place_photos_place_id ON public.cached_place_photos(place_id);

-- Índice para busca por photo_reference
CREATE INDEX idx_cached_place_photos_photo_reference ON public.cached_place_photos(photo_reference);

-- Índice para limpeza de cache expirado
CREATE INDEX idx_cached_place_photos_expires_at ON public.cached_place_photos(expires_at);
```

### Função SQL
```sql
CREATE OR REPLACE FUNCTION public.get_cached_photo_url(place_id_param TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT public_url 
        FROM public.cached_place_photos 
        WHERE place_id = place_id_param 
        AND expires_at > NOW()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔒 Segurança e Permissões

### Row Level Security (RLS)
```sql
-- Permissões para leitura pública
ALTER TABLE public.cached_place_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública" ON public.cached_place_photos
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção autenticada" ON public.cached_place_photos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Conceder permissões
GRANT SELECT ON public.cached_place_photos TO anon;
GRANT ALL ON public.cached_place_photos TO authenticated;
```

### Bucket Storage
```sql
-- Criar bucket público para imagens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('div', 'div', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Políticas de acesso ao bucket
CREATE POLICY "Acesso público de leitura" ON storage.objects
    FOR SELECT USING (bucket_id = 'div');

CREATE POLICY "Inserção autenticada" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'div' AND auth.role() = 'authenticated');

CREATE POLICY "Atualização autenticada" ON storage.objects
    FOR UPDATE USING (bucket_id = 'div' AND auth.role() = 'authenticated');
```

## 🧪 Testes e Validação

### Teste Manual de Integração
```bash
# Executar teste completo
node src/__tests__/manual-cache-test.js
```

**Resultados esperados:**
```
✅ Bucket "div" is accessible
✅ Table cached_place_photos is accessible
✅ Function get_cached_photo_url exists
```

### Testes Unitários
```bash
# Executar testes de componentes
npm test src/hooks/__tests__/usePlacePhoto.test.ts

# Executar testes de serviços
npm test src/services/__tests__/location.service.test.ts
```

## 📈 Performance e Otimização

### Métricas de Performance
- **Tempo de resposta do cache**: < 200ms
- **Taxa de acerto ideal**: > 80%
- **Limite de storage**: 100MB (configurável)
- **Tempo de expiração**: 90 dias (configurável)

### Otimizações Implementadas
1. **Índices de banco de dados** para queries rápidas
2. **Cache em memória** no cliente para imagens frequentes
3. **Lazy loading** de imagens
4. **Compressão automática** no upload
5. **Limpeza automática** de cache expirado

## 🔧 Manutenção e Operação

### Dashboard de Monitoramento
Acesse: `/dashboard/admin/cache`

**Funcionalidades disponíveis:**
- Visualização de métricas em tempo real
- Exportação de logs de eventos
- Limpeza manual de cache antigo
- Configuração de parâmetros
- Health check do sistema

### Rotinas de Manutenção

#### Limpeza Automática
```typescript
// Executar limpeza de cache antigo (30+ dias)
await cacheMonitor.cleanup(30);
```

#### Exportação de Logs
```typescript
// Exportar logs em CSV para análise
const csvLogs = cacheMonitor.exportLogs('csv');
```

#### Verificação de Saúde
```typescript
// Verificar status do sistema
const health = await cacheMonitor.getHealthStatus();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Edge Function Retorna 404
**Causa:** Função não deployada ou URL incorreta
**Solução:** 
```bash
npx supabase functions deploy cache-place-photo --project-ref zgxtcawgllsnnernlgim
```

#### 2. Permissões Negadas no Banco
**Causa:** RLS não configurado corretamente
**Solução:**
```sql
-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated');
```

#### 3. Bucket Não Encontrado
**Causa:** Bucket não criado ou nome incorreto
**Solução:**
```sql
-- Verificar buckets existentes
SELECT * FROM storage.buckets WHERE id = 'div';
```

#### 4. Imagens Não Carregando
**Causa:** Problemas com CORS ou permissões
**Solução:** Verificar políticas de CORS no Supabase Dashboard

### Logs e Debugging

#### Logs da Edge Function
```bash
# Ver logs no Supabase Dashboard
https://supabase.com/dashboard/project/zgxtcawgllsnnernlgim/functions/cache-place-photo
```

#### Logs do Cliente
```typescript
// Ativar debug mode
if (import.meta.env.DEV) {
  console.log('Cache Debug:', {
    placeId,
    photoReference,
    cached: result.cached,
    url: result.url
  });
}
```

## 📚 Referências e Links

### Documentação Oficial
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview)

### Códigos Fonte
- [Edge Function](./supabase/functions/cache-place-photo/index.ts)
- [Hook usePlacePhoto](./src/hooks/usePlacePhoto.ts)
- [Cache Monitor](./src/lib/cache-monitor.ts)
- [Dashboard Admin](./src/components/admin/CacheMonitorDashboard.tsx)

### Dashboards
- [Supabase Dashboard](https://supabase.com/dashboard/project/zgxtcawgllsnnernlgim)
- [Cache Monitor Admin](https://seu-dominio.com/dashboard/admin/cache)

## 🤝 Contribuição e Manutenção

### Equipe Responsável
- **Desenvolvimento**: [Seu Nome]
- **Infraestrutura**: [Nome da Equipe]
- **Monitoramento**: [Nome da Equipe]

### Próximos Passos
1. [ ] Implementar cache distribuído para múltiplas regiões
2. [ ] Adicionar suporte para vídeos e outros mídias
3. [ ] Criar API REST para gerenciamento externo
4. [ ] Implementar machine learning para pre-cache
5. [ ] Adicionar integração com CDN global

---

**Última Atualização:** 12 de janeiro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ Produção