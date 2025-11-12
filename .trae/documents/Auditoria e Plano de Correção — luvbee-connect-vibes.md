# Auditoria Completa do Projeto

## Achados da Auditoria
- TypeScript não estrito: `tsconfig.app.json:18-23`, `tsconfig.json:9,14` — Tipo: otimização/qualidade — Gravidade: alto — Impacto: bugs silenciosos, menor segurança de tipos.
- Supressão global de erros: `src/integrations/supabase.ts:29-99` — Tipo: vulnerabilidade/observabilidade — Gravidade: alto — Impacto: logs e falhas reais mascarados (409/406), difícil troubleshooting.
- Resposta falsa em erro 409: `src/integrations/supabase.ts:88-95` — Tipo: bug/segurança — Gravidade: alto — Impacto: estado inconsistente (operações tratadas como sucesso).
- Uso indevido de safeLog: `src/services/metrics.service.ts:87` — Tipo: bug — Gravidade: médio — Impacto: quebra de tipos, logs inconsistentes.
- Uso abrangente de `any` (exemplos):
  - `src/services/validation.service.ts:64,82,100,118,333,345,356` — Tipo: má prática — Gravidade: médio.
  - `src/services/message.service.ts:160,171,336,349,356` — Tipo: má prática — Gravidade: médio.
  - `src/services/location.service.ts:169,409,456,486,680,731` — Tipo: má prática — Gravidade: médio.
  - `src/components/location/PlaceSearch.tsx:33`, `src/components/profile/ProfileForm.tsx:144` — Tipo: má prática — Gravidade: baixo.
  - `src/hooks/useChat.ts:21,58,189` — Tipo: má prática — Gravidade: baixo.
  - `src/types/app.types.ts:8-9,29,157` — Tipo: má prática — Gravidade: médio.
- Queries com `select('*')` no cliente:
  - `src/services/auth.service.ts:385-388`, `src/services/metrics.service.ts:151-154` — Tipo: otimização/segurança — Gravidade: médio — Impacto: tráfego excessivo e exposição desnecessária de dados.
- Google Maps API key no cliente: `src/services/google-maps-loader.service.ts:31,48` — Tipo: segurança/configuração — Gravidade: médio — Impacto: risco de vazamento da chave; recomenda proxy/Edge Function.
- ESLint permissivo: `eslint.config.js:23` desativa `no-unused-vars` — Tipo: qualidade — Gravidade: baixo — Impacto: código morto e manutenção.
- Configurações TS permissivas: `skipLibCheck`, `allowJs` — `tsconfig.json:12,11`, `tsconfig.app.json:7` — Tipo: qualidade — Gravidade: médio.
- RLS: habilitado em tabelas principais (e.g., `supabase/migrations/20250127000000_create_core_tables.sql:...` e `20250128000007_fix_rls_policies.sql`) — Conforme diretriz; sem achados críticos aqui.

## Plano de Correção Priorizado
- Crítico (D1–D2):
  - Remover supressões e falsos positivos em `src/integrations/supabase.ts` (console/fetch) e substituir por `safeLog` contextual — 4–6h — Recursos: dev frontend — Dependências: nenhuma — Riscos: aumento de ruído de log; mitigar com níveis e filtros.
  - Ativar TS estrito (`strict`, `noImplicitAny`, `strictNullChecks`) e ajustar tipos mínimos em serviços críticos (`auth`, `message`, `location`) — 12–16h — Recursos: dev TS — Dependências: tipagem `Database` — Riscos: quebras de build; corrigir incrementalmente por módulos.
  - Restringir queries com seleção de colunas necessárias em `auth.service.ts` e `metrics.service.ts` — 3–5h — Recursos: dev — Dependências: uso real de campos — Riscos: campos faltantes; validar com testes.
- Alto (D3):
  - Corrigir uso de `safeLog('debug')` em `metrics.service.ts:87` para `safeLog('info')` ou ampliar tipo aceito no helper — 0.5h — Recursos: dev — Riscos: nenhum.
  - Introduzir 2FA para operações/admin (fluxo OTP via `input-otp` e verificação servidor/Supabase Auth) — 8–12h — Recursos: dev + configuração Supabase — Dependências: policies de role — Riscos: UX; documentar e feature flag.
- Médio (D4):
  - Tipar `any` nos serviços e componentes mais usados (top 10 locais citados) — 8–12h — Recursos: dev TS — Dependências: tipos `Database` — Riscos: esforço moderado.
  - Endurecer ESLint (reativar `no-unused-vars`, adicionar `no-explicit-any`, `@typescript-eslint/strict-boolean-expressions`) — 2–3h — Recursos: dev — Riscos: novos warnings; corrigir gradualmente.
  - Google Maps: mover consumo sensível para Edge Function ou restringir escopos da key (HTTP referrers, quotas) — 4–6h — Recursos: dev + console Google — Riscos: latência; medir.
- Baixo (Contínuo):
  - Revisar `console.log` em produção (`src/services/index.ts:97-106,121-126`) — 1h — Recursos: dev — Riscos: nenhum.

## Implementação Controlada
- Branches: `feature/ts-strict`, `feature/remove-error-suppression`, `feature/query-columns`, `feature/2fa`, `chore/eslint-hardening`.
- Commits: semânticos em PT (ex.: `feat(auth): restringir seleção de colunas`).
- Feature flags: habilitar 2FA e novos logs com toggle via env (`VITE_ENABLE_2FA`, `VITE_LOG_LEVEL`).
- Registro: atualizar `REVISAO-CORRECOES.md` e anotar mudanças no `CHANGELOG.md` (sem executar agora).

## Testes Rigorosos
- Unit: serviços `auth`, `message`, `location` — mocks Supabase; cobrir erros e sucesso.
- Integração: fluxo 2FA (OTP UI + verificação), queries com colunas específicas, supressão removida (verificar logs via `safeLog`).
- Regressão: executar suíte existente (`vitest`) e adicionar casos para tipos e RLS (acessos negados/permitidos simulados).
- Performance: medições simples (`metrics.service.ts`) antes/depois; validar diminuição de payloads.

## Documentação Final
- Atualizar `/docs` funcionalidades afetadas (autenticação, métricas, logs) e `INTEGRACOES.md` (variáveis de ambiente e endpoints). Incluir exemplos, dependências e troubleshooting.

## Deploy Controlado
- Staging: build `vite`, variáveis seguras, key Maps restrita; smoke tests e monitoramento (métricas, logs).
- Observação 48h: alertas para autenticação, erros, latência.
- Produção: rollback automático habilitado; políticas RLS revisadas.

## Monitoramento Pós-Implantação
- Janela 7 dias com alertas (`error_rate`, `auth_success_rate`, `api_response_time`).
- Hotfixes: pipeline `hotfix/*` preparado; critérios de acionamento documentados.

## Próximos Passos
- Confirmar este plano para iniciar execução D1–D2. Após correções iniciais, reporto resultados e avanço para D3–D4 com testes e documentação.