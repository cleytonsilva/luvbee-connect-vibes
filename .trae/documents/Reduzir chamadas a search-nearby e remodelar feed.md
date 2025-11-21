## Diagnóstico
- Repetições ocorrem por encadeamento em `getFeed` (consulta → população paralela → reconsulta) e por múltiplas execuções de `loadFeed` em `VibeLocalPage` quando `user` muda.
- Não há dedup de requisições em voo, nem TTL de cache no cliente para `searchNearby`.
- `searchNearby` recebe parâmetros incorretos (posicionais) em `populateFromGoogle`, causando `400 (Bad Request)`.
- Retries automáticos na consulta ao Supabase ampliam chamadas quando há erro transitório.

## Objetivos
- Reduzir chamadas redundantes à Edge Function e ao Supabase.
- Corrigir `400` invalidando pronto o fluxo e evitando reintentos.
- Garantir uma única população por local/raio dentro de uma janela (TTL), com dedup e cancelamento.

## Intervenções por Arquivo

### 1) `src/services/google-places.service.ts`
- Implementar dedup de requisições em voo: manter `pendingSearches` (Map) por chave `lat|lng|radius|types` e retornar a mesma Promise quando já houver request ativa. Referência: `google-places.service.ts:80–116`.
- Adicionar TTL de cache no cliente (ex.: `localStorage`/`sessionStorage` + `Map` em memória) por chave de busca, com janela de 15–30 min. Evitar nova chamada se cache válido.
- Tratar `400`: não retry; registrar métrica e retornar erro sem encadear novas populações.
- Expor assinatura clara: `searchNearby({ latitude, longitude, radius, types })` e validar argumentos; rejeitar se `latitude/longitude` ausentes.

### 2) `src/services/discovery.service.ts`
- Corrigir chamada de `populateFromGoogle`: enviar objeto em vez de parâmetros posicionais. Local: `discovery.service.ts:213–221`.
- Gate de população por TTL: antes de `Promise.allSettled`, checar se `lastPopulatedAt[locationKey]` < TTL; caso contrário, pular população e só ler cache do DB. Locais: `discovery.service.ts:40–68` e `48–51`.
- Remover re-fetch imediato em cascata quando população foi pulada por TTL; se população ocorrer, manter um único re-fetch. Local: `discovery.service.ts:62–68`.
- In-flight dedup: manter flag/Promise por `locationKey` para `getFeed`; se chamada concorrente acontecer, aguardar a existente. Local: `discovery.service.ts:30–37`.
- Ajustar retries: limitar `executeWithRetry` apenas para erros 5xx/timeout; não reexecutar para `400/404`. Locais: `discovery.service.ts:99–117` e `supabase-error-handler.service.ts:154–177`.

### 3) `src/pages/VibeLocalPage.tsx`
- Blindar `useEffect`: usar `didInitRef` para rodar `loadFeed()` uma única vez por mount, e separar efeito que depende de `user` para apenas quando `user` transita de `undefined`→autenticado. Local: `VibeLocalPage.tsx:17–19`.
- Coalescer chamadas de `loadFeed`: se já houver uma em voo, retornar a mesma Promise; manter `loadingRef` e `lastParamsRef` para evitar repetir com mesmos parâmetros. Local: `VibeLocalPage.tsx:21–51`.
- Cancelamento/Abort: usar `AbortController` ao buscar geolocalização e ao chamar `getFeed` para abortar execução anterior quando o usuário clicar repetidamente. Local: `VibeLocalPage.tsx:21–51` e botão em `VibeLocalPage.tsx:104`.
- Opcional (dev): mitigar efeito duplo do React StrictMode adicionando o guard `didInitRef`.

## Fluxo de Erros
- Ao receber `400` da Edge Function, identificar causa (payload inválido ou falta de `lat/lng`) e:
  - Não reintentar.
  - Exibir toast não intrusivo e seguir somente leitura do DB sem população.
  - Registrar evento de monitoramento.

## Métricas e Monitoramento
- Instrumentar contadores de: chamadas ao Supabase, chamadas à Edge Function, hits/misses de cache, aborts e erros por tipo (400/5xx).
- Logar por `locationKey` para rastreabilidade.

## Testes
- Adicionar testes de unidade para dedup/TTL em `google-places.service` e `discovery.service`.
- Teste de integração para `VibeLocalPage` garantindo que múltiplos cliques não duplicam chamadas.
- Caso seja usada `StrictMode`, confirmar execução única por guard.

## Verificação
- Em dev, usar console/métricas para confirmar redução de chamadas (>70%).
- Validar que `400` não reencadeia populações e que o feed ainda funciona (retorna 0 ou cache antigo, sem loop).

## Observações
- Os avisos de chunk grande/dynamic import não interferem neste problema; tratativa opcional posteriormente.

Confirma que aplicamos estas alterações? Após sua confirmação, executo as modificações e rodo a verificação.