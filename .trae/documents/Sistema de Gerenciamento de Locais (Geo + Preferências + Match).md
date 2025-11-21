## Visão Geral
- Implementar um sistema completo de coleta, armazenamento e apresentação de dados geográficos, integrado ao Supabase, com cache em memória, match avançado e endpoints RESTful via PostgREST/Edge Functions.
- Preservar e unificar estruturas existentes (locations, check_ins, user_preferences) e complementar com Estados/Bairros e hashing contra duplicatas.

## Banco de Dados (Supabase/Postgres)
- Extensões: `postgis`, `uuid-ossp`, `pgcrypto` já ativadas em supabase/migrations/20250127000000_create_core_tables.sql.
- Tabelas novas:
  - `br_states(id UUID PK, ibge_code TEXT UNIQUE, name TEXT, region TEXT, created_at, updated_at)` com índices em `ibge_code` e `region`.
  - `neighborhoods(id UUID PK, state_id UUID FK -> br_states, ibge_code TEXT UNIQUE, name TEXT, created_at, updated_at)` com índice em `(state_id, name)`.
  - `location_hashes(location_id UUID UNIQUE, content_hash TEXT UNIQUE, created_at)` para deduplicação; `user_preferences_hashes(user_id UUID UNIQUE, content_hash TEXT UNIQUE, created_at)`.
- Ajustes/Unificação `locations`:
  - Manter colunas legadas e padronizar nomenclatura via migration: adicionar/alinhar `google_place_id`, `latitude`, `longitude`, criar `VIEW locations_view` expondo nomes padronizados mapeando os legados (`place_id -> google_place_id`, `lat/lng -> latitude/longitude`).
- Índices geo:
  - `GIST(location)` (já existe) e índice composto `(latitude, longitude)` para fallback sem PostGIS.
- Triggers:
  - `BEFORE INSERT/UPDATE` em `locations` para normalizar endereço, validar coordenadas (faixa válida) e atualizar `location` POINT.
  - `AFTER INSERT/UPDATE` em `locations` para preencher `location_hashes.content_hash = md5(normalized_fields)` com `UNIQUE` para prevenir duplicatas.
  - `AFTER INSERT/UPDATE` em `user_preferences` para `user_preferences_hashes.content_hash = md5(jsonb_strip_nulls(preferences))` com `UNIQUE` por `user_id`.
  - `UPDATE updated_at` (já existe) aplicado às novas tabelas.
- RLS:
  - Ativar RLS em todas as novas tabelas e políticas: usuários só visualizam seus próprios hashes; `br_states` e `neighborhoods` com leitura pública, escrita restrita a role administrativa.

## Lógica de Apresentação (Web)
- Componentes com Tailwind e shadcn/ui (existente):
  - Cartões de locais com `div` e `span` para nome, rating, check-ins, horário, ações (Check In, Call, Website), replicando o padrão do card atual (ex.: `Manifesto Bar`).
  - Seção Location com fallback: quando endereço/geo indisponível, exibir `span "Endereço não disponível"` e ícone de pin (já presente no HTML selecionado), com placeholder.
- Cache em memória (frontend):
  - LRU em app state (Zustand) para consultas por raio (chave: `lat,lng,radius`) e top locais populares; invalidação via timestamp TTL.
  - Integração com React Query para prefetch e hydration.

## Sistema de Match
- Similaridade de preferências:
  - Função SQL: comparar arrays de `user_preferences` (drinks/food/music) e produzir score; base existente `calculate_compatibility_score` será estendida para recência/frequência.
- Pontuação de compatibilidade:
  - Fatores: proximidade (Haversine via `get_nearby_locations`), popularidade (reviews/check_ins), recência (últimos `location_matches`).
- Filtragem demográfica (se aplicável):
  - Campos opcionais em `users` (faixa etária, região) com filtros adicionais.
- Notificações em tempo real:
  - Usar Supabase Realtime em canais por usuário para eventos de novo match; publicar via trigger/Edge Function.

## Endpoints RESTful
- PostgREST (nativo Supabase):
  - `POST /user_preferences`, `GET /people_matches` com views especializadas.
- Edge Functions (Deno):
  - `POST /create-location` (já existe supabase/functions/create-location/index.ts) padronizado para nomes unificados.
  - `GET /search-nearby` (existe) chamando RPC `get_nearby_locations`.
  - `POST /register-preferences`, `GET /potential-matches`, `POST /connections/manage` expondo lógicas agregadas com validação e rate limiting.

## Microsserviços
- Serviço de geodados:
  - Validação de coordenadas e normalização de endereço; usa `postgis` e RPC.
- Serviço de cache distribuído:
  - In-memory LRU em cada instância; invalidado por mensagens Supabase Realtime (sem novas dependências), garantindo coerência eventual.
- Serviço de integração externa:
  - Fallback Google indisponível: usar banco local (locations) + RPC `get_nearby_locations`. Se Google ativo, enriquecer e persistir.

## Filas de Mensagens
- Tabelas `jobs_new_locations` e `jobs_reindex` com status/locks para processamento assíncrono.
- Workers em Edge Functions/Node que consomem as filas via polling controlado; publicar progresso em Realtime.

## Fluxos de Dados
- Novos locais: Validação → Normalização → Armazenamento (`locations`) → Indexação (atualiza índices + materialized view popular_locs).
- Preferências: Registro (`user_preferences`) → Análise (score/compatibilidade) → Geração de matches (`people_matches`) → Notificação (Realtime).
- Deduplicação: hashes nas tabelas de suporte com `UNIQUE` e triggers.

## Segurança
- Sanitização:
  - Frontend: `dompurify` (já instalado) para conteúdo HTML de reviews/bios.
  - Backend: validação de payloads (zod) em Edge Functions.
- Rate limiting:
  - Implementar em Edge Functions por IP/user_id com janelas deslizantes e tabela `rate_limits`; bloquear abuso.
- JWT:
  - Fluxo com `@supabase/supabase-js` (cliente existente) e RLS aplicado; operações administrativas via service role apenas em funções.
- Criptografia: dados sensíveis em `pgcrypto` e políticas de acesso.

## Qualidade
- Disponibilidade: usar serviços stateless e Realtime para resiliência; fallback local.
- Latência (<200ms):
  - Pré-carregamento de populares, cache LRU, bounding box + Haversine (RPC).
- Testes automatizados (Vitest):
  - Validação de geodados: funções utilitárias e RPC mocks.
  - Consistência de matches: cenários de preferências e recência.
  - Performance: testes de carga simulada nos endpoints (mocks).

## UI e Integração (Código Existente)
- Reutilizar integração Supabase do app (`src/integrations/supabase.ts:30`), tipos gerados (`src/integrations/database.types.ts`) e componentes de cards.
- Unificar consumo de `get_nearby_locations` e dados dos cards (`Actions`/`Location`) com fallback de endereço como nos elementos selecionados.

## Documentação
- Especificar endpoints, esquema e decisões em `/docs` conforme regras do projeto, antes dos commits.
- Atualizar `INTEGRACOES.md` para novas funções/filas.

## Entregáveis
- Migrações SQL para novas tabelas/políticas/triggers/views.
- Edge Functions para registro de preferências, matches e rate limit.
- Componentes/serviços de cache no frontend (Zustand/React Query).
- Testes (Vitest) cobrindo geo, match, performance.

## Próximos Passos
- Aplicar migrações, gerar tipos, criar endpoints e integrar UI; validar em dev e documentar conforme regras.