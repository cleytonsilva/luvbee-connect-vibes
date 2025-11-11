# API Contracts: LuvBee Core Platform

**Branch**: `001-luvbee-core-platform` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

## Overview

Este documento define todos os contratos de API para a plataforma LuvBee, incluindo endpoints do Supabase (PostgREST), schemas de validação Zod, e contratos de integração com serviços externos.

## Supabase PostgREST API

### Autenticação

Todos os endpoints (exceto registro/login) requerem autenticação via JWT token do Supabase Auth.

**Headers obrigatórios**:
```
Authorization: Bearer <supabase_jwt_token>
apikey: <supabase_anon_key>
```

---

### 1. Autenticação e Usuários

#### POST `/auth/v1/signup`
Cria uma nova conta de usuário.

**Request Body**:
```typescript
{
  email: string;        // Email válido
  password: string;    // Mínimo 6 caracteres
  name: string;        // Nome completo
  age: number;         // Idade (18-120)
}
```

**Response** (201 Created):
```typescript
{
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}
```

**Validação Zod**:
```typescript
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).max(120),
});
```

---

#### POST `/auth/v1/token`
Login de usuário existente.

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Response** (200 OK):
```typescript
{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}
```

---

#### GET `/rest/v1/users?id=eq.{user_id}&select=*`
Busca informações do perfil do usuário.

**Query Parameters**:
- `id`: UUID do usuário (opcional, padrão: usuário autenticado)
- `select`: Campos a retornar (padrão: `*`)

**Response** (200 OK):
```typescript
{
  id: string;
  email: string;
  name: string;
  age: number;
  photo_url: string | null;
  bio: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  search_radius_km: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}[]
```

---

#### PATCH `/rest/v1/users?id=eq.{user_id}`
Atualiza informações do perfil do usuário.

**Request Body** (todos os campos opcionais):
```typescript
{
  name?: string;
  age?: number;
  photo_url?: string;
  bio?: string;
  location_latitude?: number;
  location_longitude?: number;
  search_radius_km?: number;
}
```

**Response** (204 No Content ou 200 OK com dados atualizados)

---

### 2. Preferências do Usuário

#### GET `/rest/v1/user_preferences?user_id=eq.{user_id}&select=*`
Busca preferências do usuário.

**Response** (200 OK):
```typescript
{
  id: string;
  user_id: string;
  drink_preferences: string[];
  food_preferences: string[];
  music_preferences: string[];
  vibe_preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}[]
```

---

#### POST `/rest/v1/user_preferences`
Cria preferências do usuário (durante onboarding).

**Request Body**:
```typescript
{
  user_id: string;
  drink_preferences: string[];      // Máximo 10 itens
  food_preferences: string[];       // Máximo 10 itens
  music_preferences: string[];      // Máximo 10 itens
  vibe_preferences?: Record<string, any>;
}
```

**Validação Zod**:
```typescript
const preferencesSchema = z.object({
  user_id: z.string().uuid(),
  drink_preferences: z.array(z.string()).min(1).max(10),
  food_preferences: z.array(z.string()).min(1).max(10),
  music_preferences: z.array(z.string()).min(1).max(10),
  vibe_preferences: z.record(z.any()).optional(),
});
```

**Response** (201 Created):
```typescript
{
  id: string;
  user_id: string;
  drink_preferences: string[];
  food_preferences: string[];
  music_preferences: string[];
  created_at: string;
}
```

---

#### PATCH `/rest/v1/user_preferences?user_id=eq.{user_id}`
Atualiza preferências do usuário.

**Request Body**: Mesmo formato do POST (todos os campos opcionais)

---

### 3. Locais

#### GET `/rest/v1/locations?select=*&is_active=eq.true&order=name.asc`
Lista locais ativos.

**Query Parameters**:
- `select`: Campos a retornar
- `is_active`: Filtrar apenas ativos (padrão: `true`)
- `type`: Filtrar por tipo (ex: `type=eq.bar`)
- `is_curated`: Filtrar apenas curados (ex: `is_curated=eq.true`)
- `order`: Ordenação (ex: `order=name.asc`)
- `limit`: Limite de resultados (padrão: 50, máximo: 1000)
- `offset`: Paginação

**Response** (200 OK):
```typescript
{
  id: string;
  google_place_id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  description: string | null;
  rating: number | null;
  price_level: number | null;
  is_active: boolean;
  is_curated: boolean;
}[]
```

---

#### GET `/rest/v1/locations?id=eq.{location_id}&select=*`
Busca detalhes de um local específico.

**Response** (200 OK): Objeto único com todos os campos

---

#### POST `/rest/v1/locations` (Service Role apenas)
Cria um novo local (sincronização com Google Places).

**Request Body**:
```typescript
{
  google_place_id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  description?: string;
  rating?: number;
  price_level?: number;
  google_places_data?: Record<string, any>;
}
```

---

### 4. Matches com Locais

#### GET `/rest/v1/location_matches?user_id=eq.{user_id}&select=*,locations(*)&order=matched_at.desc`
Lista matches do usuário com locais.

**Response** (200 OK):
```typescript
{
  id: string;
  user_id: string;
  location_id: string;
  matched_at: string;
  status: 'active' | 'inactive';
  locations: {
    id: string;
    name: string;
    type: string;
    address: string;
    photo_url: string | null;
  };
}[]
```

---

#### POST `/rest/v1/location_matches`
Cria um match entre usuário e local (like).

**Request Body**:
```typescript
{
  user_id: string;
  location_id: string;
}
```

**Validação Zod**:
```typescript
const locationMatchSchema = z.object({
  user_id: z.string().uuid(),
  location_id: z.string().uuid(),
});
```

**Response** (201 Created):
```typescript
{
  id: string;
  user_id: string;
  location_id: string;
  matched_at: string;
  status: 'active';
}
```

---

#### PATCH `/rest/v1/location_matches?id=eq.{match_id}`
Atualiza status do match (ex: desfazer match).

**Request Body**:
```typescript
{
  status: 'inactive';
}
```

---

### 5. Matches com Pessoas

#### GET `/rest/v1/people_matches?or=(user1_id.eq.{user_id},user2_id.eq.{user_id})&select=*,user1:users!people_matches_user1_id_fkey(*),user2:users!people_matches_user2_id_fkey(*)&order=compatibility_score.desc`
Lista matches do usuário com pessoas, ordenados por compatibilidade.

**Response** (200 OK):
```typescript
{
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string | null;
  status: 'pending' | 'mutual' | 'unmatched';
  compatibility_score: number | null;
  common_locations_count: number;
  user1: {
    id: string;
    name: string;
    age: number;
    photo_url: string | null;
  };
  user2: {
    id: string;
    name: string;
    age: number;
    photo_url: string | null;
  };
}[]
```

---

#### POST `/rest/v1/people_matches`
Cria ou atualiza um match entre usuários (like).

**Request Body**:
```typescript
{
  user1_id: string;    // Sempre o menor ID
  user2_id: string;    // Sempre o maior ID
}
```

**Validação Zod**:
```typescript
const peopleMatchSchema = z.object({
  user1_id: z.string().uuid(),
  user2_id: z.string().uuid(),
}).refine((data) => data.user1_id < data.user2_id, {
  message: "user1_id must be less than user2_id",
});
```

**Response** (201 Created ou 200 OK):
```typescript
{
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'mutual';
  matched_at: string | null;
  compatibility_score: number | null;
}
```

**Nota**: Se ambos os usuários já deram like, o status muda automaticamente para 'mutual' e um chat é criado.

---

### 6. Chats

#### GET `/rest/v1/chats?or=(user1_id.eq.{user_id},user2_id.eq.{user_id})&select=*,user1:users!chats_user1_id_fkey(*),user2:users!chats_user2_id_fkey(*),messages:messages(*,sender:users!messages_sender_id_fkey(*))&order=last_message_at.desc.nullslast`
Lista todos os chats do usuário com última mensagem.

**Response** (200 OK):
```typescript
{
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string | null;
  user1_unread_count: number;
  user2_unread_count: number;
  user1: {
    id: string;
    name: string;
    photo_url: string | null;
  };
  user2: {
    id: string;
    name: string;
    photo_url: string | null;
  };
  messages: {
    id: string;
    content: string;
    sent_at: string;
    read_at: string | null;
    sender: {
      id: string;
      name: string;
    };
  }[];
}[]
```

---

#### GET `/rest/v1/chats?id=eq.{chat_id}&select=*`
Busca detalhes de um chat específico.

---

#### POST `/rest/v1/chats` (Automático)
Chat é criado automaticamente quando há match mútuo. Não deve ser chamado manualmente.

---

### 7. Mensagens

#### GET `/rest/v1/messages?chat_id=eq.{chat_id}&select=*,sender:users!messages_sender_id_fkey(*)&order=sent_at.asc&limit=50`
Lista mensagens de um chat (paginação).

**Query Parameters**:
- `chat_id`: UUID do chat
- `limit`: Limite de mensagens (padrão: 50, máximo: 100)
- `offset`: Paginação

**Response** (200 OK):
```typescript
{
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
  sender: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}[]
```

---

#### POST `/rest/v1/messages`
Envia uma nova mensagem.

**Request Body**:
```typescript
{
  chat_id: string;
  sender_id: string;
  content: string;      // Máximo 2000 caracteres
}
```

**Validação Zod**:
```typescript
const messageSchema = z.object({
  chat_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});
```

**Response** (201 Created):
```typescript
{
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  read_at: null;
}
```

---

#### PATCH `/rest/v1/messages?id=eq.{message_id}`
Marca mensagem como lida ou deletada.

**Request Body**:
```typescript
{
  read_at?: string;      // ISO timestamp
  is_deleted?: boolean;
}
```

---

## Supabase Realtime

### Subscription: Novas Mensagens

```typescript
const channel = supabase
  .channel(`chat:${chatId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `chat_id=eq.${chatId}`,
  }, (payload) => {
    // Nova mensagem recebida
    console.log('New message:', payload.new);
  })
  .subscribe();
```

### Subscription: Status de Leitura

```typescript
const channel = supabase
  .channel(`chat:${chatId}:read`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
    filter: `chat_id=eq.${chatId}`,
  }, (payload) => {
    // Mensagem foi lida
    console.log('Message read:', payload.new);
  })
  .subscribe();
```

---

## Google Places API

### GET `/places/api/place/nearbysearch`
Busca locais próximos a uma localização.

**Query Parameters**:
- `location`: `{latitude},{longitude}`
- `radius`: Raio em metros (máximo 50000)
- `type`: Tipo de local (ex: `bar`, `night_club`, `restaurant`)
- `key`: API key do Google

**Response**: Formato padrão do Google Places API

**Validação**: Dados devem ser validados e normalizados antes de salvar no banco.

---

### GET `/places/api/place/details`
Busca detalhes completos de um local.

**Query Parameters**:
- `place_id`: ID do local no Google Places
- `fields`: Campos a retornar
- `key`: API key do Google

**Response**: Formato padrão do Google Places API

---

## Schemas Zod Completos

Todos os schemas devem ser definidos em `src/lib/validations.ts`:

```typescript
// User schemas
export const signupSchema = z.object({...});
export const loginSchema = z.object({...});
export const updateUserSchema = z.object({...});

// Preferences schemas
export const preferencesSchema = z.object({...});

// Location schemas
export const locationMatchSchema = z.object({...});

// People match schemas
export const peopleMatchSchema = z.object({...});

// Message schemas
export const messageSchema = z.object({...});
```

---

## Error Responses

Todos os endpoints devem retornar erros no formato:

```typescript
{
  error: {
    code: string;           // Código do erro
    message: string;        // Mensagem legível
    details?: any;          // Detalhes adicionais
  }
}
```

**Códigos de erro comuns**:
- `AUTH_REQUIRED`: Autenticação necessária
- `VALIDATION_ERROR`: Erro de validação
- `NOT_FOUND`: Recurso não encontrado
- `FORBIDDEN`: Sem permissão
- `RATE_LIMIT_EXCEEDED`: Limite de requisições excedido

