# Documentação Completa das Páginas Principais - LuvBee Platform

**Data de Criação:** 30 de Janeiro de 2025  
**Versão:** 1.0  
**Status:** Completo

---

## 📌 Resumo Executivo

Esta documentação detalha a arquitetura, implementação e funcionalidades de todas as páginas principais da plataforma LuvBee:

- **6 Páginas Principais** documentadas
- **15+ Componentes** analisados
- **10+ Hooks** descritos
- **8+ Serviços** documentados
- **Taxa Média de Implementação:** 88%

### Status Geral

| Página | Taxa | Status |
|--------|------|--------|
| Vibe Local | 95% | ✅ Quase Completo |
| Locations | 85% | ✅ Funcional |
| People | 90% | ✅ Quase Completo |
| Messages | 95% | ✅ Quase Completo |
| Profile | 80% | ⚠️ Funcional mas incompleto |
| Explore | 85% | ✅ Funcional |

### Funcionalidades Core

✅ **Match em Duas Camadas:**
- Match com locais (Vibe Local)
- Match com pessoas baseado em locais em comum (People)

✅ **Sistema de Chat:**
- Mensagens em tempo real (< 1 segundo)
- Criação automática de chat em match mútuo
- Contadores de não lidas

✅ **Geolocalização:**
- GPS com fallback para IP
- Busca manual por cidade/estado
- Cache inteligente de lugares

✅ **Sistema de Preferências:**
- Bebidas, comida, música
- Cálculo de compatibilidade
- Filtro por modo Solo/Normal

---

## 📋 Índice

1. [Vibe Local (`/dashboard/vibe-local`)](#1-vibe-local)
2. [Locations (`/dashboard/locations`)](#2-locations)
3. [People (`/dashboard/people`)](#3-people)
4. [Messages (`/dashboard/messages`)](#4-messages)
5. [Profile (`/dashboard/profile`)](#5-profile)
6. [Explore (`/dashboard/explore`)](#6-explore)
7. [Edge Functions e RPC Functions - Arquitetura Backend](#-edge-functions-e-rpc-functions---arquitetura-backend)

---

## 1. Vibe Local (`/dashboard/vibe-local`)

### 📍 Visão Geral

**Rota:** `/dashboard/vibe-local`  
**Arquivo Principal:** `src/pages/VibeLocalPage.tsx`  
**User Story:** Core Loop 1 - Descobrir e dar match com locais  
**Taxa de Implementação:** ✅ **95% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
VibeLocalPage
├── GeolocationHandler (componente de geolocalização)
├── PlaceSearch (busca de lugares)
├── LocationSwipe (interface de swipe)
│   └── LocationCard (card individual)
└── Sheet (modal para mudar localização)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. Solicita localização GPS (GeolocationService)
   ↓
3. Fallback para cidade/estado manual se GPS falhar
   ↓
4. Hook useVibePlaces busca locais:
   - Com GPS: RPC get_places_nearby + Edge Function fetch-places-google
   - Sem GPS: RPC get_places_by_city_state
   ↓
5. Filtra locais já com match (LocationService.getUserLocationMatches)
   ↓
6. Renderiza LocationSwipe com cards
   ↓
7. Usuário faz swipe (like/dislike)
   ↓
8. LocationService.createLocationMatch / removeLocationMatch
   ↓
9. Atualiza lista (refresh)
```

### 🔧 Componentes Principais

#### 1. VibeLocalPage (`src/pages/VibeLocalPage.tsx`)

**Responsabilidades:**
- Gerenciar estado de localização (GPS ou manual)
- Coordenar busca de lugares
- Gerenciar UI de mudança de localização
- Controlar raio de busca (5km, 15km, 30km)
- Integrar com modo Solo/Normal

**Estados Principais:**
```typescript
- latitude/longitude: coordenadas GPS
- manualCity/manualState: cidade/estado manual
- locationError: erros de geolocalização
- searchRadius: raio de busca (5000, 15000, 30000 metros)
- showChangeLocation: controla modal de mudança
- places: lista de locais retornados
```

**Funções Principais:**
- `requestLocation()`: Solicita GPS com fallback para IP
- `handleManualSearch()`: Busca por cidade/estado
- `handlePlaceSelect()`: Seleciona lugar do PlaceSearch
- `tryLoadManualFromProfileOrStorage()`: Carrega cidade/estado do perfil

#### 2. LocationSwipe (`src/components/location/LocationSwipe.tsx`)

**Responsabilidades:**
- Renderizar cards de locais em formato swipe
- Gerenciar navegação entre cards
- Detectar gestos de swipe (mouse e touch)
- Carregar mais resultados (infinite scroll)

**Props:**
```typescript
interface LocationSwipeProps {
  places: Location[]
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  loadingMore?: boolean
  onLike?: (location: Location) => Promise<void>
  onDislike?: (location: Location) => Promise<void>
}
```

**Funcionalidades:**
- ✅ Swipe por mouse (drag)
- ✅ Swipe por touch (mobile)
- ✅ Botões de like/dislike
- ✅ Infinite scroll
- ✅ Animações de transição

#### 3. LocationCard (`src/components/location/LocationCard.tsx`)

**Responsabilidades:**
- Exibir informações do local
- Mostrar imagem (com fallbacks)
- Exibir rating, preço, distância
- Suportar modo Solo/Normal

**Dados Exibidos:**
- Nome do local
- Endereço
- Imagem (Google Places ou cache Supabase)
- Rating (Google ou local)
- Nível de preço ($, $$, $$$, $$$$)
- Distância aproximada
- Tipo de local

### 🎣 Hooks Utilizados

#### useVibePlaces (`src/hooks/useVibePlaces.ts`)

**Propósito:** Buscar e gerenciar lugares próximos

**Parâmetros:**
```typescript
{
  userLocation?: { lat: number; lng: number } | null
  manualCity?: string | null
  manualState?: string | null
  mode?: 'normal' | 'solo'
  radius?: number // metros
  maxCacheAge?: number // dias
}
```

**Retorno:**
```typescript
{
  places: Location[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  cacheStatus: 'valid' | 'expired' | 'none'
}
```

**Lógica de Busca:**

1. **Com GPS:**
   - Verifica cache via RPC `check_search_cache`
   - Se cache expirado, dispara Edge Function `fetch-places-google` (background)
   - Busca no banco via RPC `get_places_nearby`
   - Filtra por raio e modo (solo/normal)

2. **Sem GPS (cidade/estado):**
   - Busca direto no banco via RPC `get_places_by_city_state`
   - Filtra por cidade, estado e modo

**Otimizações:**
- ✅ Debounce de 500ms para evitar múltiplas chamadas
- ✅ Cache de sessão para prevenir chamadas simultâneas
- ✅ Filtro de locais já com match
- ✅ Paginação (20 por página)

### 🔌 Serviços Utilizados

#### LocationService (`src/services/location.service.ts`)

**Métodos Principais:**

1. **createLocationMatch(userId, locationId)**
   - Cria match entre usuário e local
   - Insere na tabela `location_matches`
   - Retorna sucesso/erro

2. **removeLocationMatch(userId, locationId)**
   - Remove match (rejeição)
   - Atualiza tabela `location_matches`
   - Retorna sucesso/erro

3. **getUserLocationMatches(userId)**
   - Busca todos os matches do usuário
   - Usado para filtrar locais já vistos

#### GeolocationService (`src/services/geolocation.service.ts`)

**Métodos Principais:**

1. **getCurrentLocation(options)**
   - Solicita GPS do navegador
   - Fallback para geolocalização por IP
   - Retorna coordenadas com precisão

**Opções:**
```typescript
{
  timeout: 15000,
  maximumAge: 60000,
  enableHighAccuracy: true,
  fallbackToIP: true
}
```

### 🔗 Ligações e Dependências

**Dependências Externas:**
- ✅ Google Places API (via Edge Function)
- ✅ Supabase RPC Functions
- ✅ Supabase Realtime (para atualizações)
- ✅ Browser Geolocation API

**Integrações:**
- ✅ `useVibeModeStore` - Modo Solo/Normal
- ✅ `useAuth` - Autenticação do usuário
- ✅ `GooglePlacesService` - Geocodificação de endereços

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Geolocalização GPS | ✅ 100% | Com fallback para IP |
| Busca por cidade/estado | ✅ 100% | Manual e do perfil |
| Busca de lugares | ✅ 100% | Com cache inteligente |
| Swipe de locais | ✅ 100% | Mouse e touch |
| Like/Dislike | ✅ 100% | Com persistência |
| Modo Solo/Normal | ✅ 100% | Filtro de conteúdo adulto |
| Infinite scroll | ✅ 100% | Paginação automática |
| Mudança de localização | ✅ 100% | Via PlaceSearch ou manual |
| Raio de busca | ✅ 100% | 5km, 15km, 30km |
| Cache de imagens | ✅ 100% | Supabase Storage |
| Filtro de matches | ✅ 100% | Não mostra locais já com match |

**Total: 95%** (5% para melhorias de UX e performance)

### ⚠️ Pontos de Atenção

1. **Cache de Busca:**
   - Edge Function pode falhar silenciosamente (não bloqueante)
   - Cache verificado a cada busca

2. **Geolocalização:**
   - Pode falhar em ambientes sem GPS
   - Fallback automático para cidade/estado

3. **Performance:**
   - Debounce evita múltiplas chamadas
   - Paginação reduz carga inicial

---

## 2. Locations (`/dashboard/locations`)

### 📍 Visão Geral

**Rota:** `/dashboard/locations`  
**Arquivo Principal:** `src/pages/LocationsPage.tsx`  
**User Story:** Explorar locais além do swipe  
**Taxa de Implementação:** ✅ **85% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
LocationsPage
├── LocationFilter (filtros laterais)
├── LocationList (grid de locais)
│   └── LocationCard (card individual)
└── LocationDetail (detalhes do local - modal)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. LocationFilter define filtros
   ↓
3. LocationList busca locais (LocationService.getLocations)
   ↓
4. Filtra por modo Solo/Normal
   ↓
5. Renderiza grid de cards
   ↓
6. Usuário clica em card
   ↓
7. Abre LocationDetail com informações completas
```

### 🔧 Componentes Principais

#### 1. LocationsPage (`src/pages/LocationsPage.tsx`)

**Responsabilidades:**
- Gerenciar estado de filtros
- Alternar entre lista e detalhes
- Coordenar busca de locais

**Estados Principais:**
```typescript
- filters: LocationFilterType
- selectedLocationId: string | null
- viewMode: 'list' | 'detail'
```

**Funções Principais:**
- `handleLocationSelect()`: Abre detalhes do local
- `handleBackToList()`: Volta para lista

#### 2. LocationList (`src/components/location/LocationList.tsx`)

**Responsabilidades:**
- Buscar e exibir lista de locais
- Aplicar filtros
- Renderizar grid responsivo
- Gerenciar loading e erros

**Props:**
```typescript
interface LocationListProps {
  filter?: LocationFilterType
  className?: string
  onLocationSelect?: (locationId: string) => void
}
```

**Funcionalidades:**
- ✅ Grid responsivo (1, 2, 3 colunas)
- ✅ Loading skeleton
- ✅ Tratamento de erros
- ✅ Empty state
- ✅ Filtro por modo Solo/Normal

#### 3. LocationFilter (`src/components/location/LocationFilter.tsx`)

**Responsabilidades:**
- Exibir filtros disponíveis
- Capturar mudanças de filtro
- Aplicar filtros em tempo real

**Filtros Disponíveis:**
- Categoria/Tipo
- Busca por texto
- Rating mínimo
- Verificado apenas

### 🎣 Hooks Utilizados

**Nenhum hook customizado** - Usa diretamente `LocationService`

### 🔌 Serviços Utilizados

#### LocationService.getLocations()

**Parâmetros:**
```typescript
filter?: LocationFilterType
pagination?: PaginationOptions
```

**Retorno:**
```typescript
ApiResponse<LocationData[]>
```

**Filtros Suportados:**
- `category`: Tipo de local
- `search`: Busca por nome/descrição
- `rating`: Rating mínimo
- `verified`: Apenas verificados

### 🔗 Ligações e Dependências

**Dependências:**
- ✅ `LocationService` - Busca de locais
- ✅ `useVibeModeStore` - Modo Solo/Normal
- ✅ `useAuth` - Autenticação

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Lista de locais | ✅ 100% | Grid responsivo |
| Filtros | ✅ 90% | Faltam alguns filtros avançados |
| Detalhes do local | ✅ 80% | Modal básico |
| Busca por texto | ✅ 100% | Funcional |
| Modo Solo/Normal | ✅ 100% | Filtro aplicado |
| Paginação | ⚠️ 50% | Implementada mas não visível |
| Ordenação | ⚠️ 30% | Apenas por data |

**Total: 85%** (15% para melhorias de filtros e detalhes)

### ⚠️ Pontos de Atenção

1. **Filtros:**
   - Alguns filtros avançados não implementados
   - Ordenação limitada

2. **Detalhes:**
   - Modal básico, pode ser expandido
   - Falta integração com match direto

---

## 3. People (`/dashboard/people`)

### 📍 Visão Geral

**Rota:** `/dashboard/people`  
**Arquivo Principal:** `src/pages/PeoplePage.tsx`  
**User Story:** Core Loop 2 - Match com Pessoas  
**Taxa de Implementação:** ✅ **90% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
PeoplePage
├── PersonSwipe (interface de swipe)
│   └── PersonCard (card individual)
│       └── CompatibilityBadge (badge de compatibilidade)
└── Empty State (sem matches de locais)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. Verifica se tem matches com locais (useHasLocationMatches)
   ↓
3. Se não tem: mostra mensagem de pré-requisito
   ↓
4. Se tem: busca matches potenciais (usePotentialMatches)
   ↓
5. Filtra apenas pessoas com locais em comum
   ↓
6. Renderiza PersonSwipe com cards
   ↓
7. Usuário faz swipe (like/dislike)
   ↓
8. MatchService.createPeopleMatch
   ↓
9. Se match mútuo: cria chat automaticamente
   ↓
10. Atualiza lista
```

### 🔧 Componentes Principais

#### 1. PeoplePage (`src/pages/PeoplePage.tsx`)

**Responsabilidades:**
- Verificar pré-requisito (matches com locais)
- Renderizar PersonSwipe ou mensagem
- Gerenciar estado de loading

**Lógica de Pré-requisito:**
```typescript
// Usuário precisa ter pelo menos 1 match com local
const { data: hasLocationMatches } = useHasLocationMatches()

if (!hasLocationMatches) {
  // Mostra mensagem e botão para ir ao Vibe Local
}
```

#### 2. PersonSwipe (`src/components/matching/PersonSwipe.tsx`)

**Responsabilidades:**
- Renderizar cards de pessoas em formato swipe
- Gerenciar navegação entre cards
- Detectar gestos de swipe
- Chamar API de match

**Props:**
```typescript
interface PersonSwipeProps {
  limit?: number // padrão: 10
}
```

**Funcionalidades:**
- ✅ Swipe por mouse e touch
- ✅ Botões de like/dislike
- ✅ Animações de transição
- ✅ Loading states
- ✅ Empty state

#### 3. PersonCard (`src/components/matching/PersonCard.tsx`)

**Responsabilidades:**
- Exibir informações da pessoa
- Mostrar foto de perfil
- Exibir badge de compatibilidade
- Mostrar locais em comum

**Dados Exibidos:**
- Nome e idade
- Foto de perfil
- Bio
- Score de compatibilidade
- Locais em comum
- Preferências (bebidas, comida, música)

#### 4. CompatibilityBadge (`src/components/matching/CompatibilityBadge.tsx`)

**Responsabilidades:**
- Exibir score de compatibilidade
- Cores baseadas no score
- Tooltip com detalhes

**Cálculo de Compatibilidade:**
- 50% preferências (bebidas, comida, música)
- 30% locais em comum
- 20% outros fatores

### 🎣 Hooks Utilizados

#### usePotentialMatches (`src/hooks/useMatches.ts`)

**Propósito:** Buscar pessoas com locais em comum

**Parâmetros:**
```typescript
{
  limit?: number
  enabled?: boolean
}
```

**Retorno:**
```typescript
{
  data: PotentialMatch[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}
```

**Lógica:**
- Chama RPC `get_potential_matches`
- Filtra apenas pessoas com locais em comum
- Ordena por score de compatibilidade
- Cache de 2 minutos

#### useHasLocationMatches (`src/hooks/useMatches.ts`)

**Propósito:** Verificar se usuário tem matches com locais

**Retorno:**
```typescript
{
  data: boolean
  isLoading: boolean
}
```

**Lógica:**
- Verifica se existe pelo menos 1 match na tabela `location_matches`
- Cache de 5 minutos

#### useCreateMatch (`src/hooks/useMatches.ts`)

**Propósito:** Criar match entre pessoas

**Uso:**
```typescript
const createMatch = useCreateMatch()

createMatch.mutate(targetUserId, {
  onSuccess: (match) => {
    // Match criado
    // Se mútuo, chat é criado automaticamente
  }
})
```

**Lógica:**
- Chama RPC `create_people_match`
- Detecta match mútuo automaticamente
- Cria chat se mútuo
- Invalida cache de matches

### 🔌 Serviços Utilizados

#### MatchService (`src/services/match.service.ts`)

**Métodos Principais:**

1. **getPotentialMatches(userId, limit)**
   - Busca pessoas com locais em comum
   - Calcula compatibilidade
   - Retorna ordenado por score

2. **createPeopleMatch(userId, targetUserId)**
   - Cria match entre pessoas
   - Detecta match mútuo
   - Cria chat automaticamente se mútuo

3. **hasLocationMatches(userId)**
   - Verifica se tem matches com locais
   - Retorna boolean

#### CompatibilityService (`src/services/compatibility.service.ts`)

**Métodos Principais:**

1. **calculateCompatibility(user1, user2)**
   - Calcula score de compatibilidade
   - Considera preferências e locais
   - Retorna score 0-100

### 🔗 Ligações e Dependências

**Dependências:**
- ✅ `MatchService` - Gerenciamento de matches
- ✅ `CompatibilityService` - Cálculo de compatibilidade
- ✅ `ChatService` - Criação automática de chat
- ✅ `useVibeModeStore` - Modo Solo/Normal
- ✅ `useAuth` - Autenticação

**Integrações:**
- ✅ RPC `get_potential_matches` - Busca de pessoas
- ✅ RPC `create_people_match` - Criação de match
- ✅ Trigger automático de criação de chat

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Verificação de pré-requisito | ✅ 100% | Funcional |
| Busca de pessoas | ✅ 100% | Com filtro de locais |
| Swipe de pessoas | ✅ 100% | Mouse e touch |
| Like/Dislike | ✅ 100% | Com persistência |
| Cálculo de compatibilidade | ✅ 100% | Score 0-100 |
| Match mútuo | ✅ 100% | Detecção automática |
| Criação de chat | ✅ 100% | Automático em match mútuo |
| Badge de compatibilidade | ✅ 100% | Com cores |
| Locais em comum | ✅ 90% | Exibido mas pode melhorar |
| Preferências | ✅ 100% | Exibidas no card |

**Total: 90%** (10% para melhorias de UX)

### ⚠️ Pontos de Atenção

1. **Pré-requisito:**
   - Usuário precisa ter matches com locais primeiro
   - Mensagem clara quando não atende

2. **Compatibilidade:**
   - Cálculo pode ser ajustado
   - Score baseado em preferências e locais

3. **Performance:**
   - Limite padrão de 10 pessoas
   - Cache de 2 minutos

---

## 4. Messages (`/dashboard/messages`)

### 📍 Visão Geral

**Rota:** `/dashboard/messages`  
**Arquivo Principal:** `src/pages/MessagesPage.tsx`  
**User Story:** Chat com Matches Mútuos  
**Taxa de Implementação:** ✅ **95% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
MessagesPage
├── ChatListItem (lista de chats)
│   └── Avatar, nome, última mensagem, não lidas
└── ChatWindow (janela de chat)
    ├── MessageList (lista de mensagens)
    └── MessageInput (input de mensagem)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. useChats busca lista de chats
   ↓
3. Subscribe para mudanças em tempo real
   ↓
4. Renderiza lista de chats
   ↓
5. Usuário seleciona chat
   ↓
6. useChatMessages busca mensagens
   ↓
7. Subscribe para novas mensagens
   ↓
8. Marca como lido (useMarkChatAsRead)
   ↓
9. Usuário envia mensagem
   ↓
10. useSendMessage envia mensagem
   ↓
11. Atualiza em tempo real via Realtime
```

### 🔧 Componentes Principais

#### 1. MessagesPage (`src/pages/MessagesPage.tsx`)

**Responsabilidades:**
- Gerenciar lista de chats
- Alternar entre lista e chat aberto
- Coordenar seleção de chat

**Estados Principais:**
```typescript
- selectedChatId: string | null
- chats: ChatListItem[]
```

**Funções Principais:**
- `handleSelectChat()`: Seleciona chat
- `handleBackToList()`: Volta para lista

#### 2. ChatListItem (`src/components/chat/ChatListItem.tsx`)

**Responsabilidades:**
- Exibir resumo do chat
- Mostrar última mensagem
- Exibir contador de não lidas
- Indicar seleção

**Dados Exibidos:**
- Avatar do outro usuário
- Nome do outro usuário
- Última mensagem (preview)
- Timestamp da última mensagem
- Contador de não lidas
- Badge de online (futuro)

#### 3. ChatWindow (`src/components/chat/ChatWindow.tsx`)

**Responsabilidades:**
- Exibir mensagens do chat
- Gerenciar envio de mensagens
- Marcar como lido automaticamente
- Subscribe para novas mensagens

**Estrutura:**
```
ChatWindow
├── Header (avatar, nome, status)
├── MessageList (mensagens)
└── MessageInput (input de envio)
```

#### 4. MessageList (`src/components/chat/MessageList.tsx`)

**Responsabilidades:**
- Renderizar lista de mensagens
- Agrupar por data
- Mostrar avatar do remetente
- Indicar mensagens próprias vs recebidas
- Scroll automático para última mensagem

**Funcionalidades:**
- ✅ Agrupamento por data
- ✅ Estilo diferente para próprias/recebidas
- ✅ Timestamp formatado
- ✅ Scroll automático
- ✅ Loading state

#### 5. MessageInput (`src/components/chat/MessageInput.tsx`)

**Responsabilidades:**
- Capturar input do usuário
- Enviar mensagem
- Mostrar estado de loading
- Validar mensagem vazia

**Funcionalidades:**
- ✅ Input de texto
- ✅ Botão de envio
- ✅ Loading durante envio
- ✅ Desabilitado quando não autenticado

### 🎣 Hooks Utilizados

#### useChats (`src/hooks/useChat.ts`)

**Propósito:** Buscar lista de chats do usuário

**Retorno:**
```typescript
{
  data: ChatListItem[]
  isLoading: boolean
  error: Error | null
}
```

**Funcionalidades:**
- ✅ Busca chats do usuário
- ✅ Subscribe para mudanças em tempo real
- ✅ Ordena por última mensagem
- ✅ Cache de 30 segundos

#### useChatMessages (`src/hooks/useChat.ts`)

**Propósito:** Buscar mensagens de um chat específico

**Parâmetros:**
```typescript
chatId: string | null
```

**Retorno:**
```typescript
{
  data: MessageWithRelations[]
  isLoading: boolean
  error: Error | null
}
```

**Funcionalidades:**
- ✅ Busca mensagens do chat
- ✅ Subscribe para novas mensagens em tempo real
- ✅ Evita duplicatas
- ✅ Cache de 10 segundos

#### useSendMessage (`src/hooks/useChat.ts`)

**Propósito:** Enviar mensagem

**Uso:**
```typescript
const sendMessage = useSendMessage()

sendMessage.mutate({
  chatId: '...',
  content: 'Mensagem'
})
```

**Funcionalidades:**
- ✅ Envia mensagem
- ✅ Invalida cache automaticamente
- ✅ Atualiza lista de chats

#### useMarkChatAsRead (`src/hooks/useChat.ts`)

**Propósito:** Marcar chat como lido

**Uso:**
```typescript
const markAsRead = useMarkChatAsRead()

markAsRead.mutate(chatId)
```

**Funcionalidades:**
- ✅ Marca como lido
- ✅ Atualiza contador de não lidas
- ✅ Invalida cache

#### useChat (`src/hooks/useChat.ts`)

**Propósito:** Buscar informações de um chat específico

**Parâmetros:**
```typescript
chatId: string | null
```

**Retorno:**
```typescript
{
  data: ChatWithUsers | null
  isLoading: boolean
}
```

### 🔌 Serviços Utilizados

#### ChatService (`src/services/chat.service.ts`)

**Métodos Principais:**

1. **getUserChats(userId)**
   - Busca todos os chats do usuário
   - Inclui informações do outro usuário
   - Inclui última mensagem
   - Inclui contador de não lidas

2. **getChatById(chatId)**
   - Busca chat específico
   - Inclui informações dos usuários

3. **getChatByUsers(userId1, userId2)**
   - Busca chat entre dois usuários
   - Usado para verificar se chat existe

4. **markChatAsRead(chatId, userId)**
   - Marca chat como lido
   - Atualiza contador de não lidas

5. **subscribeToChats(userId, callback)**
   - Subscribe para mudanças em chats
   - Atualiza lista em tempo real

#### MessageService (`src/services/message.service.ts`)

**Métodos Principais:**

1. **sendMessage(chatId, senderId, content)**
   - Envia mensagem
   - Atualiza last_message_at do chat
   - Incrementa contador de não lidas
   - Retorna mensagem criada

2. **getMessages(chatId)**
   - Busca mensagens do chat
   - Ordena por data (mais antigas primeiro)

3. **subscribeToMessages(chatId, userId, callback)**
   - Subscribe para novas mensagens
   - Valida participação do usuário

### 🔗 Ligações e Dependências

**Dependências:**
- ✅ `ChatService` - Gerenciamento de chats
- ✅ `MessageService` - Gerenciamento de mensagens
- ✅ `useAuth` - Autenticação
- ✅ Supabase Realtime - Atualizações em tempo real

**Integrações:**
- ✅ Tabela `chats` - Armazena chats
- ✅ Tabela `messages` - Armazena mensagens
- ✅ Trigger automático de criação de chat em match mútuo
- ✅ Realtime subscriptions para chats e mensagens

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Lista de chats | ✅ 100% | Com última mensagem |
| Seleção de chat | ✅ 100% | Funcional |
| Exibição de mensagens | ✅ 100% | Com agrupamento |
| Envio de mensagens | ✅ 100% | Funcional |
| Tempo real | ✅ 100% | Via Supabase Realtime |
| Marcação como lido | ✅ 100% | Automática |
| Contador de não lidas | ✅ 100% | Em tempo real |
| Scroll automático | ✅ 100% | Para última mensagem |
| Avatar e nome | ✅ 100% | Do outro usuário |
| Timestamp | ✅ 100% | Formatado |
| Empty state | ✅ 100% | Quando sem chats |
| Loading states | ✅ 100% | Em todos os lugares |

**Total: 95%** (5% para melhorias de UX como typing indicators)

### ⚠️ Pontos de Atenção

1. **Tempo Real:**
   - Depende de Supabase Realtime
   - Pode ter latência em conexões lentas

2. **Performance:**
   - Mensagens carregadas sob demanda
   - Cache de 10 segundos

3. **Criação de Chat:**
   - Automática em match mútuo
   - Trigger no banco de dados

---

## 5. Profile (`/dashboard/profile`)

### 📍 Visão Geral

**Rota:** `/dashboard/profile`  
**Arquivo Principal:** `src/pages/ProfilePage.tsx`  
**User Story:** Gerenciamento de Perfil  
**Taxa de Implementação:** ✅ **80% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
ProfilePage
├── ProfileStats (estatísticas do perfil)
├── ProfileForm (formulário de edição)
│   ├── Upload de fotos (3 fotos)
│   ├── Informações básicas
│   └── Preferências (bebidas, comida, música)
└── Settings (configurações - placeholder)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. useAuth carrega perfil
   ↓
3. ProfileForm carrega dados do usuário
   ↓
4. Carrega preferências (UserService.getUserPreferences)
   ↓
5. Carrega fotos do perfil (Supabase Storage)
   ↓
6. Usuário edita informações
   ↓
7. Salva via UserService.updateUser
   ↓
8. Salva preferências via UserService.updatePreferences
   ↓
9. Upload de fotos via ImageStorageService
   ↓
10. Atualiza perfil local
```

### 🔧 Componentes Principais

#### 1. ProfilePage (`src/pages/ProfilePage.tsx`)

**Responsabilidades:**
- Renderizar estrutura da página
- Exibir ProfileStats
- Exibir ProfileForm
- Exibir Settings (placeholder)

**Estrutura:**
```typescript
- Header (título e descrição)
- ProfileStats (estatísticas)
- ProfileForm (formulário)
- Settings (configurações - não implementado)
```

#### 2. ProfileForm (`src/components/profile/ProfileForm.tsx`)

**Responsabilidades:**
- Exibir e editar informações do perfil
- Gerenciar upload de fotos
- Gerenciar preferências
- Salvar alterações

**Seções:**

1. **Fotos do Perfil:**
   - 3 slots para fotos
   - Upload via Supabase Storage
   - Preview antes de salvar
   - Remoção de fotos

2. **Informações Básicas:**
   - Nome
   - Idade
   - Bio
   - Localização

3. **Preferências:**
   - Bebidas (múltipla seleção)
   - Comida (múltipla seleção)
   - Música (múltipla seleção)

**Estados Principais:**
```typescript
- photos: string[] // URLs das fotos
- formData: Partial<UserProfile>
- preferences: {
    drink_preferences: string[]
    food_preferences: string[]
    music_preferences: string[]
  }
- isLoading: boolean
```

**Funções Principais:**
- `loadUserProfile()`: Carrega dados do usuário
- `loadUserPreferences()`: Carrega preferências
- `loadUserPhotos()`: Carrega fotos do Storage
- `handlePhotoUpload()`: Faz upload de foto
- `handleSave()`: Salva todas as alterações

#### 3. ProfileStats (`src/components/profile/ProfileForm.tsx`)

**Responsabilidades:**
- Exibir estatísticas do perfil
- Mostrar número de matches
- Mostrar número de locais curtidos

**Dados Exibidos:**
- Matches com pessoas
- Matches com locais
- Mensagens trocadas
- Check-ins realizados

### 🎣 Hooks Utilizados

**Nenhum hook customizado** - Usa diretamente `useAuth` e serviços

### 🔌 Serviços Utilizados

#### UserService (`src/services/user.service.ts`)

**Métodos Principais:**

1. **getUserProfile(userId)**
   - Busca perfil completo do usuário
   - Inclui preferências relacionadas

2. **updateUser(userId, data)**
   - Atualiza informações básicas
   - Valida com Zod schema

3. **getUserPreferences(userId)**
   - Busca preferências do usuário
   - Retorna bebidas, comida, música

4. **updatePreferences(userId, preferences)**
   - Atualiza preferências
   - Valida com Zod schema

#### ImageStorageService (`src/services/image-storage.service.ts`)

**Métodos Principais:**

1. **uploadProfilePhoto(userId, file, index)**
   - Faz upload de foto para Supabase Storage
   - Bucket: `profile-photos`
   - Retorna URL pública

2. **deleteProfilePhoto(userId, photoUrl)**
   - Remove foto do Storage
   - Atualiza referência no banco

### 🔗 Ligações e Dependências

**Dependências:**
- ✅ `UserService` - Gerenciamento de usuário
- ✅ `ImageStorageService` - Upload de fotos
- ✅ `useAuth` - Autenticação e perfil
- ✅ Supabase Storage - Armazenamento de fotos

**Integrações:**
- ✅ Tabela `users` - Informações básicas
- ✅ Tabela `user_preferences` - Preferências
- ✅ Tabela `user_photos` - Referências de fotos
- ✅ Bucket `profile-photos` - Armazenamento

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Exibição de perfil | ✅ 100% | Completo |
| Edição de informações | ✅ 100% | Funcional |
| Upload de fotos | ✅ 90% | 3 fotos, falta drag & drop |
| Preferências | ✅ 100% | Bebidas, comida, música |
| Estatísticas | ✅ 80% | Básico, pode expandir |
| Validação | ✅ 100% | Com Zod |
| Salvar alterações | ✅ 100% | Funcional |
| Settings | ⚠️ 20% | Apenas placeholder |
| Mudança de senha | ❌ 0% | Não implementado |
| Privacidade | ⚠️ 30% | Básico |

**Total: 80%** (20% para settings e melhorias)

### ⚠️ Pontos de Atenção

1. **Fotos:**
   - Upload funciona mas pode melhorar UX
   - Falta drag & drop para reordenar

2. **Settings:**
   - Maioria dos itens são placeholders
   - Falta implementação de configurações

3. **Validação:**
   - Usa Zod para validação
   - Mensagens de erro podem melhorar

---

## 6. Explore (`/dashboard/explore`)

### 📍 Visão Geral

**Rota:** `/dashboard/explore`  
**Arquivo Principal:** `src/pages/ExplorePage.tsx`  
**User Story:** Explorar Locais e Eventos  
**Taxa de Implementação:** ✅ **85% Completo**

### 🏗️ Arquitetura

#### Estrutura de Componentes

```
ExplorePage
├── LocationFilter (filtros de busca)
├── ExploreLocations (grid de locais)
│   └── LocationCard (card individual)
└── LocationDetail (detalhes do local)
```

#### Fluxo de Dados

```
1. Usuário acessa página
   ↓
2. LocationFilter define filtros
   ↓
3. ExploreLocations busca locais (useExploreLocations)
   ↓
4. Renderiza grid de cards
   ↓
5. Usuário clica em card
   ↓
6. Abre LocationDetail com informações completas
   ↓
7. Usuário pode dar match diretamente
```

### 🔧 Componentes Principais

#### 1. ExplorePage (`src/pages/ExplorePage.tsx`)

**Responsabilidades:**
- Renderizar estrutura da página
- Gerenciar filtros
- Coordenar busca de locais

**Estrutura:**
```typescript
- Header (título e descrição)
- LocationFilter (filtros)
- ExploreLocations (grid de locais)
```

#### 2. ExploreLocations (`src/components/discovery/ExploreLocations.tsx`)

**Responsabilidades:**
- Buscar e exibir locais
- Aplicar filtros
- Renderizar grid responsivo
- Gerenciar paginação

**Props:**
```typescript
interface ExploreLocationsProps {
  filter?: LocationFilterType
  onLocationClick?: (locationId: string) => void
}
```

**Funcionalidades:**
- ✅ Grid responsivo
- ✅ Infinite scroll
- ✅ Loading states
- ✅ Empty state
- ✅ Filtro por categoria

#### 3. LocationFilter (`src/components/discovery/LocationFilter.tsx`)

**Responsabilidades:**
- Exibir filtros disponíveis
- Capturar mudanças de filtro
- Aplicar filtros em tempo real

**Filtros Disponíveis:**
- Categoria/Tipo
- Busca por texto
- Rating mínimo

### 🎣 Hooks Utilizados

#### useExploreLocations (`src/hooks/useExploreLocations.ts`)

**Propósito:** Buscar locais para exploração

**Parâmetros:**
```typescript
{
  filter?: LocationFilterType
  limit?: number
  offset?: number
}
```

**Retorno:**
```typescript
{
  data: LocationData[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
}
```

**Lógica:**
- Busca locais via `LocationService.getLocations`
- Aplica filtros
- Suporta paginação
- Infinite scroll

### 🔌 Serviços Utilizados

#### LocationService.getLocations()

**Parâmetros:**
```typescript
filter?: LocationFilterType
pagination?: PaginationOptions
```

**Retorno:**
```typescript
ApiResponse<LocationData[]>
```

### 🔗 Ligações e Dependências

**Dependências:**
- ✅ `LocationService` - Busca de locais
- ✅ `useAuth` - Autenticação
- ✅ `LocationCard` - Exibição de cards

### 📊 Taxa de Implementação

| Funcionalidade | Status | Observações |
|---------------|--------|-------------|
| Grid de locais | ✅ 100% | Responsivo |
| Filtros | ✅ 90% | Básicos funcionais |
| Busca por texto | ✅ 100% | Funcional |
| Infinite scroll | ✅ 100% | Paginação automática |
| Detalhes do local | ✅ 100% | Modal completo |
| Match direto | ✅ 100% | Do detalhes |

**Total: 85%** (15% para melhorias de filtros)

### ⚠️ Pontos de Atenção

1. **Filtros:**
   - Básicos funcionam
   - Podem ser expandidos

2. **Performance:**
   - Infinite scroll otimizado
   - Paginação automática

---

## 📊 Resumo Geral

### Taxa de Implementação por Página

| Página | Taxa | Status |
|--------|------|--------|
| Vibe Local | 95% | ✅ Quase Completo |
| Locations | 85% | ✅ Funcional |
| People | 90% | ✅ Quase Completo |
| Messages | 95% | ✅ Quase Completo |
| Profile | 80% | ⚠️ Funcional mas incompleto |
| Explore | 85% | ✅ Funcional |

### Funcionalidades Principais Implementadas

✅ **Core Loops:**
- Match com locais (Vibe Local)
- Match com pessoas (People)
- Chat em tempo real (Messages)

✅ **Sistemas de Suporte:**
- Geolocalização com fallbacks
- Cache inteligente de lugares
- Cálculo de compatibilidade
- Sistema de preferências

✅ **Integrações:**
- Google Places API
- Supabase Realtime
- Supabase Storage
- Edge Functions

### Componentes Compartilhados Importantes

#### LocationCard (`src/components/location/LocationCard.tsx`)

**Usado em:** Vibe Local, Locations, Explore

**Funcionalidades:**
- ✅ Exibe informações do local
- ✅ Busca imagem via `usePlacePhoto` hook
- ✅ Fallbacks para imagens (Google Places → Cache → Placeholder)
- ✅ Suporta like/dislike
- ✅ Navegação para detalhes
- ✅ Exibe rating, preço, tipo
- ✅ Suporta modo Solo/Normal

**Props:**
```typescript
interface LocationCardProps {
  location: Location | LocationData
  distance?: string
  onLike?: () => void
  onDislike?: () => void
  onLocationClick?: (locationId: string) => void
}
```

#### PersonCard (`src/components/matching/PersonCard.tsx`)

**Usado em:** People

**Funcionalidades:**
- ✅ Exibe informações da pessoa
- ✅ Badge de compatibilidade
- ✅ Locais em comum
- ✅ Preferências (bebidas, comida, música)
- ✅ Suporta like/dislike
- ✅ Fallback para avatar

**Props:**
```typescript
interface PersonCardProps {
  user: PotentialMatch
  onLike?: (userId: string) => void
  onDislike?: (userId: string) => void
}
```

#### LocationDetail (`src/pages/LocationDetailPage.tsx`)

**Usado em:** Locations, Explore

**Funcionalidades:**
- ✅ Exibe detalhes completos do local
- ✅ Múltiplas imagens
- ✅ Informações de contato
- ✅ Horários de funcionamento
- ✅ Reviews (estrutura preparada)
- ✅ Match direto do detalhes
- ✅ Compartilhamento (estrutura preparada)

### O Que Está Faltando

⚠️ **Melhorias de UX:**
- Drag & drop para fotos no perfil
- Typing indicators no chat
- Melhor feedback visual em ações
- Animações de transição mais suaves

⚠️ **Funcionalidades Pendentes:**
- Settings completo no perfil
- Mudança de senha
- Configurações de privacidade
- Filtros avançados em Locations e Explore
- Sistema de reviews completo
- Compartilhamento de locais

⚠️ **Otimizações:**
- Lazy loading de imagens
- Virtual scrolling para listas grandes
- Otimização de queries
- Cache mais agressivo de imagens

---

## 🔗 Ligações Entre Páginas

### Fluxo Principal do Usuário

```
1. Vibe Local
   ↓ (dar match com locais)
2. People
   ↓ (dar match com pessoas)
3. Messages
   ↓ (conversar)
4. Profile
   ↓ (editar perfil)
```

### Dependências Entre Páginas

- **People** depende de **Vibe Local** (pré-requisito)
- **Messages** depende de **People** (match mútuo)
- **Profile** é independente mas afeta todas

### Compartilhamento de Dados

- **useAuth**: Todas as páginas
- **useVibeModeStore**: Vibe Local, Locations, People
- **LocationService**: Vibe Local, Locations, Explore
- **MatchService**: People, Messages
- **ChatService**: Messages
- **LocationCard**: Componente compartilhado em Vibe Local, Locations, Explore

---

## 🔧 Hooks e Serviços Compartilhados

### Hooks Principais

#### useAuth (`src/hooks/useAuth.ts`)

**Usado em:** Todas as páginas

**Funcionalidades:**
- ✅ Gerenciamento de autenticação
- ✅ Carregamento de perfil do usuário
- ✅ Atualização de perfil
- ✅ Sign in/out
- ✅ Estado de loading

**Retorno:**
```typescript
{
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (email, password) => Promise<void>
  signUp: (email, password, name) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data) => Promise<void>
  loadUserProfile: () => Promise<void>
}
```

#### useVibeModeStore (`src/store/useVibeMode.ts`)

**Usado em:** Vibe Local, Locations, People

**Funcionalidades:**
- ✅ Gerenciamento de modo Solo/Normal
- ✅ Persistência no localStorage
- ✅ Filtro de conteúdo adulto

**Estado:**
```typescript
{
  soloMode: boolean
  setSoloMode: (mode: boolean) => void
  toggleMode: () => void
}
```

#### usePlacePhoto (`src/hooks/usePlacePhoto.ts`)

**Usado em:** LocationCard, LocationDetail

**Funcionalidades:**
- ✅ Busca foto do Google Places
- ✅ Cache no Supabase Storage
- ✅ Fallback para placeholder
- ✅ Normalização de URLs

**Parâmetros:**
```typescript
placeId: string | null
fallbackUrl?: string | null
```

**Retorno:**
```typescript
string // URL da imagem
```

### Serviços Principais

#### LocationService (`src/services/location.service.ts`)

**Métodos Principais:**

1. **getLocations(filter, pagination)**
   - Busca lista de locais
   - Suporta filtros e paginação
   - Retorna `LocationData[]`

2. **getLocationById(id)**
   - Busca local por ID ou place_id
   - Retorna `LocationData`

3. **createLocationMatch(userId, locationId)**
   - Cria match entre usuário e local
   - Insere na tabela `location_matches`

4. **removeLocationMatch(userId, locationId)**
   - Remove match (rejeição)
   - Atualiza tabela `location_matches`

5. **getUserLocationMatches(userId)**
   - Busca todos os matches do usuário
   - Usado para filtrar locais já vistos

#### MatchService (`src/services/match.service.ts`)

**Métodos Principais:**

1. **getPotentialMatches(userId, limit)**
   - Busca pessoas com locais em comum
   - Calcula compatibilidade
   - Retorna ordenado por score

2. **createPeopleMatch(userId, targetUserId)**
   - Cria match entre pessoas
   - Detecta match mútuo automaticamente
   - Cria chat se mútuo

3. **hasLocationMatches(userId)**
   - Verifica se tem matches com locais
   - Retorna boolean

#### ChatService (`src/services/chat.service.ts`)

**Métodos Principais:**

1. **getUserChats(userId)**
   - Busca todos os chats do usuário
   - Inclui última mensagem e não lidas

2. **getChatById(chatId)**
   - Busca chat específico
   - Inclui informações dos usuários

3. **markChatAsRead(chatId, userId)**
   - Marca chat como lido
   - Atualiza contador de não lidas

4. **subscribeToChats(userId, callback)**
   - Subscribe para mudanças em tempo real

#### MessageService (`src/services/message.service.ts`)

**Métodos Principais:**

1. **sendMessage(chatId, senderId, content)**
   - Envia mensagem
   - Atualiza last_message_at
   - Incrementa contador de não lidas

2. **getMessages(chatId)**
   - Busca mensagens do chat
   - Ordena por data

3. **subscribeToMessages(chatId, userId, callback)**
   - Subscribe para novas mensagens
   - Valida participação

#### UserService (`src/services/user.service.ts`)

**Métodos Principais:**

1. **getUserProfile(userId)**
   - Busca perfil completo
   - Inclui preferências

2. **updateUser(userId, data)**
   - Atualiza informações básicas
   - Valida com Zod

3. **getUserPreferences(userId)**
   - Busca preferências
   - Retorna bebidas, comida, música

4. **updatePreferences(userId, preferences)**
   - Atualiza preferências
   - Valida com Zod

#### GeolocationService (`src/services/geolocation.service.ts`)

**Métodos Principais:**

1. **getCurrentLocation(options)**
   - Solicita GPS do navegador
   - Fallback para geolocalização por IP
   - Retorna coordenadas com precisão

**Opções:**
```typescript
{
  timeout?: number
  maximumAge?: number
  enableHighAccuracy?: boolean
  fallbackToIP?: boolean
}
```

#### GooglePlacesService (`src/services/google-places.service.ts`)

**Métodos Principais:**

1. **geocodeAddress(address)**
   - Converte endereço em coordenadas
   - Usa Google Geocoding API

2. **searchPlaces(query, location, radius)**
   - Busca lugares próximos
   - Usa Google Places API

---

## 🚀 Edge Functions e RPC Functions - Arquitetura Backend

### 📋 Visão Geral

A plataforma LuvBee utiliza uma arquitetura híbrida combinando **Edge Functions** (serverless Deno) e **RPC Functions** (PostgreSQL) para processar operações complexas, proteger chaves de API e otimizar performance.

**Total de Edge Functions:** 11  
**Total de RPC Functions:** ~15+  
**Arquitetura:** Frontend → Edge Functions/RPC → Supabase Database/Google APIs

---

### 🔧 Edge Functions

Edge Functions são funções serverless executadas no Deno runtime do Supabase. Elas resolvem problemas de CORS, protegem chaves de API e processam operações pesadas no servidor.

#### Estrutura de Arquivos

```
supabase/functions/
├── fetch-places-google/          # Busca lugares do Google Places API
│   └── index.ts
├── get-place-details/             # Obtém detalhes de um lugar específico
│   └── index.ts
├── get-place-photo/               # Obtém foto de um lugar (proxy)
│   └── index.ts
├── cache-place-photo/             # Cache de fotos no Supabase Storage
│   └── index.ts
├── process-location-image/        # Processa e salva imagens de locais
│   ├── index.ts
│   ├── deno.json
│   └── README.md
├── create-location/                # Cria novo local manualmente
│   ├── index.ts
│   └── README.md
├── fetch-and-cache-places/        # Busca e cache de lugares (alternativa)
│   └── index.ts
├── search-nearby/                 # Busca lugares próximos
│   └── index.ts
├── potential-matches/             # Busca matches potenciais (alternativa)
│   └── index.ts
├── connections-manage/            # Gerencia conexões entre usuários
│   └── index.ts
└── register-preferences/          # Registra preferências do usuário
    └── index.ts
```

#### 1. fetch-places-google

**Arquivo:** `supabase/functions/fetch-places-google/index.ts`  
**Propósito:** Buscar lugares do Google Places API e salvar no banco de dados

**Fluxo de Comunicação:**
```
Frontend (useVibePlaces.ts)
  ↓
supabase.functions.invoke('fetch-places-google', {
  body: { lat, lng, radius, type }
})
  ↓
Edge Function (Deno Runtime)
  ↓
Google Places API (Nearby Search)
  ↓
Supabase Database (upsert em venues + locations)
  ↓
Response: { data: places[], saved_count: number }
```

**Chamada no Frontend:**
```typescript
// src/hooks/useVibePlaces.ts (linha 127)
supabase.functions.invoke('fetch-places-google', {
  body: { 
    lat: userLocation.lat, 
    lng: userLocation.lng, 
    radius: radius,
    type: mode === 'solo' ? 'night_club|bar' : 'bar|night_club|restaurant'
  }
})
```

**Características:**
- ✅ Não bloqueante (fire-and-forget)
- ✅ Paginação automática (até 3 páginas por tipo)
- ✅ Upsert em duas tabelas (`venues` + `locations`)
- ✅ Registra cache em `search_cache_logs`
- ✅ Validação rigorosa de coordenadas
- ✅ Tratamento de erros robusto

**Variáveis de Ambiente Necessárias:**
- `GOOGLE_MAPS_BACKEND_KEY` ou `GOOGLE_MAPS_API_KEY`
- `SUPABASE_URL` (automático)
- `SUPABASE_SERVICE_ROLE_KEY` (automático)

**Melhorias Sugeridas:**
1. ⚠️ **Rate Limiting:** Implementar controle de taxa para evitar exceder limites da Google API
2. ⚠️ **Retry Logic:** Adicionar retry automático em caso de falha temporária
3. ⚠️ **Batch Processing:** Processar lugares em lotes para melhor performance
4. ⚠️ **Error Tracking:** Integrar com serviço de monitoramento (Sentry, LogRocket)

#### 2. get-place-details

**Arquivo:** `supabase/functions/get-place-details/index.ts`  
**Propósito:** Proxy para Google Places Details API (protege chave de API)

**Fluxo de Comunicação:**
```
Frontend (usePlacePhoto.ts / GooglePlacesService)
  ↓
supabase.functions.invoke('get-place-details', {
  body: { place_id, fields: ['photos'] }
})
  ↓
Edge Function (Deno Runtime)
  ↓
Google Places API (Place Details)
  ↓
Response: { data: { photos: [...] } }
```

**Chamada no Frontend:**
```typescript
// Usado indiretamente via cache-place-photo
// Mas pode ser chamado diretamente:
const { data, error } = await supabase.functions.invoke('get-place-details', {
  body: { place_id: 'ChIJ...', fields: ['photos', 'rating'] }
})
```

**Características:**
- ✅ Protege chave de API do frontend
- ✅ Resolve problemas de CORS
- ✅ Validação rigorosa de `place_id`
- ✅ Logs detalhados para debug
- ✅ Tratamento de erros do Google API

**Melhorias Sugeridas:**
1. ⚠️ **Caching:** Implementar cache de detalhes no banco (evitar chamadas repetidas)
2. ⚠️ **Field Validation:** Validar campos solicitados contra lista permitida
3. ⚠️ **Response Compression:** Comprimir respostas grandes

#### 3. cache-place-photo

**Arquivo:** `supabase/functions/cache-place-photo/index.ts`  
**Propósito:** Baixar e cachear fotos do Google Places no Supabase Storage

**Fluxo de Comunicação:**
```
Frontend (usePlacePhoto.ts)
  ↓
invokeCachePlacePhoto(placeId, { maxWidth: 800 })
  ↓
supabase.functions.invoke('cache-place-photo', {
  body: { place_id, maxWidth, photo_reference? }
})
  ↓
Edge Function:
  1. Verifica se já existe no Storage
  2. Se não existe:
     - Busca photo_reference (se necessário)
     - Baixa imagem do Google Places
     - Faz upload para Supabase Storage (bucket 'div')
     - Registra em cached_place_photos
  ↓
Response: { imageUrl: string }
```

**Chamada no Frontend:**
```typescript
// src/lib/cache-place-photo-helper.ts (linha 26)
const { data, error } = await supabase.functions.invoke('cache-place-photo', {
  body: {
    place_id: placeId,
    maxWidth: 800,
    photo_reference: photoReference // opcional
  }
})
```

**Características:**
- ✅ Verifica cache antes de baixar
- ✅ Suporta múltiplas fontes (Google Places API, OAuth, URL direta)
- ✅ Fallback automático se photo_reference não fornecido
- ✅ Armazena em bucket `div` com estrutura `places/{placeId}/{timestamp}.jpg`
- ✅ Registra em tabela `cached_place_photos`

**Melhorias Sugeridas:**
1. ⚠️ **Image Optimization:** Redimensionar/otimizar imagens antes de salvar
2. ⚠️ **CDN Integration:** Usar CDN para servir imagens cacheadas
3. ⚠️ **Cleanup Job:** Remover fotos antigas não utilizadas
4. ⚠️ **Multiple Sizes:** Gerar múltiplos tamanhos (thumbnail, medium, large)

#### 4. process-location-image

**Arquivo:** `supabase/functions/process-location-image/index.ts`  
**Propósito:** Processar e salvar imagens de locais (similar a cache-place-photo mas específico para locations)

**Fluxo de Comunicação:**
```
Frontend (ImageStorageService.processLocationImage)
  ↓
supabase.functions.invoke('process-location-image', {
  body: { locationId, googlePlaceId?, photoReference? }
})
  ↓
Edge Function:
  1. Verifica se imagem já existe no Storage
  2. Busca photo_reference (se necessário via get-place-details)
  3. Baixa imagem do Google Places
  4. Faz upload para Supabase Storage
  5. Atualiza campo image_url na tabela locations
  ↓
Response: { imageUrl: string, success: boolean }
```

**Chamada no Frontend:**
```typescript
// src/services/image-storage.service.ts (linha 257)
const { data, error } = await supabase.functions.invoke('process-location-image', {
  body: {
    locationId,
    googlePlaceId,
    photoReference
  }
})
```

**Características:**
- ✅ Atualiza campo `image_url` na tabela `locations`
- ✅ Verifica duplicatas antes de processar
- ✅ Estrutura similar a `cache-place-photo` mas específica para locations

**Melhorias Sugeridas:**
1. ⚠️ **Unificação:** Considerar unificar com `cache-place-photo` para evitar duplicação
2. ⚠️ **Batch Processing:** Processar múltiplas imagens em lote

#### 5. Outras Edge Functions

**create-location:** Cria local manualmente via admin  
**fetch-and-cache-places:** Alternativa a fetch-places-google  
**search-nearby:** Busca lugares próximos (alternativa)  
**potential-matches:** Busca matches potenciais (alternativa)  
**connections-manage:** Gerencia conexões entre usuários  
**register-preferences:** Registra preferências do usuário

**Status:** Algumas dessas funções podem estar duplicadas ou não utilizadas. Recomenda-se auditoria.

---

### 🗄️ RPC Functions (PostgreSQL)

RPC Functions são funções SQL armazenadas no PostgreSQL que executam lógica complexa diretamente no banco de dados, oferecendo melhor performance e segurança.

#### Estrutura de Arquivos

```
supabase/migrations/
├── 20250128000000_add_get_nearby_locations_function.sql
├── 20250128000002_create_compatibility_functions.sql
├── 20250128000004_filter_unmatched_locations.sql
└── ... (outras migrations com RPC functions)
```

#### Principais RPC Functions

##### 1. get_places_nearby

**Arquivo:** Migration `20250128000000_add_get_nearby_locations_function.sql`  
**Propósito:** Buscar lugares próximos usando cálculo de distância geográfica

**Chamada no Frontend:**
```typescript
// src/hooks/useVibePlaces.ts (linha 157)
const { data, error } = await supabase.rpc('get_places_nearby', {
  lat: userLocation.lat,
  long: userLocation.lng,
  radius_meters: radius,
  filter_adult: mode === 'solo'
})
```

**Parâmetros:**
- `lat`: Latitude (DECIMAL)
- `long`: Longitude (DECIMAL)
- `radius_meters`: Raio em metros (INTEGER)
- `filter_adult`: Filtrar conteúdo adulto (BOOLEAN)

**Retorno:**
- Tabela com colunas: `id`, `name`, `address`, `lat`, `lng`, `distance_meters`, etc.

**Características:**
- ✅ Usa cálculo de distância Haversine
- ✅ Filtra por raio e modo (solo/normal)
- ✅ Retorna distância calculada
- ✅ Performance otimizada com índices

**Melhorias Sugeridas:**
1. ⚠️ **PostGIS:** Considerar usar PostGIS para cálculos geográficos mais precisos
2. ⚠️ **Caching:** Implementar cache de resultados para coordenadas frequentes
3. ⚠️ **Pagination:** Melhorar paginação para grandes volumes

##### 2. get_places_by_city_state

**Arquivo:** Migration relacionada  
**Propósito:** Buscar lugares por cidade e estado (quando GPS não disponível)

**Chamada no Frontend:**
```typescript
// src/hooks/useVibePlaces.ts (linha 71)
const { data, error } = await supabase.rpc('get_places_by_city_state', {
  city: manualCity,
  state: manualState,
  filter_adult: mode === 'solo'
})
```

**Características:**
- ✅ Busca sem necessidade de GPS
- ✅ Filtra por modo Solo/Normal
- ✅ Usado como fallback quando GPS falha

##### 3. get_potential_matches

**Arquivo:** Migration `20250128000002_create_compatibility_functions.sql`  
**Propósito:** Buscar pessoas com locais em comum para matching

**Chamada no Frontend:**
```typescript
// src/services/match.service.ts (linha 47)
const { data, error } = await supabase.rpc('get_potential_matches', {
  p_user_id: userId,
  match_limit: limit
})
```

**Características:**
- ✅ Filtra apenas pessoas com locais em comum
- ✅ Calcula compatibilidade
- ✅ Ordena por score de compatibilidade
- ✅ Exclui usuários já com match

**Melhorias Sugeridas:**
1. ⚠️ **Caching:** Cache de resultados por usuário (atualizar quando novos matches)
2. ⚠️ **Incremental Loading:** Carregar mais resultados sob demanda

##### 4. create_people_match

**Arquivo:** Migration `20250128000002_create_compatibility_functions.sql`  
**Propósito:** Criar match entre duas pessoas

**Chamada no Frontend:**
```typescript
// src/services/match.service.ts (linha 76)
const { data, error } = await supabase.rpc('create_people_match', {
  p_user_id: userId,
  p_target_user_id: targetUserId
})
```

**Características:**
- ✅ Detecta match mútuo automaticamente
- ✅ Cria chat automaticamente se match mútuo
- ✅ Atualiza compatibility_score
- ✅ Trigger automático para criação de chat

##### 5. calculate_compatibility_score

**Arquivo:** Migration `20250128000002_create_compatibility_functions.sql`  
**Propósito:** Calcular score de compatibilidade entre dois usuários

**Chamada no Frontend:**
```typescript
// src/services/compatibility.service.ts (linha 31)
const { data, error } = await supabase.rpc('calculate_compatibility_score', {
  p_user_id_1: userId1,
  p_user_id_2: userId2
})
```

**Fórmula de Cálculo:**
- 50% preferências (bebidas, comida, música)
- 30% locais em comum
- 20% outros fatores

##### 6. check_search_cache

**Arquivo:** Migration relacionada  
**Propósito:** Verificar se busca já foi cacheadas recentemente

**Chamada no Frontend:**
```typescript
// src/hooks/useVibePlaces.ts (linha 102)
const { data: cacheStatus } = await supabase.rpc('check_search_cache', {
  lat: userLocation.lat,
  long: userLocation.lng,
  radius_meters: radius,
  max_age_days: maxCacheAge
})
```

**Características:**
- ✅ Evita buscas repetidas no Google Places
- ✅ Verifica idade do cache
- ✅ Retorna status: 'valid' | 'expired' | 'none'

##### 7. Outras RPC Functions

- `get_recent_conversations`: Busca conversas recentes
- `filter_unmatched_locations`: Filtra locais sem match
- `get_cached_photo_url`: Obtém URL de foto cacheada
- `exec_sql`: Executa SQL dinâmico (usado em migrations)

---

### 🔄 Fluxo de Comunicação Completo

#### Exemplo: Buscar Lugares Próximos

```
1. Frontend (VibeLocalPage)
   ↓
2. useVibePlaces hook
   ↓
3. Verifica cache (RPC: check_search_cache)
   ↓
4a. Se cache expirado:
    → Edge Function: fetch-places-google (background, não bloqueante)
   ↓
4b. Busca no banco (RPC: get_places_nearby)
   ↓
5. Filtra matches existentes (LocationService.getUserLocationMatches)
   ↓
6. Renderiza LocationSwipe
   ↓
7. Para cada local:
    → Hook: usePlacePhoto
    → Edge Function: cache-place-photo (se necessário)
    → Renderiza LocationCard
```

#### Exemplo: Match com Pessoa

```
1. Frontend (PeoplePage)
   ↓
2. Verifica pré-requisito (RPC: has_location_matches)
   ↓
3. Busca matches potenciais (RPC: get_potential_matches)
   ↓
4. Renderiza PersonSwipe
   ↓
5. Usuário dá like:
    → RPC: create_people_match
    ↓
6. Se match mútuo:
    → Trigger automático cria chat
    ↓
7. Atualiza UI
```

---

### 📊 Análise de Melhorias e Refatorações

#### 🔴 Problemas Identificados

1. **Duplicação de Código:**
   - `cache-place-photo` e `process-location-image` têm lógica muito similar
   - Múltiplas Edge Functions para busca de lugares (`fetch-places-google`, `fetch-and-cache-places`, `search-nearby`)
   - **Solução:** Unificar funções similares em uma única função parametrizada

2. **Falta de Padronização:**
   - Algumas Edge Functions usam `serve()` do Deno std, outras usam `Deno.serve()`
   - Headers CORS duplicados em cada função
   - **Solução:** Criar biblioteca compartilhada de utilitários

3. **Tratamento de Erros Inconsistente:**
   - Algumas funções retornam `{ error: string }`, outras `{ success: boolean, error?: string }`
   - **Solução:** Padronizar formato de resposta

4. **Falta de Monitoramento:**
   - Sem métricas de performance
   - Sem alertas de erro
   - **Solução:** Integrar logging estruturado e métricas

5. **Cache Ineficiente:**
   - Múltiplas verificações de cache em diferentes camadas
   - Sem invalidação inteligente
   - **Solução:** Implementar sistema de cache centralizado

#### 🟡 Melhorias Sugeridas

1. **Criar Biblioteca Compartilhada:**
```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// supabase/functions/_shared/response.ts
export function successResponse(data: any) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

export function errorResponse(error: string, status = 500) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

2. **Unificar Funções de Cache de Fotos:**
```typescript
// Nova função unificada: cache-photo
// Parâmetros: { type: 'place' | 'location', id: string, ... }
// Substitui: cache-place-photo e process-location-image
```

3. **Implementar Rate Limiting:**
```typescript
// Usar Supabase Edge Function rate limiting
// Ou implementar próprio com Redis/PostgreSQL
```

4. **Adicionar Logging Estruturado:**
```typescript
// Usar console.log com formato JSON estruturado
console.log(JSON.stringify({
  level: 'info',
  function: 'fetch-places-google',
  timestamp: new Date().toISOString(),
  data: { ... }
}))
```

5. **Otimizar RPC Functions:**
   - Adicionar índices para queries frequentes
   - Usar PostGIS para cálculos geográficos
   - Implementar materialized views para dados complexos

#### 🟢 Refatorações Prioritárias

**Prioridade Alta:**
1. ✅ Unificar `cache-place-photo` e `process-location-image`
2. ✅ Criar biblioteca compartilhada de utilitários
3. ✅ Padronizar formato de resposta

**Prioridade Média:**
4. ⚠️ Implementar rate limiting
5. ⚠️ Adicionar logging estruturado
6. ⚠️ Otimizar RPC functions com índices

**Prioridade Baixa:**
7. ⚠️ Adicionar testes automatizados para Edge Functions
8. ⚠️ Implementar monitoramento e alertas
9. ⚠️ Documentar todas as RPC functions

---

### 📝 Notas Finais

Esta documentação cobre todas as páginas principais da plataforma LuvBee. Cada página está funcional e pronta para uso, com algumas melhorias pendentes de UX e funcionalidades secundárias.

**Próximos Passos Sugeridos:**
1. Completar Settings no Profile
2. Adicionar typing indicators no chat
3. Melhorar filtros em Locations
4. Otimizar performance com lazy loading
5. Adicionar testes automatizados
6. **Refatorar Edge Functions (unificar duplicadas)**
7. **Implementar rate limiting e monitoramento**
8. **Otimizar RPC functions com índices e PostGIS**

---

**Última Atualização:** 30 de Janeiro de 2025  
**Mantido por:** Equipe LuvBee Development

