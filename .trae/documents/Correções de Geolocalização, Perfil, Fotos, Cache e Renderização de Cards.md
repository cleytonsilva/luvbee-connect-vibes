## Diagnóstico
- Geolocalização: quando falha, o fallback final fixa São Paulo com `accuracy = 100000` em `src/services/geolocation.service.ts:155–161`. Serviços de IP tentam `~50km` primeiro e, se todos falham, cai para `100km`.
- Perfil carregando múltiplas vezes: o fluxo chama `loadUserProfile()` em múltiplos pontos (checagem inicial e eventos de auth) em `src/hooks/useAuth.ts:203–240, 116–143, 69–96`. Componentes como `ProfileForm` também disparam carregamentos próprios em `src/components/profile/ProfileForm.tsx:46–52`.
- Fotos de perfil: o componente reconsulta `users.photos` mesmo tendo `profile.photos`, e cada render pode refazer a busca e HEAD em storage, `src/components/profile/ProfileForm.tsx:96–123, 246–271`. URLs repetidas sugerem múltiplas tentativas/duplicidade.
- Cache de lugares: quando expirado, é disparada uma Edge Function em background com flag de `sessionStorage` por localização e modo, `src/hooks/useVibePlaces.ts:104–139`. Logs de "cache expirado"/"busca já em andamento" indicam múltiplos triggers próximos.
- Cards não aparecem: `VibeLocalPage` usa `<LocationSwipe places={...}>` (`src/pages/VibeLocalPage.tsx:407–413`), mas `LocationSwipe` espera `latitude`/`longitude` (`src/components/location/LocationSwipe.tsx:17–23`). Resultado: o componente retorna alerta de "Localização não disponível" (`:167–175`) e não renderiza os cards mesmo com `places` carregados.

## Otimizações Propostas
### 1) Geolocalização
- Definir limiar de precisão: se `accuracy > 5000` (5km), alternar para busca por cidade/estado (branch manual de `useVibePlaces`).
- Aumentar `timeout` do GPS para 15–20s; manter `maximumAge` em 60s; já está usando `enableHighAccuracy`.
- Priorizar manual do perfil/localStorage quando GPS indisponível (já há base via `GeolocationHandler`).
- Logar origem (GPS/IP/fallback) e precisão para métricas.

### 2) Carregamento múltiplo do perfil
- Singleflight no store: se uma chamada de `loadUserProfile()` está em andamento, reutilizar a mesma Promise e ignorar chamadas concorrentes.
- Guardar `isProfileLoaded` (por `user.id`) e não reconsultar em cada evento de auth; carregar somente na transição `SIGNED_IN` inicial.
- Remover carregamentos redundantes em componentes; `ProfileForm` deve confiar em `profile` do store e só reconsultar `users.photos` se `profile.photos` estiver vazio.
- Considerar o efeito do React Strict Mode em dev (dobro de `useEffect`); proteger inicializações com flags estáveis.

### 3) Fotos de perfil
- Preferir `profile.photos` antes de ir ao banco; buscar do banco apenas quando necessário.
- Adicionar `loading="lazy"`, `decoding="async"` e `fetchpriority="low"` aos `<img>` em `ProfileForm`.
- Usar transformação do CDN do Supabase para thumbnails (`?width=...&quality=...`) e definir `sizes/srcset` para responsivo.
- Evitar HEAD para cada imagem pública; usar diretamente `getPublicUrl()` quando o bucket é público; criar URL assinada apenas se necessário.
- Debounce para atualizações e remover duplicidades (não empilhar uploads repetidos com o mesmo índice).

### 4) Cache de lugares
- Estender a chave do `sessionStorage` para incluir `radius` e `mode`, além de lat/lng, reduzindo colisões.
- Rate limit server-side na Edge Function (mutex/lock por chave) para evitar concorrência entre clientes/tabs.
- TTL coerente por raio: 5km => menor TTL; 30km => maior TTL. `check_search_cache` deve retornar o tempo restante para telemetria.
- Backoff exponencial e verificação de `navigator.onLine` antes de invocar funções.

### 5) Renderização dos cards
- Unificar API do `LocationSwipe` para aceitar `places` diretamente (remover dependência de lat/lng e de `useLocations`) OU ajustar `VibeLocalPage` para passar `latitude`/`longitude` e deixar `LocationSwipe` buscar internamente. Recomendação: aceitar `places` para aproveitar `useVibePlaces` e o mecanismo de cache já implementado.
- Garantir exibição quando houver `manualCity/manualState` (sem GPS), usando os resultados de `get_places_by_city_state`.
- Adicionar tratamento de erro visível e botão de retry, já existe base em `VibeLocalPage` (`:395–403`).

## Plano de Implementação
1) Geolocalização
- Implementar checagem de limiar de precisão e fallback automático para cidade/estado nos fluxos de `VibeLocalPage`.
- Padronizar logs: fonte e precisão.

2) Perfil
- Implementar singleflight em `useAuth.loadUserProfile()` e flag `isProfileLoaded` por `user.id`.
- Remover chamadas redundantes a `loadUserProfile()` em componentes; manter apenas no store.

3) Fotos
- Usar `profile.photos` como fonte primária e só consultar `users.photos` se vazio.
- Aplicar lazy loading, decoding async e fetchpriority baixo; adicionar `srcset/sizes` e parâmetros de CDN.
- Evitar HEAD para buckets públicos; assinar apenas quando estritamente necessário.

4) Cache
- Incluir `radius` e `mode` na chave de sessão; ajustar TTLs; adicionar backoff e verificação de online.
- Rate limit na Edge Function e chave de dedupe (lat,lng,radius,mode).

5) Cards
- Atualizar `LocationSwipe` para aceitar e renderizar `places`, com paginação e swipe; remover a checagem de latitude/longitude.
- Alternativa: passar lat/lng pelas props a partir de `VibeLocalPage` e não usar `places` diretamente (menos recomendada).

## Métricas para Validação
- Geolocalização: porcentagem de sessões por fonte (GPS/IP/fallback), distribuição de `accuracy`, tempo até obter localização.
- Perfil: número de chamadas `loadUserProfile()` por sessão, tempo médio de carga, duplicatas evitadas.
- Fotos: número de requisições ao storage por render, total de bytes baixados, tempo de pintura de imagens (LCP/Lazy).
- Cache: taxa de "cache válido" vs "expirado", número de invocações da Edge Function por chave, sucesso/erro.
- Cards: taxa de renderização com resultados (>0), tempo de primeira render dos cards, erros de render.

## Riscos e Mitigações
- Mudanças no `LocationSwipe` exigem alinhamento com `VibeLocalPage`; mitigar com testes de integração em `__tests__/integration`.
- Alterações em auth podem afetar outras páginas; mitigar com testes de unidade para o store (`useAuth`).
- Otimizações de imagens podem alterar aparência; validar com imagens de diferentes formatos e tamanhos.

## Entregáveis
- Correções aplicadas e testes unitários/integrados.
- Instrumentação de logs/telemetria mínima para métricas.
- Breve guia de verificação manual (QA) para `/vibe-local` e perfil.