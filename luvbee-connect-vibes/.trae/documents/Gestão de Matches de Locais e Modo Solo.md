## Objetivo
Implementar na aplicação a gestão de matches (like/dislike) com locais na rota `/locations` e o Modo "Solo" na rota `/vibe-local`, garantindo sincronização instantânea, persistência de estado e testes automatizados.

## Escopo de Implementação
### 1) Botão “Desfazer Match” em `/locations`
- UI:
  - Adicionar botão “Desfazer Match” visível nos cards de locais e na página de detalhes.
  - Usar `AlertDialog` (shadcn/ui) para confirmação antes de desfazer.
- Ação:
  - Chamar `LocationService.removeLocationMatch(userId, locationId)` (já existente em `src/services/location.service.ts:667`).
  - Em caso de sucesso: remover o local da lista em tempo real e disparar `toast` de feedback.
- Atualização da interface:
  - Invalidar e refazer queries da lista (`React Query`: `queryClient.invalidateQueries(['locations'])`).
  - Atualizar store de matches (Zustand) para refletir remoção imediatamente.
- Realtime (opcional, recomendado):
  - Assinar `location_matches` via Supabase Realtime e aplicar diffs na store ao receber eventos, sincronizando rotas.

### 2) Modo “Solo” em `/vibe-local`
- Rota:
  - Criar/ajustar página `VibeLocal.tsx` (ou `src/pages/VibeLocal.tsx`).
- UI:
  - Botão de alternância de modo (toggle) no topo da página com estado visual (ativo/inativo) consistente com tema shadcn/tailwind.
  - Indicador visual do modo ativo (badge/label “Solo Ativo”).
- Filtro:
  - Aplicar filtro que exibe apenas “privês” e “casas de swing”. Critérios (front-end):
    - `location.type` ∈ {`prive`, `swing_club`, `night_club`} OU `location.name` contém “Privê”|“Prive”|“Swing”.
    - Fallback: se dados não tiverem `type` adequado, usar busca por nome (case-insensitive) e tags em `google_place_data.types` quando disponíveis.
  - Reutilizar `LocationService.getNearbyLocations` e filtrar client-side; quando disponível, expandir para filtro direto em RPC/view.
- Persistência de estado:
  - Store Zustand `useVibeModeStore` com `soloMode: boolean`, persistida em `localStorage`.
  - Carregar estado ao iniciar a página.

### 3) Regras de Sincronização entre `/vibe-local` e `/locations`
- Quando “Solo” estiver ativo em `/vibe-local`:
  - Remover automaticamente esses locais da listagem em `/locations` (aplicar mesmo filtro ao hook/lista de `/locations`).
- Sincronização instantânea:
  - Empregar uma store compartilhada (Zustand) para `soloMode` e `matchedLocationIds`.
  - Invalidação e refetch coordenados via `React Query` após desfazer match.
  - Realtime: opcionalmente, assinar `location_matches` para refletir mudanças vindas de outras sessões.
- Persistência:
  - `soloMode` e cache de consultas já implementados com Zustand; garantir persistência com `localStorage` e hydration inicial.
- Feedback visual:
  - Usar `toast` para todas as ações (desfazer match, alternar modo, sincronizações) e estados de carregamento/desabilitado em botões.

### 4) Testes Automatizados (Vitest + Testing Library)
- Botão “Desfazer Match”:
  - Render de botão no card/detalhe.
  - Clique → abre confirmação → confirma → chama `removeLocationMatch` (mock) → UI atualiza (local removido).
- Filtragem no Modo Solo:
  - Ativar `soloMode` na store; garantir que apenas locais filtrados são exibidos.
- Sincronização entre rotas:
  - Simular alternância de `soloMode` e validar que listas em `/locations` e `/vibe-local` refletem o mesmo estado.
- Persistência de estado:
  - Testar hydration da store com valor persistido; `soloMode` continua ativo após “reinicialização” simulada.

## Alterações no Código (Previstas)
- `src/components/location/LocationCard.tsx`: adicionar botão “Desfazer Match” com `AlertDialog` e chamada ao serviço.
- `src/pages/Locations.tsx` e/ou `src/pages/LocationsPage.tsx`: integrar ação e invalidar queries após desfazer match.
- `src/pages/LocationDetailPage.tsx:122-147`: usar `LocationService.removeFromFavorites` (atual) e adicionar ação explícita para desfazer match chamando `removeLocationMatch`.
- `src/hooks/useLocations.ts:149+`: aplicar filtro condicional baseado em `useVibeModeStore.soloMode` para remover “privês/swing” da lista quando necessário.
- `src/store/useVibeMode.ts` (novo): Zustand store com `soloMode` e persistência em `localStorage`.
- Realtime:
  - Adicionar assinatura opcional a `location_matches` e atualizar store ao receber `INSERT/UPDATE/DELETE`.

## Considerações Técnicas
- Segurança & RLS: uso do cliente Supabase via `src/integrations/supabase.ts:30`, respeitando políticas de RLS (usuário só atualiza seus próprios matches).
- Desempenho: manter latência baixa com o cache por raio já implementado (`src/hooks/useGeoCache.ts` / integração no `LocationService`).
- UI Consistente: usar componentes shadcn/ui e Tailwind já presentes.

## Entregáveis
- UI e ações completas para “Desfazer Match” com confirmação.
- Modo Solo com alternância, filtro e indicador visual.
- Sincronização instantânea entre rotas e persistência de estado.
- Testes de unidade/integração cobrindo botões, filtro, sincronização e persistência.

## Passos de Implementação
1. Criar store `useVibeModeStore` com persistência e API (`toggleSoloMode`, `isSoloMode`).
2. Adicionar o botão e fluxo de “Desfazer Match” no card e no detalhe; confirmar com `AlertDialog` e atualizar estado/UI.
3. Aplicar filtro Solo em `useLocations` e nas páginas: usar critérios de `type` e `name`.
4. Integrar invalidação/refetch e (opcional) Realtime para sincronização.
5. Criar testes (Vitest) para os quatro tópicos.
6. Validar manualmente em `/locations` e `/vibe-local` e documentar endpoints/fluxo conforme regras do projeto.
