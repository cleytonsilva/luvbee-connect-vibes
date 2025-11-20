## Diagnóstico Rápido
- O loop acontece porque após PERMISSION_DENIED (code 1) `requestedOnceRef.current` volta para `false` (src/pages/VibeLocalPage.tsx:245), permitindo que o efeito de mount volte a chamar `requestLocation()` (src/pages/VibeLocalPage.tsx:316–345).
- Não há persistência do estado de permissão: a página não lembra que o usuário negou e tenta novamente ao remontar.

## Objetivo
- Evitar novas tentativas automáticas após a primeira negação.
- Persistir estado de permissão/negação e respeitar em mounts futuros.
- Exibir e manter a interface de entrada manual imediatamente após a primeira negação.
- Tratar erros com mensagens consistentes e sem repetição.
- Auditar ouvintes para impedir re-disparos indevidos.

## Alterações Propostas
### Guardas e Persistência (VibeLocalPage)
- Ao capturar PERMISSION_DENIED (code 1) em `requestLocation`:
  - Definir `requestedOnceRef.current = true` e `setShowChangeLocation(true)`.
  - Persistir em `localStorage`:
    - `luvbee_geo_denied = "1"`
    - `luvbee_geo_denied_ts = Date.now()`
  - Registrar com `safeLog('warn', 'geo_permission_denied', { userId, ts })`.
- No efeito de mount (src/pages/VibeLocalPage.tsx:316–345):
  - Ler flags `luvbee_geo_denied` e `luvbee_geo_denied_ts`.
  - Se negado e TTL (ex.: 24h) não expirado, pular `requestLocation()` e:
    - `tryLoadManualFromProfileOrStorage()`.
    - `setShowChangeLocation(true)`.
  - Garantir retorno antecipado mesmo em remontagens.

### Armazenar Estado de Permissão (GeolocationService)
- Adicionar utilitário:
  - `getCachedPermissionState()` que retorna `localStorage.luvbee_geo_permission_state` ou consulta `navigator.permissions.query({ name: 'geolocation' })` quando disponível.
  - `setCachedPermissionState(state)` para persistir `granted|denied|prompt`.
- Em `requestLocation` (antes de chamar o serviço):
  - Se `getCachedPermissionState() === 'denied'` e não houve ação do usuário (sem `force`), evitar nova tentativa automática.

### Interface Manual (GeolocationHandler)
- Exibir imediatamente quando negado (já ocorre via `errorCode === 1`, src/pages/VibeLocalPage.tsx:358–363), mas também quando a flag persistida indicar negação, mesmo sem erro atual.
- No submit manual:
  - Persistir `luvbee_manual_city` e `luvbee_manual_state`.
  - Fechar o sheet (`setShowChangeLocation(false)`) e atualizar estado de busca.
- No retry:
  - Passar `onRetry={() => requestLocation(/* force */ true)}` para permitir nova tentativa apenas por ação explícita.

### Tratamento de Erros
- Consolidar toasts para não repetir mensagens em ciclo:
  - Debounce por 3–5s usando um ref de último erro.
- Mensagens:
  - Permissão negada: “Permissão de localização negada. Use cidade/estado manual.”
  - Logs com `safeLog` em níveis `warn` (negação) e `info` (fallback manual).

### Ouvintes e Re-disparos
- Garantir que o efeito de mount não re-dispare:
  - Manter `[]` como dependências e adicionar guarda com flags persistidas.
  - Não alterar `requestedOnceRef.current` para `false` após erro; manter `true` em negação para bloquear futuros autos.
- Revisar `useEffect([profile?.id])` e `useEffect([errorCode])` (src/pages/VibeLocalPage.tsx:347–356, 358–363):
  - Confirmar que não chamam `requestLocation()`; apenas abrem UI/manual, como hoje.

## Implementação Detalhada
1. src/pages/VibeLocalPage.tsx
   - Em `catch` de `requestLocation` (linhas 214–275):
     - Se `error.code === 1`: setar `requestedOnceRef.current = true`, persistir flags em `localStorage`, abrir `setShowChangeLocation(true)`.
   - Em `useEffect` de mount (linhas 316–345):
     - Ler flags persistidas; se negado recente, pular `requestLocation()` e aplicar `tryLoadManualFromProfileOrStorage()` + `setShowChangeLocation(true)`.
   - Ajustar `onRetry` usado no `GeolocationHandler` para `requestLocation(true)`.
2. src/services/geolocation.service.ts
   - Adicionar `getCachedPermissionState`/`setCachedPermissionState`.
   - Popular o estado ao iniciar e ao receber negação.
3. src/components/GeolocationHandler.tsx
   - Usar flags persistidas para exibir a UI mesmo sem `errorCode` atual.
   - Persistir cidade/estado manual.
4. Logs/Monitoramento
   - Adicionar eventos `geo_permission_denied`, `geo_manual_applied` com `safeLog`.

## Verificação
- Cenário 1: Usuário nega geolocalização.
  - Apenas uma tentativa automática; abre manual; nenhuma nova tentativa até ação explícita.
- Cenário 2: Remontagem de página/rota.
  - Com flag negado ativa, nenhum auto request; manual persistido usado.
- Cenário 3: Usuário clica “Recarregar após ativar”.
  - Chama `requestLocation(true)` e atualiza permissão conforme resultado.

## Rollback e Segurança
- Nenhuma mudança em APIs externas; somente guarda local e fluxo de UI.
- Mantém RLS e padrões do projeto; logs sem expor dados sensíveis.

## Entregáveis
- Código atualizado nos arquivos apontados.
- Mensagens e logs normalizados.
- Testes manuais de cenários acima.
- (Opcional) teste unitário para `VibeLocalPage` simulando PERMISSION_DENIED e garantindo ausência de re-chamadas automáticas.

Confirma a execução desse plano?