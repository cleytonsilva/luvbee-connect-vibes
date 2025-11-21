## Entendimento
- "Ferramenta" refere-se às Edge Functions do Supabase (search-nearby e spider-events) e ao fluxo de persistência de locais/eventos em `locations`.
- Hoje já existem operações de CRUD sobre `locations` em dois pontos:
  1) Edge Functions: spider-events (insere/atualiza eventos) e fetch-places-google (upsert de locais por Google Place).
  2) Serviços do app: location.service (create/update/delete) e testes de integração.

## Conclusão
- Não é necessário criar um novo CRUD básico para a ferramenta: já existe persistência e atualização no backend para eventos e locais.
- O que pode ser ajustado é a política de quando executar essas operações, para evitar duplicação/estouro:
  - TTL/cache de execuções (evitar reprocessar a mesma área repetidamente).
  - Dedup rigoroso por chaves (`source_id`, `google_place_id`).
  - Idempotência nas Functions (upsert ao invés de insert puro).

## Recomendações
- search-nearby: manter apenas leitura (sem CRUD), servindo como gateway de dados do Google; a persistência deve ocorrer em uma função dedicada (já existe: fetch-places-google).
- spider-events: manter upsert com chave única por fonte; adicionar TTL de execução por `city/state` para evitar repetições frequentes.
- location.service: preservar CRUD para uso administrativo/moderação.

## Ajustes Propostos (sem implementar ainda)
1. Adicionar TTL/lock leve nas Functions:
   - Guardar marcação de última execução por `locationKey` em `kv`/cache leve (memória, tabela simples `function_runs`).
   - Bloquear execuções repetidas em janela (15–30 min), retornando status 200 com mensagem "usando cache".
2. Fortalecer dedup:
   - spider-events: garantir índice único em `source_id` e usar `upsert` com `on conflict`.
   - fetch-places-google: conferir `google_place_id` antes de upsert e normalizar tipos.
3. Telemetria mínima:
   - Logar contadores: chamados por função, itens inseridos, itens atualizados, ignorados por duplicidade.

## Verificação
- Medir redução de inserts/updates por janela e confirmar latência estável.
- Confirmar que o app continua lendo do `locations` sem regressões.

Confirma que seguimos com ajustes de TTL/dedup nas Edge Functions (sem criar novo CRUD), preservando o CRUD administrativo existente?