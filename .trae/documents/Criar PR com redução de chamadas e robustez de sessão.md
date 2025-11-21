## Objetivo
- Commitar e abrir PR com as melhorias para reduzir chamadas redundantes (dedup/TTL) e corrigir fluxo de sessão (refresh token inválido), mantendo build/testes verdes.

## Branch
- Criar branch: `feature/reduce-places-calls-ttl-dedup`
- Base: `main` (ou `master`, se o repo usar). Validar com `git branch -a`.

## Commits Lógicos (mensagens em português)
1. `feat(discovery): dedup de getFeed e TTL de população; corrigir chamada searchNearby`
   - Arquivo: `src/services/discovery.service.ts`
   - Conteúdo: dedup por `locationKey`, TTL 15 min para população, re-fetch condicional; chamada `searchNearby({ latitude, longitude, radius })` corrigida.
2. `feat(places): cache TTL, dedup em voo e tratamento de 400 em searchNearby`
   - Arquivo: `src/services/google-places.service.ts`
   - Conteúdo: cache memória/localStorage (30 min), coalescência de requisições por chave, validação de parâmetros e não-retry em 400.
3. `feat(vibe-local): blindar useEffect e coalescer loadFeed`
   - Arquivo: `src/pages/VibeLocalPage.tsx`
   - Conteúdo: guard contra execuções duplicadas, controle de requisição em voo e prevenção de sobrescrita de estado.
4. `chore(spider-events): TTL de execução por cidade/estado para evitar varreduras repetidas`
   - Arquivo: `supabase/functions/spider-events/index.ts`
   - Conteúdo: pular execução se houver eventos atualizados recentemente (< 15 min).
5. `fix(auth): sanitizar sessão persistida para evitar invalid refresh token`
   - Arquivo: `src/integrations/supabase.ts`
   - Conteúdo: remover storage corrompido, `signOut()` quando faltarem tokens; limpar em `onAuthStateChange`.

## Build e Testes
- Executar `npm test` (se existir) e `npm run build`.
- Garantir que não há falhas.

## Push
- `git push -u origin feature/reduce-places-calls-ttl-dedup`

## Pull Request
- Título: `Redução de chamadas (dedup/TTL) + robustez de sessão`
- Descrição:
  - Objetivo: reduzir tráfego redundante e corrigir fluxo de sessão.
  - Mudanças: ver lista dos 5 commits.
  - Impacto: menos chamadas ao Edge/Supabase, ausência de loops, UX mais estável; build/testes verdes.
- Revisores: adicionar usuários do time (ex.: `@admin`, `@moderator`) — se não conhecidos, deixar em branco e marcar label `needs-review`.
- Issues: associar se houver (ex.: `#123`), senão mencionar "Sem issues relacionadas".
- Labels: `performance`, `supabase`, `backend`, `auth`, `bugfix`.
- Destino: `main` (confirmar nome do branch principal).

## Verificação
- Confirmar PR criado com branch correto, commits organizados, build/testes ok.

Aprovar para que eu execute os comandos e crie o PR automaticamente.