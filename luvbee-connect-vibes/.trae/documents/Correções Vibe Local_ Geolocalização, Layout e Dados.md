## Diagnóstico
- Erro recorrente: `code: 2 (POSITION_UNAVAILABLE)` com mensagem “Failed to query location from network service”.
- Impacto: fluxo interrompido quando geolocalização indisponível e não há cidade/estado manual — lista de locais fica vazia.
- Causa raiz: fallback para IP não aciona no `code === 2` em `src/services/geolocation.service.ts:95-99`.
- Sintomas adicionais: risco de sobreposição visual em cabeçalho/indicadores; dados incompletos em cards.

## Fluxo de Dados
- Origem → VibeLocalPage: solicita GPS e aplica fallback manual ou IP
  - `src/pages/VibeLocalPage.tsx:147-152` chama `GeolocationService.getCurrentLocation`
  - Fallback manual (perfil/localStorage) `src/pages/VibeLocalPage.tsx:77-124`
  - Modo e raio: `src/pages/VibeLocalPage.tsx:37, 362-367`
- Hook → Supabase: carrega locais por GPS ou cidade/estado
  - `src/hooks/useVibePlaces.ts:96-152` cache e Edge Function
  - `src/hooks/useVibePlaces.ts:154-181` RPC `get_places_nearby`
  - `src/hooks/useVibePlaces.ts:68-95` RPC `get_places_by_city_state`
- UI → Render e ações
  - Lista e swipe: `src/components/location/LocationSwipe.tsx:24-34, 202-270`
  - Card com fallbacks: `src/components/location/LocationCard.tsx:53-67, 136-210`

## Implementações (Prioridade 1: Restaurar locais)
- Geolocalização
  - Alterar fallback: incluir `code === 2` para usar IP quando posição indisponível
    - Ponto de ajuste: `src/services/geolocation.service.ts:95-99`
  - Melhorar logs: substituir `console.*` por `safeLog` para logs saneados
    - Ponto de ajuste: `src/services/geolocation.service.ts:127-156, 160-171`
  - Em `VibeLocalPage`, manter sheet e fallback manual já existente (`src/pages/VibeLocalPage.tsx:250-256, 356-360`)
- Hook de lugares
  - Adicionar `safeLog` em erros de RPC e Edge Function
    - Ponto: `src/hooks/useVibePlaces.ts:183-205`
  - Enriquecer mensagem de erro com nome da RPC e status

## Implementações (Prioridade 2: Layout e sobreposição)
- Cabeçalho
  - Adicionar `z-index` ao container do cabeçalho (classe `z-10`) para garantir empilhamento acima do conteúdo
    - Ponto: `src/pages/VibeLocalPage.tsx:395-440`
  - Badge: reforçar truncamento e `z-10`
    - CSS já existente: `src/index.css:51-66`; acrescentar `z-index` se necessário
- Indicador de swipe
  - Tornar não interativo e previsível no empilhamento
    - Adicionar `pointer-events-none z-20` no indicador absoluto: `src/components/location/LocationSwipe.tsx:259-268`
- Mobile
  - Confirmar `prevent-mobile-overflow` e `touch-target-enhanced` (já em `src/index.css:68-78`)

## Implementações (Prioridade 3: Informações completas)
- Validação de dados
  - Consolidar fallbacks (já em `LocationCard`): nome/endereço/descrição/rating
    - `src/components/location/LocationCard.tsx:58-67`
  - Garantir placeholders de imagem e normalização
    - `src/components/location/LocationCard.tsx:72-81`
- Pré-render checks
  - Na lista/swipe, filtrar itens sem `id`/`place_id` e campos mínimos; logar ocorrência

## Testes
- Unitários
  - Geolocalização: fallback IP para `code:2` e validações de coordenadas
    - Base: `src/services/__tests__/geolocation.service.test.ts`
  - VibeLocalPage: fluxo quando GPS falha sem manual → usa IP e exibe locais
    - Base: `src/__tests__/VibeLocalPage.test.tsx:48-106, 142-166`
- Layout
  - Não sobreposição de badges e indicadores; classes mobile corretas
    - Base: `src/__tests__/VibeLocalPage.test.tsx:109-140`
- Integração
  - `useVibePlaces`: caminhos GPS vs cidade/estado, cache expirado, filtragem de matches
    - Base: `src/hooks/useVibePlaces.ts:50-205`

## Monitoramento e Logs
- Usar `safeLog` com padrão JSON conforme regras do projeto: `src/lib/safe-log.ts:58-74`
- Registrar eventos críticos: erros de geolocalização, cache expirado, RPC falhas
- Considerar `monitorService` para sumarizar métricas de falhas frequentes

## Documentação
- Atualizar `testsprite_tests/tmp/prd_files/prd.md` com:
  - Diagnóstico, solução de fallback IP para `code 2`
  - Diagramas de fluxo (Mermaid) do processo: GPS → Fallback → Hook → RPC → UI
  - Casos de teste unitário e integração adicionados
- Estilo: atualizar documentação de CSS responsivo em `testsprite_tests/tmp/prd_files`
- Especificar requisitos técnicos adicionais em `PROJECT-STRUCTURE.md`:
  - Padrão de logs com `safeLog`, classes CSS de prevenção (`prevent-mobile-overflow`, `location-status-badge`), e necessidade de RLS ativa nas tabelas consumidas pelas RPCs de locais.

## Validação
- Executar suíte de testes (`npm run test`, `npm run test:coverage`), garantir ≥80% cobertura
- Testar manualmente no Chrome/Edge em mobile e desktop; verificar:
  - Erros `code:2` resultam em locais via IP
  - Cabeçalho não sobrepõe conteúdo
  - Cards mostram informações completas com fallbacks

Confirme para eu aplicar as mudanças nos pontos indicados e atualizar a documentação e testes conforme descrito.