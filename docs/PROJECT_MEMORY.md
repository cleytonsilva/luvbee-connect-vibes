
---
---
---

# 🗺️ Sistema de Geolocalização Robusta - LuvBee Connect Vibes

## 📋 Visão Geral

Este documento descreve o sistema de geolocalização implementado no LuvBee Connect Vibes, que oferece uma solução robusta e confiável para obtenção de localização do usuário, com múltiplos mecanismos de fallback e tratamento de erros avançado.

## 🎯 Objetivos

- **Confiabilidade Máxima**: Funcionar em 99% dos cenários
- **Fallback Inteligente**: GPS → IP → Localização Padrão
- **Performance Otimizada**: Respostas rápidas com timeout configurável
- **UX Superior**: Feedback claro sobre a fonte da localização
- **Resiliência**: Tratamento robusto de erros e falhas

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    VibeLocalPage.tsx                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            GeolocationService                       │    │
│  │  ┌─────────────┬─────────────┬────────────────┐   │    │
│  │  │     GPS     │     IP      │   Padrão       │   │    │
│  │  │  (Alta)     │  (Média)    │  (Baixa)       │   │    │
│  │  │ Precisão    │ Precisão    │ Precisão      │   │    │
│  │  └─────────────┴─────────────┴────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              useVibePlaces Hook                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Sistema Híbrido de Busca                  │    │
│  │  ┌──────────────┬──────────────────────────────┐ │    │
│  │  │   Cache      │   Edge Function (Google)     │ │    │
│  │  │   Local      │   Places API (Fallback)      │ │    │
│  │  │  (Primário)  │   (Secundário)               │ │    │
│  │  └──────────────┴──────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   ├── geolocation.service.ts          # Serviço principal de geolocalização
│   ├── google-maps-loader-compat.service.ts  # Google Maps API tradicional
│   └── google-places.service.ts        # Serviço de Places API
├── hooks/
│   └── useVibePlaces.ts               # Hook híbrido de busca de lugares
├── pages/
│   └── VibeLocalPage.tsx              # Página principal com geolocalização
└── components/
    └── location/
        ├── PlaceSearch.tsx            # Componente de busca de lugares
        └── VibeMatchCard.tsx          # Card Neo-Brutalist para lugares

supabase/
└── functions/
    └── fetch-places-google/           # Edge Function com paginação e deduplicação
```

## 🔧 Implementação Detalhada

### 1. GeolocationService (`src/services/geolocation.service.ts`)

Serviço principal que gerencia a obtenção de localização com múltiplos fallbacks.

#### Características:
- **Timeout configurável**: Padrão de 10 segundos
- **Multiplos serviços IP**: 3 serviços diferentes para máxima confiabilidade
- **Validação de coordenadas**: Verifica limites geográficos válidos
- **Fallback hierárquico**: GPS → IP → Localização padrão (São Paulo)

#### Interface:

```typescript
interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number    // Precisão em metros
  timestamp: number   // Timestamp Unix
}

interface GeoLocationOptions {
  timeout?: number           // milliseconds (default: 10000)
  maximumAge?: number        // milliseconds (default: 60000)
  enableHighAccuracy?: boolean // default: true
  fallbackToIP?: boolean     // default: true
}
```

#### Métodos Principais:

```typescript
// Método principal - obtém localização com fallback automático
static async getCurrentLocation(options?: GeoLocationOptions): Promise<GeoLocation>

// Verifica suporte do navegador
static isGeolocationSupported(): boolean

// Solicita permissão (navegadores modernos)
static async requestPermission(): Promise<PermissionState | null>
```

### 2. GoogleMapsLoaderCompat (`src/services/google-maps-loader-compat.service.ts`)

Versão compatível da API do Google Maps usando a interface tradicional.

#### Problema Resolvido:
- **Erro `importLibrary`**: API `importLibrary` não disponível em versões antigas
- **Compatibilidade**: Funciona com todos os navegadores modernos
- **Performance**: Carregamento otimizado com callback único

#### Métodos Disponíveis:

```typescript
// Carrega Google Maps com bibliotecas tradicionais
static async load(): Promise<void>

// Verifica se está carregado
static isGoogleMapsLoaded(): boolean

// Cria serviço Places
static createPlacesService(): google.maps.places.PlacesService | null

// Cria autocomplete
static createAutocomplete(input: HTMLInputElement, options?: AutocompleteOptions): google.maps.places.Autocomplete | null

// Busca lugares próximos
static async nearbySearch(request: PlaceSearchRequest): Promise<PlaceResult[]>

// Obtém detalhes de lugar
static async getPlaceDetails(request: PlaceDetailsRequest): Promise<PlaceResult | null>
```

### 4. fetch-places-google Edge Function (`supabase/functions/fetch-places-google/index.ts`)

Edge Function avançada que implementa busca com paginação e deduplicação na Google Places API.

#### Características:
- **Paginação inteligente**: Até 3 páginas (60 lugares) por tipo
- **Deduplicação automática**: Remove duplicatas por `place_id`
- **Cache híbrido**: Salva em tabelas `venues` e `locations`
- **Múltiplos tipos**: Suporte para `bar`, `night_club`, `restaurant`
- **Formato minimalista**: Retorna apenas dados essenciais para cards

#### Interface de Retorno:

```typescript
interface MinimalPlaceCard {
  place_id: string
  name: string
  lat: number
  lng: number
  photo_url?: string
  rating?: number
  price_level?: number
  types: string[]
  vicinity?: string
}

interface FetchPlacesResponse {
  success: boolean
  data: MinimalPlaceCard[]
  pagination: {
    total_pages: number
    total_results: number
    has_more: boolean
  }
  deduplication: {
    processed: number
    unique: number
    duplicates_removed: number
  }
}
```

#### Métodos Principais:

```typescript
// Função principal com paginação e deduplicação
async function fetchPlacesWithPagination(
  lat: number, 
  lng: number, 
  radius: number, 
  type: string, 
  apiKey: string, 
  seenPlaceIds: Set<string>
): Promise<MinimalPlaceCard[]>

// Processa múltiplos tipos em paralelo
async function processMultipleTypes(
  lat: number,
  lng: number,
  radius: number,
  types: string[],
  apiKey: string
): Promise<MinimalPlaceCard[]>

// Salva resultados no cache híbrido
async function saveToHybridCache(
  places: MinimalPlaceCard[],
  supabase: SupabaseClient
): Promise<void>
```

### 5. VibeMatchCard Component (`src/components/location/VibeMatchCard.tsx`)

Componente Neo-Brutalist para exibição de lugares com estilo moderno e ousado.

#### Características:
- **Design Neo-Brutalist**: Bordas grossas, sombras duras, tipografia ousada
- **Layout vertical**: 80% da altura da viewport
- **Fonte Space Grotesk**: Tipografia moderna e geométrica
- **Cálculo de distância**: Fórmula Haversine para distâncias reais
- **Ações de like/dislike**: Botões com estilo brutalista
- **Responsivo**: Adaptável a diferentes tamanhos de tela

#### Estilos Neo-Brutalist:

```css
.neo-brutalist-card {
  @apply border-4 border-black shadow-hard-lg bg-white;
}

.neo-brutalist-button {
  @apply border-3 border-black shadow-hard bg-white hover:bg-black hover:text-white;
}

.neo-brutalist-title {
  @apply font-space-grotesk font-black text-2xl uppercase tracking-tight;
}
```

#### Interface:

```typescript
interface VibeMatchCardProps {
  place: MinimalPlaceCard
  userLocation?: { lat: number; lng: number }
  onLike?: (place: MinimalPlaceCard) => void
  onDislike?: (place: MinimalPlaceCard) => void
  onPhotoClick?: (place: MinimalPlaceCard) => void
}
```

#### Métodos Principais:

```typescript
// Calcula distância usando fórmula Haversine
const calculateDistance = (): string | null

// Constrói URL da foto do Google Places
const getPhotoUrl = (photoReference: string): string

// Manipula ações de like/dislike
const handleLike = () => void
const handleDislike = () => void
```

### 3. useVibePlaces Hook (`src/hooks/useVibePlaces.ts`)

Hook React que implementa o sistema híbrido de busca de lugares.

#### Características:
- **Cache inteligente**: 30 dias de validade com verificação automática
- **Busca não-bloqueante**: Edge Function executa em background
- **Proteção contra loop**: Deep comparison e debounce de 500ms
- **Controle de chamadas**: Previne múltiplas requisições simultâneas
- **Nova integração**: Utiliza `fetch-places-google` com paginação e deduplicação

#### Interface:

```typescript
interface UseVibePlacesProps {
  userLocation?: { lat: number; lng: number } | null
  manualCity?: string | null
  manualState?: string | null
  mode?: 'normal' | 'solo'
  radius?: number              // metros (default: 5000)
  maxCacheAge?: number         // dias (default: 30)
}

interface UseVibePlacesReturn {
  places: Location[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  cacheStatus: 'valid' | 'expired' | 'none'
}
```

## 🔄 Fluxo de Funcionamento

### 1. Obtenção de Localização

```
Usuário acessa /vibe-local
         ↓
VibeLocalPage.requestLocation()
         ↓
GeolocationService.getCurrentLocation()
         ↓
┌─────────────────────────────────────┐
│        Tentativa GPS (15s)          │
│  - High accuracy: true              │
│  - Timeout: 15000ms                 │
│  - Maximum age: 60000ms              │
└─────────────────────────────────────┘
         ↓
    Sucesso? ───┐
         ↓      ↓ Não
         ↓  ┌─────────────────────────────────────┐
         │  │      Fallback IP Services          │
         │  │  - ipapi.co (timeout: 5s)         │
         │  │  - ipwho.is (timeout: 5s)         │
         │  │  - freeipapi.com (timeout: 5s)  │
         │  └─────────────────────────────────────┘
         ↓      ↓
         │  ┌─────────────────────────────────────┐
         │  │    Localização Padrão             │
         │  │  - São Paulo: -23.5505, -46.6333  │
         │  │  - Accuracy: 100km                │
         │  └─────────────────────────────────────┘
         ↓
    Latitude/Longitude Definidos
```

### 2. Busca de Lugares (Sistema Híbrido)

```
useVibePlaces executa
         ↓
Verifica Cache Local (30 dias)
         ↓
┌─────────────────────────────────────┐
│         Cache Válido?              │
└─────────────────────────────────────┘
         ↓
    Sim? ───┐
         ↓   ↓ Não
         ↓   ┌─────────────────────────────────────┐
         │   │    Dispara Edge Function             │
         │   │  (Background, não bloqueante)       │
         │   │  - fetch-places-google (NOVO)       │
         │   │  - Paginação até 60 lugares/tipo    │
         │   │  - Deduplicação automática          │
         │   │  - Cache híbrido (venues+locations) │
         │   └─────────────────────────────────────┘
         ↓   │
         │   ▼
         │  ┌─────────────────────────────────────┐
         │  │   Busca Local (RPC Functions)      │
         │  │  - get_places_nearby                 │
         │  │  - get_places_by_city_state         │
         │  │  - Haversine formula                │
         │  └─────────────────────────────────────┘
         ↓
    Resultados para o Usuário
```

## 📊 Precisão das Fontes de Localização

| Fonte | Precisão | Tempo | Confiabilidade | Caso de Uso |
|-------|----------|--------|----------------|-------------|
| **GPS** | 5-50m | 2-15s | Alta | Ideal para buscas locais precisas |
| **IP** | 5-50km | 1-3s | Média | Fallback quando GPS falha |
| **Padrão** | 100km | Instantâneo | Alta | Último recurso, garante funcionamento |

## 🛡️ Tratamento de Erros

### Códigos de Erro Mapeados

| Código | Descrição | Mensagem ao Usuário | Ação |
|--------|-----------|---------------------|------|
| **1** | Permissão Negada | "Permissão de localização negada. Por favor, permita o acesso..." | Mostra input manual |
| **2** | Posição Indisponível | "Localização não disponível. Verifique se o GPS está ativado..." | Fallback para IP |
| **3** | Timeout | "Tempo esgotado ao obter localização. Verifique sua conexão..." | Fallback para IP |
| **4** | Coordenadas Inválidas | "Coordenadas inválidas recebidas" | Usa localização padrão |

### Estratégias de Fallback

1. **GPS Falha** → Tenta IP automaticamente
2. **IP Falha** → Usa São Paulo como padrão
3. **Todos Falham** → Sistema continua funcionando com busca manual

## 🔧 Configuração e Uso

### 1. Configuração de Variáveis de Ambiente

```bash
# Google Maps API (obrigatório)
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui

# Supabase (já configurado)
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

### 2. Uso Básico

```typescript
// Obter localização (com fallback automático)
import { GeolocationService } from '@/services/geolocation.service'

const location = await GeolocationService.getCurrentLocation({
  timeout: 15000,        // 15 segundos
  enableHighAccuracy: true,
  fallbackToIP: true     // Ativa fallback automático
})

console.log(`Localização: ${location.latitude}, ${location.longitude}`)
console.log(`Precisão: ${location.accuracy}m`)
console.log(`Fonte: ${location.accuracy < 1000 ? 'GPS' : 'IP'}`)
```

### 3. Uso no Componente

```typescript
// Hook de busca de lugares
const {
  places,
  loading,
  error,
  refresh,
  hasMore,
  loadMore,
  cacheStatus
} = useVibePlaces({
  userLocation: { lat: -23.632, lng: -46.589 }, // Opcional
  manualCity: 'São Paulo',                      // Fallback manual
  manualState: 'SP',
  mode: 'normal',                                // ou 'solo'
  radius: 5000                                  // 5km
})
```

## 🧪 Testes e Validação

### Testes Recomendados

1. **GPS Ativado**: Verificar precisão < 100m
2. **GPS Desligado**: Confirmar fallback para IP
3. **Permissão Negada**: Testar input manual
4. **Offline**: Validar funcionamento com cache
5. **Timeout**: Simular lentidão na rede

### Ferramentas de Debug

```typescript
// Verificar suporte de geolocation
console.log('Geolocation suportado:', GeolocationService.isGeolocationSupported())

// Verificar permissão
const permission = await GeolocationService.requestPermission()
console.log('Permissão:', permission) // 'granted', 'denied', 'prompt'

// Logs detalhados
console.log('Cache status:', cacheStatus) // 'valid', 'expired', 'none'
```

## 📈 Performance e Métricas

### Otimizações Implementadas

- **Debounce**: 500ms entre chamadas para evitar spam
- **Cache Local**: 30 dias de validade para reduzir API calls
- **Chamadas Únicas**: Previne múltiplas requisições simultâneas
- **Background Loading**: Edge Function não bloqueia UI

### Métricas de Sucesso

- **Taxa de Sucesso**: > 99% de localizações bem-sucedidas
- **Tempo Médio**: < 3s para IP, < 15s para GPS
- **Fallback Automático**: 100% de casos cobertos
- **Zero Breaking Changes**: Sistema sempre funciona

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. "Geolocation não suportada"
**Causa**: Navegador antigo ou ambiente restrito
**Solução**: Sistema automaticamente usa IP

#### 2. "Permissão negada"
**Causa**: Usuário bloqueou acesso à localização
**Solução**: Input manual de cidade/estado é oferecido

#### 3. "Timeout ao obter localização"
**Causa**: GPS lento ou indisponível
**Solução**: Fallback automático para IP em 10s

#### 4. "Google Maps não carregou"
**Causa**: API key inválida ou bloqueada
**Solução**: Verificar console e configuração da API

### Logs de Debug

Habilite logs detalhados procurando por:
- `[VibeLocalPage] geolocation success`
- `[VibeLocalPage] geolocation error`
- `Cache expirado, buscando novos lugares...`
- `Busca de lugares já em andamento, ignorando...`

## 🎨 Neo-Brutalist Design System

### VibeMatchCard - Estilo Visual Único

O componente VibeMatchCard implementa o estilo Neo-Brutalist, caracterizado por:

#### Princípios de Design:
- **Bordas Grossas**: 4px de espessura para criar impacto visual
- **Sombras Duras**: Sombras sem desfoque, criando profundidade bruta
- **Cores Primárias**: Preto, branco e cores vibrantes em contraste
- **Tipografia Bold**: Space Grotesk com peso 900 (black)
- **Espaçamento Amplo**: Respiração visual entre elementos
- **Minimalismo Funcional**: Apenas elementos essenciais

#### Classes CSS Customizadas:

```css
/* Card Container */
.neo-brutalist-card {
  @apply w-full h-[80vh] border-4 border-black shadow-hard-lg bg-white;
}

/* Action Buttons */
.neo-brutalist-button-like {
  @apply border-3 border-black shadow-hard bg-white hover:bg-green-500 hover:text-white;
}

.neo-brutalist-button-dislike {
  @apply border-3 border-black shadow-hard bg-white hover:bg-red-500 hover:text-white;
}

/* Typography */
.neo-brutalist-title {
  @apply font-space-grotesk font-black text-2xl uppercase tracking-tight;
}

.neo-brutalist-subtitle {
  @apply font-space-grotesk font-bold text-lg;
}
```

#### Anatomia do Card:

```
┌─────────────────────────────────────────┐
