## Revisão Atual
- Loader compatível do Maps em `src/services/google-maps-loader-compat.service.ts:20` (carrega `libraries=places` com `callback`).
- Hook híbrido em `src/hooks/useVibePlaces.ts:49` (cache → dispara função → busca via RPCs `get_places_nearby`, `get_places_by_city_state`).
- Página Vibe Local em `src/pages/VibeLocalPage.tsx:51` usando `useVibePlaces` e componentes existentes para swipe e mudança de localização.
- Edge Functions existentes:
  - Proxy NearbySearch em `supabase/functions/search-nearby/index.ts:94` (monta URL segura com `GOOGLE_MAPS_BACKEND_KEY`).
  - Cache agregador (sem paginação) em `supabase/functions/fetch-and-cache-places/index.ts:68` (varre múltiplos tipos, grava em `locations`).

## Decisões de Arquitetura
- Backend centraliza a busca no Google: usar endpoint canônico `https://maps.googleapis.com/maps/api/place/nearbysearch/json` com chave do backend (segredo).
- Implementar paginação robusta (até 3 páginas/60 itens por tipo) e deduplicação por `place_id` no backend.
- Padronizar retorno minimalista `PlaceCard` para o frontend e salvar em cache híbrido.
- Persistência: upsert em `venues` e também em `locations` para compatibilidade com o hook atual (sem quebrar `VibeLocalPage`).
- Tipos múltiplos: aceitar `type` como lista combinada (`night_club|bar|restaurant`) e mesclar resultados.

## Tarefa 1 — Edge Function `fetch-places-google`
- Endpoint: `supabase/functions/fetch-places-google/index.ts`.
- Entrada (JSON): `lat`, `lng`, `radius` (default `5000`), `type` (`'bar' | 'night_club' | 'restaurant'` combinável via `|`).
- Segurança: ler `GOOGLE_MAPS_BACKEND_KEY` (ou `GOOGLE_MAPS_API_KEY`) via `Deno.env` e nunca expor a chave no cliente.
- Paginação (crítico):
  - Faz a primeira chamada com `location`, `radius`, `type`, `key`.
  - Se vier `next_page_token`, aguarda `2000ms` e pagina até 3 páginas (máx. 60 itens) por tipo.
  - Mescla tipos múltiplos com dedupe por `place_id`.
- Transformação: mapear para
  - `place_id`, `name`, `rating`, `user_ratings_total`, `vicinity`, `photo_reference` (primeira), `is_open` (de `opening_hours.open_now` ou `business_status==='OPERATIONAL'`), `types`.
- Persistência (cache híbrido):
  - `venues`: upsert por `place_id` com colunas necessárias (`lat`, `lng`, `rating`, `user_ratings_total`, `vicinity`, `types[]/jsonb`, `photo_reference`, `is_open`, `updated_at`).
  - `locations`: upsert paralelo para manter compatibilidade com o hook atual.
  - Registrar `search_cache_logs` (área/raio/tipo) como hoje em `fetch-and-cache-places`.
- Erros: retornar `{ error, details }` com mensagens claras (HTTP 400 para entrada inválida; 500 para falhas internas; ZERO_RESULTS → `[]`).
- Observações de endpoint:
  - Usar o host `maps.googleapis.com` e incluir `key` sempre para evitar respostas 404/erro de roteamento.

## Tarefa 2 — Componente `VibeMatchCard.tsx`
- UI: card vertical (80% altura da viewport), identidade Neo‑Brutalista (bordas grossas, sombras duras).
- Imagem: construir URL da foto via `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={REF}&key={VITE_GOOGLE_MAPS_API_KEY}`; fallback placeholder (`bg-primary`) com ícone.
- Tipografia: Space Grotesk (bold) para o nome; badge de nota (`bg-accent`) com estrela e nota.
- Distância: calcular via Haversine a partir da posição do usuário e renderizar (`"a 1.2km"`).
- Ações:
  - Botão `❌` (dislike) — borda grossa; hover vermelho.
  - Botão `🔥` (like/vibe) — borda grossa; fundo `bg-primary`; `shadow-hard`; grava em `location_matches`.
- Integração:
  - Usar no `LocationSwipe` existente, ou alternar para lista simples.
  - Receber `PlaceCard` e coordenadas do usuário.

## Integração Frontend
- Chamada: `supabase.functions.invoke('fetch-places-google', { body: { lat, lng, radius, type: 'night_club|bar' } })`.
- `useVibePlaces`:
  - Trocar o disparo em background de `fetch-and-cache-places` por `fetch-places-google` em `src/hooks/useVibePlaces.ts:116`.
  - Continuar lendo resultados locais via RPC `get_places_nearby` (compatível se também gravarmos em `locations`), mantendo `hasMore/loadMore`.
- `VibeLocalPage` permanece estável; apenas renderiza os novos cards e continua com geolocalização robusta (`src/pages/VibeLocalPage.tsx:80`).

## Banco e RLS
- Confirmar existência de `venues` com colunas necessárias; caso falte, criar migração de adição de colunas e índice por `place_id`.
- Manter RLS ativo e usar chave de `service_role` na Edge Function para upsert.
- `location_matches`: confirmar `status` (`like/dislike`) e índices; inserir no click do `🔥`.

## Testes e Observabilidade
- Backend:
  - Testar paginação com `next_page_token` (3 páginas), dedupe por `place_id` e ZERO_RESULTS.
  - Validar limites de `radius` e lat/lng fora de faixa (ver padrão em `search-nearby` `index.ts:96-81`).
- Frontend:
  - Render de `VibeMatchCard` com/sem foto; cálculo de distância; interações dos botões.
- Logs padronizados JSON para operações críticas (busca, upsert, matches) conforme regras de sistema.

## Documentação
- Atualizar `docs/SISTEMA_GEOLOCALIZACAO.md` para refletir:
  - Edge Function `fetch-places-google` (entrada/retorno, paginação, cache em `venues` + `locations`).
  - Fluxo híbrido: geolocalização → cache verificado → background fetch → UI cards/lista.
  - Exemplos de chamada e montagem de URL de foto.

## Migração/Deprecação Controlada
- Manter `search-nearby` como utilitário baixo nível.
- Substituir `fetch-and-cache-places` por `fetch-places-google` gradualmente (mesmo contrato de body; com paginação real e retorno simplificado opcional).
- Evitar breaking changes no hook/página; compatibilizar via gravação em `locations`.

## Entregáveis
- Edge Function `fetch-places-google` com paginação e cache híbrido.
- Componente `VibeMatchCard.tsx` pronto para uso em swipe/lista.
- Integração no hook e página sem regressões.
- Documentação atualizada e testes básicos executados.