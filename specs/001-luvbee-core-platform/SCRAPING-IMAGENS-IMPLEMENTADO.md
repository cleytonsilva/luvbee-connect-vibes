# 🖼️ Sistema de Scraping de Imagens dos Locais

**Data**: 2025-01-27  
**Status**: Implementado ✅

## 🎯 Objetivo

Implementar sistema de scraping/web scraping para buscar fotos reais dos locais de múltiplas fontes e salvá-las no bucket do Supabase Storage.

## ✅ Funcionalidades Implementadas

### 1. LocationImageScraper Service
- ✅ Busca fotos do Google Places API
- ✅ Busca fotos do Unsplash (fallback)
- ✅ Processa e salva imagens no Supabase Storage
- ✅ Processa todos os locais sem foto em lote

### 2. Hooks React
- ✅ `useProcessLocationImages` - Processar um local específico
- ✅ `useProcessAllLocationImages` - Processar todos os locais

### 3. Integração Automática
- ✅ Processamento automático em background quando locais são carregados
- ✅ Verifica se já tem imagem antes de processar (evita duplicação)

## 📦 Arquivos Criados

1. **`src/services/location-image-scraper.service.ts`**
   - Serviço principal de scraping
   - Busca múltiplas fontes (Google Places, Unsplash)
   - Salva no Supabase Storage

2. **`src/hooks/useProcessLocationImages.ts`**
   - Hooks React para processar imagens
   - Integração com React Query

3. **`scripts/process-location-images.ts`**
   - Script para processar todos os locais
   - Pode ser executado manualmente

## 🔄 Fluxo de Funcionamento

### Processamento Automático
```
Usuário carrega locais
  ↓
LocationService.getNearbyLocations()
  ↓
processLocationImagesInBackground()
  ↓
LocationImageScraper.processAndSaveLocationImages()
  ↓
Busca fotos de múltiplas fontes
  ↓
Salva no Supabase Storage
  ↓
Atualiza campo image_url na tabela locations
```

### Processamento Manual
```typescript
// Processar um local específico
const processMutation = useProcessLocationImages()
processMutation.mutate(locationId)

// Processar todos os locais sem foto
const processAllMutation = useProcessAllLocationImages()
processAllMutation.mutate()
```

## 🎨 Fontes de Imagens

### 1. Google Places API (Prioritário)
- Usa `place_id` do local
- Busca fotos oficiais do Google Places
- Melhor qualidade e relevância

### 2. Unsplash (Fallback)
- Busca por nome do local + tipo
- Requer `VITE_UNSPLASH_ACCESS_KEY` (opcional)
- Usado quando Google Places não tem fotos

### 3. Instagram (Planejado)
- Não implementado (Instagram não tem API pública fácil)
- Pode ser adicionado com serviços de scraping especializados

## 📊 Processamento em Lote

O serviço processa locais em lotes de 5 para não sobrecarregar APIs:
- Aguarda 1 segundo entre lotes
- Processa apenas locais sem imagem salva
- Ignora erros individuais (continua processando)

## 🔧 Configuração

### Variáveis de Ambiente
```env
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-places
VITE_UNSPLASH_ACCESS_KEY=sua-chave-unsplash (opcional)
```

### Bucket Supabase Storage
- **Nome**: `locations`
- **Público**: Sim
- **Estrutura**: `{location-id}/{hash}-{timestamp}.jpg`

## 🚀 Como Usar

### Processar um Local Específico
```typescript
import { useProcessLocationImages } from '@/hooks/useProcessLocationImages'

const processMutation = useProcessLocationImages()
processMutation.mutate('location-id')
```

### Processar Todos os Locais
```typescript
import { useProcessAllLocationImages } from '@/hooks/useProcessLocationImages'

const processAllMutation = useProcessAllLocationImages()
processAllMutation.mutate()
```

### Via Script
```bash
npm run process-images
# ou
tsx scripts/process-location-images.ts
```

## 📝 Notas Técnicas

- ✅ Verifica se imagem já existe antes de processar
- ✅ Prioriza Google Places sobre outras fontes
- ✅ Processa em background sem bloquear UI
- ✅ Tratamento robusto de erros
- ✅ Suporta múltiplas fontes de imagens

## 🎉 Resultado

Todos os locais terão fotos reais salvas no Supabase Storage, melhorando significativamente a experiência visual da plataforma!

