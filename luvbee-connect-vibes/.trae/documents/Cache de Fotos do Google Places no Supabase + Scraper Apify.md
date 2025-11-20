## Objetivos
- Parar de baixar fotos dos cards em tempo real da API do Google.
- Armazenar fotos no bucket `div` do Supabase e servir via URL pública/signed.
- Implementar um scraper baseado no Apify para pré-popular o cache.

## Estado Atual (onde a imagem é obtida)
- Renderização usa `usePlacePhoto` para consultar Google em tempo real: `src/hooks/usePlacePhoto.ts:12–250`.
- Cards derivam imagem e chamam `usePlacePhoto`: `src/components/location/LocationCard.tsx:29–42`.
- Já existe serviço de storage para locais (bucket `locations`): `src/services/image-storage.service.ts:11,174–200,295–309`.
- Funções Edge para Google Places: `supabase/functions/get-place-details/index.ts`, `supabase/functions/get-place-photo/index.ts`.

## Alterações de Arquitetura
- Fonte primária da imagem passa a ser Supabase Storage (`div`).
- Busca de imagem tenta primeiro o cache; se não existir, uma Edge Function baixa da API do Google, salva no `div` e retorna a URL.
- Cards nunca chamam diretamente a API do Google.

## Implementação Técnica
### 1) Provisionar bucket `div`
- Criar bucket público (leitura) para media dos lugares:
  - SQL (migração): `select storage.create_bucket('div', public := true);`
  - Definir políticas: leitura pública; escrita somente via Edge Function usando Service Role.

### 2) Atualizar serviço de storage
- Tornar o bucket padrão `div`:
  - Ajustar constante: `src/services/image-storage.service.ts:11` de `'locations'` para `'div'`.
- Adicionar suporte a cache por `placeId`:
  - Novos métodos: `getPlaceImageUrl(placeId)`, `savePlaceImageFromGoogle(placeId, photoReferenceOrUrl)` que usam path `places/{placeId}/{timestamp}.jpg`.

### 3) Edge Function de cache de foto
- Nova função: `cache-place-photo`.
- Entrada: `{ place_id, photo_reference?, maxWidth? }`.
- Fluxo:
  - Se já há arquivo em `div/places/{place_id}/`, retorna URL pública.
  - Caso contrário, obtém referência de foto:
    - Se não veio `photo_reference`, chama `places.details` para `fields=['photos']` (reutilizar lógica de `get-place-details`).
  - Baixa a imagem e faz upload para `div`.
- Download da foto (preferir API v1):
  - Usar `GET https://places.googleapis.com/v1/{name=places/*/photos/*/media}` com `maxWidthPx`/`maxHeightPx` e `skipHttpRedirect=true`.
  - Ler o `photoUri` retornado e baixar o binário.
  - Autenticação: OAuth com escopo `https://www.googleapis.com/auth/cloud-platform` (service account); fallback para endpoint clássico `maps.googleapis.com/maps/api/place/photo` com API key, se necessário.

### 4) Revisar `usePlacePhoto`
- Antes: chama `get-place-details` e depois `get-place-photo` em cada render.
- Depois:
  - Verifica `supabase.storage.from('div').list('places/{placeId}')`; se existir, usa `getPublicUrl`.
  - Se não existir, invoca `cache-place-photo` e usa URL retornada.
  - Mantém `fallbackUrl` apenas como último recurso.
- Local para ajuste: `src/hooks/usePlacePhoto.ts:12–250`.

### 5) Ajustes nos cards
- `LocationCard` mantém derivação de `rawImageUrl`, mas `imageUrl` vem do cache:
  - Substituir `usePlacePhoto(placeId, normalizedUrl)` por a versão que consulta o cache.
  - Arquivo: `src/components/location/LocationCard.tsx:39–42`.

### 6) Scraper Apify
- Serviço backend/Edge para rodar Actor `apify~google-maps-scraper` via API (sem novas libs):
  - Endpoint: `POST https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=APIFY_TOKEN`.
  - Input: termos (`searchTerm`, `location`), ou URL do Google Maps com zoom adequado.
  - Para cada item retornado:
    - Extrair `placeId` e primeira imagem.
    - Baixar e salvar em `div/places/{placeId}/...`.
    - Atualizar `locations.image_url` quando houver correspondência por `google_place_id`.
- Criar `src/services/apify-scraper.service.ts` com funções:
  - `runGoogleMapsScraper(params)`
  - `cacheScrapedPlaceImages(items)`.
- Variáveis ambiente: `VITE_APIFY_TOKEN` (frontend somente para gatilho), preferir segredo no Edge.

### 7) Segurança e RLS
- Tabelas continuam com RLS ativo.
- Bucket `div`: leitura pública; escrita via Edge Functions com Service Role.
- Logs obrigatórios de operações de upload/download conforme regras do sistema.

### 8) Migrações e modelos
- Tabela opcional `cached_place_photos` para rastreio:
  - Colunas: `place_id`, `photo_reference`, `storage_path`, `public_url`, `created_at`.
  - RLS: leitura para todos; escrita apenas via Edge (role `admin`).
- SQL incluído na migração Supabase.

### 9) Compatibilidade e fallback
- Se API v1 `places.photos.getMedia` não estiver autorizada (OAuth), usar o endpoint clássico `place/photo` com API key.
- Respeitar limites: `maxWidthPx`/`maxHeightPx` ∈ [1, 4800]. Padrões: `maxWidthPx=800`.

### 10) Verificação
- Rodar função de processamento em lote: reutilizar `LocationImageScraper.processAllLocationsWithoutImages` para locais já salvos.
- Para resultados de exploração sem cadastro, usar o scraper Apify para pré-carregar o cache.

## Entregáveis
- Bucket `div` pronto e políticas aplicadas.
- Edge Function `cache-place-photo` implementada.
- `usePlacePhoto` revisado para usar cache do Supabase.
- Serviço do scraper Apify e rotina de cache.
- Migração SQL para bucket e tabela `cached_place_photos`.

## Observações
- Não adicionamos dependências; integração Apify por HTTP.
- Documentação será atualizada em `/docs` e `INTEGRACOES.md` antes do commit, conforme regras.
- Sem alterações de UI além da origem da imagem; o gradient existente permanece (`LocationCard.tsx:91`).

## Próximos Passos
- Aprovar plano para iniciar implementação e migrações.
- Configurar secretos: `GOOGLE_MAPS_BACKEND_KEY`/OAuth, `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`.
- Executar processamento inicial para preencher cache de lugares mais acessados.