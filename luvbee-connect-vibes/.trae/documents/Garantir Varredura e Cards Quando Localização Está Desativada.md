## Diagnóstico Atual
- Detecção de localização desativada: 
  - `GeolocationService` mapeia erros (1: Permissão negada, 2: Posição indisponível) e `VibeLocalPage` mostra `GeolocationHandler` quando `errorCode === 1 || 2` e não há `latitude/longitude`.
- Varredura sem GPS:
  - `useVibePlaces` usa a busca por cidade/estado (`get_places_by_city_state`) quando `userLocation` é nulo e `manualCity/manualState` estão definidos; caso contrário, exibe erro "Cidade e estado são necessários quando GPS está desligado".
- Geração de cards:
  - `VibeLocalPage` passa `places` para `LocationSwipe`, que renderiza `LocationCard`. `LocationCard` apresenta imagem (com fallback), nome, endereço, rating e preço.
- Múltiplas execuções:
  - `useVibePlaces` tem debounce de 500ms e dedupe de chamadas de cache (sessionStorage), mas a Edge Function pode falhar por CORS sem bloquear a busca local.
- Inclusão de novos locais:
  - Quando o cache está expirado, há tentativa de popular via Edge Function (`fetch-places-google`). Em caso de CORS, a busca local continua; entretanto, isso pode atrasar a entrada de “novos” locais no banco.

## Melhorias Propostas
### 1) Feedback claro sem GPS
- Adicionar um banner persistente quando `errorCode === 1 || 2` com instruções e um indicador de modo manual ativo (cidade/estado atual).
- Exibir uma tag “Usando localização manual: <cidade, estado>” no header de `/vibe-local` quando GPS estiver desativado.

### 2) Robustez da varredura
- Garantir que `manualCity/manualState` sejam preenchidos automaticamente a partir do perfil/localStorage quando `navigator.geolocation` falhar.
- Se `manualCity/manualState` estiverem vazios, abrir automaticamente o `GeolocationHandler` e orientar o usuário.

### 3) Cards completos
- Verificar mapeamento em `LocationCard` para suportar tanto `Location` (DB) quanto `LocationData`, garantindo:
  - Nome, endereço, rating, `price_level`, imagem com fallback, tipo/categoria.
- Adicionar um placeholder consistente (já existe), e um badge discreto “Dados locais (DB)” quando a imagem vier do banco.

### 4) Múltiplas execuções
- Manter debounce e dedupe, e adicionar um “estado de fonte” no UI (ex.: "Cache válido" vs "Buscando novos lugares…") — já há indicador; ampliar com origem (GPS vs Manual).
- Evitar reentrâncias com uma flag de busca em andamento para `refresh`/`loadMore`.

### 5) Inclusão de novos locais
- Não depender do Edge Function no cliente para CORS; mover a invocação para backend (ou corrigir CORS na função com resposta a `OPTIONS` e cabeçalhos `Access-Control-Allow-*`).
- Enquanto isso, assegurar que os novos locais inseridos no banco apareçam na paginação `loadMore` e com `refresh` manual.

## Implementação
1. `VibeLocalPage`:
- Exibir estado “Manual” com cidade/estado quando `latitude/longitude` não forem definidos e `manualCity/manualState` estiverem ativos.
- Se localização falhar, aplicar auto fallback (perfil/localStorage) e mostrar toast/badge.
2. `useVibePlaces`:
- Confirmar branch manual por cidade/estado quando `userLocation` é nulo.
- Garantir que `refresh` limpa offset e executa busca completa.
3. `LocationCard`:
- Validar mapeamento de campos e placeholders (já em uso), sem acoplar à origem dos dados.
4. Edge Function:
- Instruir ajuste CORS no servidor (responder `OPTIONS` com `Access-Control-Allow-Origin: *` e demais cabeçalhos) e validar com um teste de preflight.

## Testes
- Cenários:
  - Localização negada (code 1) → Mostrar `GeolocationHandler` e, após informar cidade/estado, listar cards corretamente.
  - Posição indisponível (code 2) → Fallback ao perfil/localStorage; listar cards.
  - Múltiplas execuções de `refresh` e `loadMore` → Sem duplicações; sem loops.
  - Inclusão de novos locais no DB → Aparição nos resultados após `refresh` ou próximo ciclo.
- Testes unitários/integrados:
  - Mockar `GeolocationService` e `Auth` para simular estados.
  - Validar que `useVibePlaces` retorna `places` nas duas branches (manual e GPS) e que `LocationSwipe` gera os cards.

## Métricas
- Percentual de sessões sem GPS que ainda renderizam cards.
- Tempo médio de primeira render sem GPS.
- Taxa de falha da Edge Function; volume de "dados locais" vs "dados novos".

## Entregáveis
- UI com feedback de modo manual e toasts claros.
- Varredura funcional sem GPS, com cards completos.
- Correção/mitigação de CORS para novos lugares (server-side), sem afetar a UX.
- Testes cobrindo cenários acima e resultados consistentes depois de múltiplas execuções.