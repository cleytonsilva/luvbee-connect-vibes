# Data Model: LuvBee Core Platform

**Branch**: `001-luvbee-core-platform` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

## Overview

Este documento define o modelo de dados completo para a plataforma LuvBee, incluindo todas as tabelas do Supabase PostgreSQL, relacionamentos, constraints, validações e políticas de Row Level Security (RLS).

## Database Schema

### Tabela: `users` (extends Supabase Auth)

**Descrição**: Armazena informações básicas do perfil do usuário. Estende a tabela `auth.users` do Supabase. **NOTA**: Esta tabela será migrada da estrutura existente que usa `preferences JSONB` para uma estrutura com `user_preferences` separado (melhoria do spec-kit).

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid(), REFERENCES auth.users(id) | ID único do usuário (mesmo do auth.users) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') | Email do usuário (sincronizado com auth.users) |
| `name` | VARCHAR(100) | NOT NULL | Nome completo do usuário |
| `age` | INTEGER | NULLABLE, CHECK (age >= 18 AND age <= 120) | Idade do usuário (deve ser maior de 18) |
| `avatar_url` | TEXT | NULLABLE | URL da foto de perfil (armazenada no Supabase Storage bucket `avatars`) |
| `bio` | TEXT | NULLABLE, MAX 500 chars | Biografia breve do usuário |
| `location` | VARCHAR(100) | NULLABLE | Localização textual do usuário (legado - será migrado para coordenadas) |
| `location_latitude` | DECIMAL(10, 8) | NULLABLE | Latitude da localização atual do usuário (novo campo) |
| `location_longitude` | DECIMAL(11, 8) | NULLABLE | Longitude da localização atual do usuário (novo campo) |
| `search_radius_km` | INTEGER | DEFAULT 10, CHECK (search_radius_km >= 1 AND search_radius_km <= 100) | Raio de busca em km (padrão 10km) |
| `onboarding_completed` | BOOLEAN | DEFAULT FALSE, NOT NULL | Indica se o usuário completou o onboarding |
| `preferences` | JSONB | NULLABLE, DEFAULT '{}' | **LEGADO**: Preferências antigas (será migrado para `user_preferences`) |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Indica se o usuário está ativo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação do perfil |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data da última atualização |

**Índices**:
- `idx_users_email` ON `email`
- `idx_users_active` ON `is_active`
- `idx_users_location` ON `location_latitude, location_longitude` (para busca por proximidade)
- `idx_users_onboarding` ON `onboarding_completed`
- `idx_users_created_at` ON `created_at DESC`

**RLS Policies**:
- **SELECT**: Usuários podem ver apenas seus próprios dados + perfis públicos de outros usuários (quando há match)
- **INSERT**: Apenas o próprio usuário pode criar seu perfil
- **UPDATE**: Usuários podem atualizar apenas seus próprios dados
- **DELETE**: Soft delete apenas pelo próprio usuário

---

### Tabela: `user_preferences`

**Descrição**: Armazena as preferências do usuário coletadas durante o onboarding (drinks, comidas, música, etc.).

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único da preferência |
| `user_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, UNIQUE, NOT NULL | ID do usuário (um usuário tem apenas um registro de preferências) |
| `drink_preferences` | TEXT[] | NOT NULL, DEFAULT '{}' | Array de preferências de drinks (ex: ['cerveja', 'vinho', 'cocktail']) |
| `food_preferences` | TEXT[] | NOT NULL, DEFAULT '{}' | Array de preferências de comida (ex: ['pizza', 'sushi', 'hamburguer']) |
| `music_preferences` | TEXT[] | NOT NULL, DEFAULT '{}' | Array de preferências musicais (ex: ['rock', 'eletrônica', 'sertanejo']) |
| `vibe_preferences` | JSONB | NULLABLE | Preferências adicionais de vibe (ex: ambiente, horário preferido, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data da última atualização |

**Índices**:
- `idx_user_preferences_user_id` ON `user_id` (único)
- `idx_user_preferences_drinks` USING GIN ON `drink_preferences` (para busca eficiente)
- `idx_user_preferences_food` USING GIN ON `food_preferences`
- `idx_user_preferences_music` USING GIN ON `music_preferences`

**RLS Policies**:
- **SELECT**: Usuários podem ver suas próprias preferências + preferências de usuários com match mútuo
- **INSERT**: Apenas o próprio usuário pode criar suas preferências
- **UPDATE**: Usuários podem atualizar apenas suas próprias preferências
- **DELETE**: CASCADE quando usuário é deletado

**Validações**:
- Arrays não podem estar vazios após onboarding completo
- Cada array pode ter no máximo 10 itens
- Valores devem estar em lista pré-definida (validado no frontend com Zod)

---

### Tabela: `locations`

**Descrição**: Armazena informações de locais (bares, baladas, eventos) obtidas via Google Places API. **NOTA**: Esta tabela será migrada da estrutura existente que usa `category VARCHAR` e `location POINT` para incluir integração com Google Places.

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único do local |
| `google_place_id` | TEXT | UNIQUE, NULLABLE | ID do local no Google Places API (novo campo para integração) |
| `name` | VARCHAR(200) | NOT NULL | Nome do local |
| `category` | VARCHAR(50) | NOT NULL | **LEGADO**: Categoria do local (será mapeado para `type`) |
| `type` | VARCHAR(50) | NULLABLE | Tipo do local (ex: 'bar', 'nightclub', 'restaurant', 'event') - novo campo |
| `address` | TEXT | NOT NULL | Endereço completo |
| `location` | POINT | NULLABLE | **LEGADO**: Coordenadas geográficas (PostGIS POINT) |
| `latitude` | DECIMAL(10, 8) | NULLABLE | Latitude do local (novo campo, extraído de `location` ou Google Places) |
| `longitude` | DECIMAL(11, 8) | NULLABLE | Longitude do local (novo campo, extraído de `location` ou Google Places) |
| `images` | TEXT[] | DEFAULT '{}' | Array de URLs de imagens (armazenadas no Supabase Storage bucket `locations`) |
| `photo_url` | TEXT | NULLABLE | URL da foto principal (primeira do array `images` ou do Google Places) |
| `description` | TEXT | NULLABLE, MAX 1000 chars | Descrição do local |
| `phone` | VARCHAR(20) | NULLABLE | Telefone do local |
| `website` | TEXT | NULLABLE | Website do local |
| `rating` | DECIMAL(3, 2) | DEFAULT 0.00, CHECK (rating >= 0 AND rating <= 5) | Rating do Google Places ou média de reviews (0-5) |
| `price_level` | INTEGER | NULLABLE, CHECK (price_level >= 1 AND price_level <= 4) | Nível de preço (1=barato, 4=caro) - novo campo |
| `opening_hours` | JSONB | DEFAULT '{}' | Horários de funcionamento (formato do Google Places) |
| `google_places_data` | JSONB | NULLABLE | Dados completos do Google Places (cache) - novo campo |
| `owner_id` | UUID | REFERENCES users(id) ON DELETE SET NULL, NULLABLE | ID do proprietário/usuário que adicionou o local |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Indica se o local está ativo (não fechou) |
| `is_verified` | BOOLEAN | DEFAULT FALSE, NOT NULL | Indica se o local foi verificado pela equipe |
| `is_curated` | BOOLEAN | DEFAULT FALSE, NOT NULL | Indica se é um local curado pela equipe - novo campo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação do registro |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data da última atualização |
| `last_synced_at` | TIMESTAMPTZ | NULLABLE | Data da última sincronização com Google Places - novo campo |

**Índices**:
- `idx_locations_category` ON `category` (legado)
- `idx_locations_type` ON `type` (novo)
- `idx_locations_google_place_id` ON `google_place_id` (único, novo)
- `idx_locations_rating` ON `rating DESC`
- `idx_locations_verified` ON `is_verified`
- `idx_locations_active` ON `is_active`
- `idx_locations_curated` ON `is_curated` (novo)
- `idx_locations_owner` ON `owner_id`
- `idx_locations_created_at` ON `created_at DESC`
- `idx_locations_geo` ON `location` USING GIST (PostGIS, legado)
- `idx_locations_location` ON `latitude, longitude` (para busca por proximidade, novo)

**RLS Policies**:
- **SELECT**: Todos os usuários autenticados podem ver locais ativos
- **INSERT**: Apenas sistema (via service role) pode criar locais
- **UPDATE**: Apenas sistema pode atualizar locais
- **DELETE**: Soft delete apenas pelo sistema (marca is_active = FALSE)

**Validações**:
- `google_place_id` deve ser único
- Coordenadas devem ser válidas (latitude: -90 a 90, longitude: -180 a 180)
- `type` deve estar em lista pré-definida

---

### Tabela: `location_matches`

**Descrição**: Armazena matches entre usuários e locais (quando usuário dá like em um local).

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único do match |
| `user_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do usuário |
| `location_id` | UUID | REFERENCES locations(id) ON DELETE CASCADE, NOT NULL | ID do local |
| `matched_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data/hora do match |
| `status` | TEXT | DEFAULT 'active', NOT NULL, CHECK (status IN ('active', 'inactive')) | Status do match |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação |

**Índices**:
- `idx_location_matches_user_location` ON `user_id, location_id` (único composto)
- `idx_location_matches_user` ON `user_id`
- `idx_location_matches_location` ON `location_id`
- `idx_location_matches_matched_at` ON `matched_at DESC`

**RLS Policies**:
- **SELECT**: Usuários podem ver apenas seus próprios matches + matches de outros usuários quando há match mútuo em pessoas
- **INSERT**: Usuários podem criar apenas seus próprios matches
- **UPDATE**: Usuários podem atualizar apenas seus próprios matches
- **DELETE**: CASCADE quando usuário ou local é deletado

**Validações**:
- Um usuário não pode dar match duas vezes no mesmo local (único composto user_id + location_id)
- `status` deve ser 'active' ou 'inactive'

---

### Tabela: `people_matches`

**Descrição**: Armazena matches entre dois usuários. Quando ambos dão like, status muda para 'mutual'.

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único do match |
| `user1_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do primeiro usuário (sempre menor que user2_id) |
| `user2_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do segundo usuário (sempre maior que user1_id) |
| `user1_liked_at` | TIMESTAMPTZ | NULLABLE | Data/hora que user1 deu like |
| `user2_liked_at` | TIMESTAMPTZ | NULLABLE | Data/hora que user2 deu like |
| `matched_at` | TIMESTAMPTZ | NULLABLE | Data/hora do match mútuo (quando ambos deram like) |
| `status` | TEXT | DEFAULT 'pending', NOT NULL, CHECK (status IN ('pending', 'mutual', 'unmatched')) | Status do match |
| `compatibility_score` | DECIMAL(5, 2) | NULLABLE, CHECK (compatibility_score >= 0 AND compatibility_score <= 100) | Score de compatibilidade calculado (0-100) |
| `common_locations_count` | INTEGER | DEFAULT 0, NOT NULL | Quantidade de locais em comum |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data da última atualização |

**Índices**:
- `idx_people_matches_users` ON `user1_id, user2_id` (único composto)
- `idx_people_matches_user1` ON `user1_id`
- `idx_people_matches_user2` ON `user2_id`
- `idx_people_matches_status` ON `status`
- `idx_people_matches_compatibility` ON `compatibility_score DESC NULLS LAST`
- `idx_people_matches_matched_at` ON `matched_at DESC NULLS LAST`

**RLS Policies**:
- **SELECT**: Usuários podem ver apenas matches onde são user1_id ou user2_id
- **INSERT**: Sistema cria automaticamente quando usuário dá like
- **UPDATE**: Sistema atualiza quando há match mútuo
- **DELETE**: CASCADE quando um dos usuários é deletado

**Validações**:
- `user1_id` deve ser sempre menor que `user2_id` (garantido por trigger)
- Um match único por par de usuários (único composto)
- `matched_at` só é preenchido quando `status = 'mutual'`
- `compatibility_score` é calculado automaticamente

**Triggers**:
- Trigger para garantir que user1_id < user2_id (normalização)
- Trigger para atualizar `matched_at` quando status muda para 'mutual'
- Trigger para recalcular `compatibility_score` quando preferências mudam

---

### Tabela: `chats`

**Descrição**: Representa uma conversa entre dois usuários com match mútuo.

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único do chat |
| `user1_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do primeiro usuário |
| `user2_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do segundo usuário |
| `people_match_id` | UUID | REFERENCES people_matches(id) ON DELETE SET NULL, NULLABLE | ID do match que originou o chat |
| `last_message_at` | TIMESTAMPTZ | NULLABLE | Data/hora da última mensagem |
| `user1_unread_count` | INTEGER | DEFAULT 0, NOT NULL | Contador de mensagens não lidas para user1 |
| `user2_unread_count` | INTEGER | DEFAULT 0, NOT NULL | Contador de mensagens não lidas para user2 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data de criação do chat |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data da última atualização |

**Índices**:
- `idx_chats_users` ON `user1_id, user2_id` (único composto)
- `idx_chats_user1` ON `user1_id`
- `idx_chats_user2` ON `user2_id`
- `idx_chats_last_message` ON `last_message_at DESC NULLS LAST`
- `idx_chats_people_match` ON `people_match_id`

**RLS Policies**:
- **SELECT**: Usuários podem ver apenas chats onde são user1_id ou user2_id
- **INSERT**: Sistema cria automaticamente quando há match mútuo
- **UPDATE**: Usuários podem atualizar apenas seus próprios contadores de não lidas
- **DELETE**: CASCADE quando um dos usuários é deletado

**Validações**:
- Chat só pode ser criado quando há match mútuo em `people_matches`
- `user1_id` deve ser diferente de `user2_id`
- Um chat único por par de usuários

**Triggers**:
- Trigger para criar chat automaticamente quando `people_matches.status` muda para 'mutual'
- Trigger para atualizar `last_message_at` quando nova mensagem é criada
- Trigger para atualizar contadores de não lidas

---

### Tabela: `messages`

**Descrição**: Armazena mensagens trocadas entre usuários em chats.

**Campos**:

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único da mensagem |
| `chat_id` | UUID | REFERENCES chats(id) ON DELETE CASCADE, NOT NULL | ID do chat |
| `sender_id` | UUID | REFERENCES users(id) ON DELETE CASCADE, NOT NULL | ID do remetente |
| `content` | TEXT | NOT NULL, MAX 2000 chars | Conteúdo da mensagem |
| `sent_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data/hora de envio |
| `read_at` | TIMESTAMPTZ | NULLABLE | Data/hora de leitura |
| `is_deleted` | BOOLEAN | DEFAULT FALSE, NOT NULL | Soft delete da mensagem |

**Índices**:
- `idx_messages_chat` ON `chat_id, sent_at DESC`
- `idx_messages_sender` ON `sender_id`
- `idx_messages_unread` ON `chat_id, read_at` WHERE `read_at IS NULL`

**RLS Policies**:
- **SELECT**: Usuários podem ver mensagens apenas de chats onde participam
- **INSERT**: Usuários podem enviar mensagens apenas em chats onde participam
- **UPDATE**: Usuários podem atualizar apenas suas próprias mensagens (marcar como deletada)
- **DELETE**: Soft delete apenas pelo remetente

**Validações**:
- `sender_id` deve ser user1_id ou user2_id do chat
- `content` não pode estar vazio
- `content` não pode exceder 2000 caracteres

**Triggers**:
- Trigger para atualizar `chats.last_message_at` quando nova mensagem é criada
- Trigger para atualizar contadores de não lidas quando mensagem é lida
- Trigger para validar que sender pertence ao chat

---

## Tabelas Adicionais (da Estrutura Existente)

### Tabela: `check_ins`

**Descrição**: Armazena check-ins de usuários em locais. **NOTA**: Esta tabela existe na estrutura atual e será mantida.

**Campos**:
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE CASCADE
- `location_id` UUID REFERENCES locations(id) ON DELETE CASCADE
- `checked_in_at` TIMESTAMPTZ DEFAULT NOW()
- `checked_out_at` TIMESTAMPTZ NULLABLE
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(user_id, location_id, is_active) WHERE is_active = true

**RLS Policies**: Usuários podem gerenciar apenas seus próprios check-ins.

---

### Tabela: `location_categories`

**Descrição**: Categorias pré-definidas de locais. **NOTA**: Esta tabela existe na estrutura atual e será mantida.

**Campos**:
- `id` UUID PRIMARY KEY
- `name` VARCHAR(50) UNIQUE NOT NULL
- `icon` VARCHAR(50) NULLABLE
- `color` VARCHAR(7) DEFAULT '#000000'
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Dados Iniciais**: Bar, Club, Restaurante, Pub, Lounge, Café, Hotel, Evento

---

### Tabela: `favorites`

**Descrição**: Locais favoritos dos usuários. **NOTA**: Esta tabela existe na estrutura atual e será mantida.

**Campos**:
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE CASCADE
- `location_id` UUID REFERENCES locations(id) ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(user_id, location_id)

**RLS Policies**: Usuários podem gerenciar apenas seus próprios favoritos.

---

### Tabela: `reviews`

**Descrição**: Avaliações de locais por usuários. **NOTA**: Esta tabela existe na estrutura atual e será mantida.

**Campos**:
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE CASCADE
- `location_id` UUID REFERENCES locations(id) ON DELETE CASCADE
- `rating` INTEGER CHECK (rating >= 1 AND rating <= 5)
- `comment` TEXT NULLABLE
- `images` TEXT[] DEFAULT '{}'
- `is_verified` BOOLEAN DEFAULT false
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(user_id, location_id)

**Triggers**: Atualiza `locations.rating` automaticamente quando review é criada/atualizada/deletada.

**RLS Policies**: Usuários podem ver todas as reviews públicas, mas criar/atualizar/deletar apenas suas próprias.

---

### Tabela: `audit_logs`

**Descrição**: Logs de auditoria do sistema. **NOTA**: Esta tabela existe na estrutura atual e será mantida.

**Campos**:
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `action` VARCHAR(100) NOT NULL
- `table_name` VARCHAR(50) NULLABLE
- `record_id` UUID NULLABLE
- `old_values` JSONB NULLABLE
- `new_values` JSONB NULLABLE
- `ip_address` INET NULLABLE
- `user_agent` TEXT NULLABLE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Triggers**: Criado automaticamente por triggers de auditoria em todas as tabelas principais.

---

## Relacionamentos

```
users (1) ──< (1) user_preferences
users (1) ──< (*) location_matches
users (1) ──< (*) people_matches (como user1_id)
users (1) ──< (*) people_matches (como user2_id)
users (1) ──< (*) chats (como user1_id)
users (1) ──< (*) chats (como user2_id)
users (1) ──< (*) messages (como sender_id)
users (1) ──< (*) check_ins
users (1) ──< (*) favorites
users (1) ──< (*) reviews

locations (1) ──< (*) location_matches
locations (1) ──< (*) check_ins
locations (1) ──< (*) favorites
locations (1) ──< (*) reviews

people_matches (1) ──< (1) chats

chats (1) ──< (*) messages
```

## Funções e Views Úteis

### View: `user_matches_view`
View que agrega informações de matches de um usuário com locais e pessoas.

### Função: `calculate_compatibility_score(user1_id UUID, user2_id UUID)`
Calcula o score de compatibilidade entre dois usuários baseado em:
- Preferências em comum (drinks, food, music)
- Locais em comum
- Proximidade geográfica

### Função: `get_mutual_matches(user_id UUID)`
Retorna todos os matches mútuos de um usuário com informações completas.

### Função: `get_common_locations(user1_id UUID, user2_id UUID)`
Retorna locais em comum entre dois usuários.

## Migrations e Compatibilidade

### Estrutura Existente vs. Nova Estrutura

**Tabelas que serão mantidas** (já existem):
- `users` (será expandida com novos campos)
- `locations` (será expandida com integração Google Places)
- `check_ins`
- `location_categories`
- `favorites`
- `reviews`
- `audit_logs`

**Tabelas que serão criadas** (novas do spec-kit):
- `user_preferences` (extraído de `users.preferences` JSONB)
- `location_matches` (novo - Core Loop 1)
- `people_matches` (substitui `matches` com estrutura melhorada)
- `chats` (novo - estrutura de conversas)

**Tabelas que serão migradas**:
- `matches` → `people_matches` (com campos adicionais: compatibility_score, common_locations_count)
- `messages` → mantida mas com `chat_id` adicionado (estrutura híbrida durante migração)

### Plano de Migração

1. **Fase 1**: Criar novas tabelas (`user_preferences`, `location_matches`, `people_matches`, `chats`)
2. **Fase 2**: Migrar dados de `users.preferences` → `user_preferences`
3. **Fase 3**: Migrar dados de `matches` → `people_matches` (com cálculo de compatibility_score)
4. **Fase 4**: Adicionar `chat_id` em `messages` e criar chats para matches mútuos existentes
5. **Fase 5**: Expandir `users` e `locations` com novos campos (coordenadas, Google Places, etc.)
6. **Fase 6**: Deprecar campos legados após validação completa

### Scripts de Migração

Todas as tabelas devem ser criadas via Supabase migrations com:
1. Criação das tabelas novas
2. Migração de dados existentes
3. Criação dos índices
4. Criação das funções
5. Criação das views
6. Configuração das RLS policies
7. Criação dos triggers
8. Validação de integridade referencial

## Validações no Frontend (Zod)

Schemas Zod devem ser criados para validar:
- Criação/atualização de usuário
- Preferências do usuário
- Criação de matches
- Envio de mensagens

Todos os dados devem ser validados no frontend antes de enviar para o backend.

