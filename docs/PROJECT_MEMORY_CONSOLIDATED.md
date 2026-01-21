# Memória Consolidada do Projeto Luvbee

Este documento consolida o contexto operacional e decisões técnicas do projeto Luvbee, reunindo (em formato resumido e rastreável) as principais informações necessárias para manutenção, troubleshooting e evolução do sistema.

Atualizado em: 2026-01-06

## Finalidade

- Servir como “fonte rápida” para entender arquitetura, fluxos críticos e integrações
- Evitar fragmentação de conhecimento em múltiplos arquivos
- Acelerar suporte e correções (especialmente em geolocalização, Places e cache)

## Índice de Fontes (docs/)

- PROJECT_MEMORY.md (base do sistema de geolocalização e Places)
- SISTEMA_GEOLOCALIZACAO.md (detalhamento e troubleshooting)
- VIBELOCAL_TECHNICAL_FIXES.md (correções técnicas do /vibe-local)
- SUPABASE_CACHE_IMPLEMENTATION.md, DEPLOY_GUIDE_CACHE_SYSTEM.md, EXECUTIVE_SUMMARY_CACHE_SYSTEM.md, CHANGELOG_CACHE_SYSTEM.md, CACHE_OPTIMIZATION_REPORT.md (cache e otimizações)
- VERIFICACAO_SUPABASE_MCP.md (verificação de estruturas no Supabase)
- DOCUMENTACAO_COMPLETA_PAGINAS.md (visão geral por página)
- user_preferences.md (preferências e onboarding)
- SECURITY-WORKFLOW-SETUP.md, SECURITY-TESTS.md (segurança e validações)
- RESUMO_PULL_REQUEST_9.md (marco de implementação)
- PRD_MELHORADO.md, PLANO_IMPLEMENTACAO_GAPS.md (produto e gaps)
- IMAGENS-LOCATIONS-SOLUCOES.md (imagens e estratégias)

## Arquitetura: Geolocalização e Vibe Local

O sistema de geolocalização foi desenhado para ser resiliente em produção, com fallback e validação de coordenadas para evitar bloqueio da experiência do usuário.

### Fallback de Localização (alto nível)

```
GPS → Serviços de IP → Localização padrão (São Paulo)
```

### Componentes principais

```
src/
├── services/
│   ├── geolocation.service.ts
│   ├── google-maps-loader-compat.service.ts
│   └── google-places.service.ts
├── hooks/
│   └── useVibePlaces.ts
├── pages/
│   └── VibeLocalPage.tsx
└── components/
    └── location/
        ├── PlaceSearch.tsx
        └── VibeMatchCard.tsx

supabase/
└── functions/
    └── fetch-places-google/
```

### Interface de localização (referência)

```ts
interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}
```

### Fluxo de funcionamento (resumo)

1. Usuário abre `/vibe-local`
2. O app tenta obter GPS via `GeolocationService.getCurrentLocation`
3. Se falhar/timeout, tenta coordenadas via serviços de IP
4. Se tudo falhar, usa coordenadas padrão (São Paulo) e mantém UI utilizável
5. Com latitude/longitude (ou cidade/estado manual), o `useVibePlaces` busca locais via cache/Edge Function

## Busca de Locais: useVibePlaces e Edge Function

A busca combina cache e fallback para manter performance e reduzir dependência de chamadas diretas ao Google no cliente.

### Estratégia híbrida (resumo)

- Cache local (validade configurável, ex.: 30 dias)
- RPC/consulta local no Supabase quando disponível
- Edge Function `fetch-places-google` como fallback (com paginação e deduplicação)

### Edge Function: retorno esperado (referência)

```ts
interface MinimalPlaceCard {
  place_id: string
  name: string
  lat: number
  lng: number
  photo_url?: string
  rating?: number
  price_level?: number
  types: string[]
  vicinity?: string
}
```

## Preferências de Usuário (onboarding)

Persistência de preferências selecionadas no onboarding:

- Tabela: `public.user_preferences`
- Campos: `drink_preferences`, `food_preferences`, `music_preferences` (TEXT[]), `vibe_preferences` (JSONB opcional)
- Fluxo: `UserService.saveUserPreferences(userId, preferences)` faz upsert (onConflict: user_id) e marca `users.onboarding_completed = true`
- Validação: Zod (`userPreferencesSchema` e `updatePreferencesSchema` em `src/lib/validations.ts`)

Payload esperado:

```json
{
  "drink_preferences": ["..."],
  "food_preferences": ["..."],
  "music_preferences": ["..."],
  "vibe_preferences": {}
}
```

## Verificação do Supabase (estrutura)

Status verificado (30/01/2025) em `VERIFICACAO_SUPABASE_MCP.md`:

- Tabelas centrais existentes (ex.: users, locations, chats, messages, cached_place_photos, user_preferences)
- Buckets: `div` (cache fotos) e `profile-photos`
- RPCs principais existentes (ex.: get_places_nearby, get_potential_matches, get_cached_photo_url)
- RLS habilitado e policies configuradas

## VibeLocal: correções técnicas relevantes

Baseado em `VIBELOCAL_TECHNICAL_FIXES.md`:

- Fallback de IP com múltiplos provedores antes do padrão
- Validação de formatos diversos de resposta (lat/lng/longitude etc.)
- Melhorias de layout responsivo (evitar overlap e melhorar touch targets)
- Fallbacks de dados (nome/endereço/descrição) e fallback de imagens

## Segurança e testes (referências)

- SECURITY-WORKFLOW-SETUP.md: configuração de workflows e ferramentas
- SECURITY-TESTS.md: rotinas de validação

## Como usar este arquivo

- Para diagnóstico de geolocalização: comece em “Arquitetura: Geolocalização e Vibe Local” e confirme o fallback
- Para erros de onboarding: vá em “Preferências de Usuário”
- Para inconsistências no banco/cache: valide “Verificação do Supabase” e docs de cache

## Referências rápidas (arquivos)

- Base geolocalização (detalhada): PROJECT_MEMORY.md, SISTEMA_GEOLOCALIZACAO.md
- Cache e deploy: SUPABASE_CACHE_IMPLEMENTATION.md, DEPLOY_GUIDE_CACHE_SYSTEM.md
- Páginas e componentes: DOCUMENTACAO_COMPLETA_PAGINAS.md

## Operação: Supabase Linter, Performance e Segurança (marco de otimizações)

Fonte principal: `🏆_FINAL_CONSOLIDATED_REPORT.md`.

### Resultado consolidado

- Alertas: WARN (performance) 177+ → 0; WARN (security) 26 → 0; INFO (improvements) 67 → aplicadas
- Segurança: 26 funções com `SET search_path = ''` e endurecimento contra SQLi
- RLS: policies consolidadas/otimizadas e uso de padrão `(select auth.uid())` para reduzir reavaliação por linha
- Performance esperada: +22–32% (estimativa do relatório final)

### Migrations (8) reportadas como aplicadas

```
supabase/migrations/
20250130000001_fix_user_preferences_hashes_rls.sql
20250130000002_fix_supabase_linter_alerts.sql
20250130000003_optimize_rls_policies_auth_calls.sql
20250130000004_fix_all_rls_alerts.sql
20250130000005_fix_remaining_17_alerts.sql
20250130000006_final_7_alerts.sql
20250130000007_performance_improvements.sql
20250130000008_fix_security_warnings.sql
```

### Checklist de deploy (resumo)

- Staging: aplicar migrations, rodar testes, validar performance e monitorar por 4h
- Produção: backup completo, deploy fora do pico, monitorar 1h e acompanhar 24h

## Deploy e ambiente (Vercel + variáveis)

Fontes: `DEPLOY.md`, `ENV_SETUP.md`, `GOOGLE_API_KEY_SETUP.md`.

### Variáveis obrigatórias (frontend)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Chaves Google: separação frontend vs backend

- Frontend: `VITE_GOOGLE_MAPS_API_KEY` (pode ter restrição por domínio)
- Backend (Edge Functions): `GOOGLE_MAPS_BACKEND_KEY` (não usar restrição de referer)

## Reorganização de documentação (2026-01-06)

### Sumário das alterações

- Centralização de referências e marcos em `docs/PROJECT_MEMORY_CONSOLIDATED.md`
- Remoção de arquivos de status duplicados e guias redundantes na raiz
- Remoção de diretório temporário com templates duplicados

### Arquivos removidos (com justificativa)

- `CSS_DIAGNOSTIC.md` (diagnóstico pontual; substituído por guias estáveis e memória consolidada)
- `TAILWIND_CSS_FIX.md` (fix histórico redundante)
- `BUGFIX_TAILWIND_DYNAMIC_CLASSES.md` (fix histórico redundante)
- `✅_TAILWIND_CSS_FIXED.md` (status redundante)
- `VERIFICAR_CSS_POS_DEPLOY.md` (checklist redundante)
- `VERCEL_ENV_SETUP.md` (substituído por `DEPLOY.md` + `ENV_SETUP.md`)
- `VERCEL_ENV_QUICK_SETUP.md` (substituído por `DEPLOY.md` + `ENV_SETUP.md`)
- `VERCEL_DEPLOYMENT_GUIDE.md` (substituído por `DEPLOY.md`)
- `GUIA-DEPLOY-VERCEL.md` (substituído por `DEPLOY.md`)
- `VERCEL_FIX_SUMMARY.md` (status redundante)
- `VERCEL_FINAL_FIXES.md` (status redundante)
- `VERCEL_ERRORS_FIXED.md` (status redundante)
- `✅_VERCEL_FIXES_COMPLETE.md` (status redundante)
- `🚨_VERCEL_ACTION_REQUIRED.md` (ação pontual; coberta por `ENV_SETUP.md`)
- `GITHUB_PUSH_SUMMARY.md` (status operacional pontual)
- `TESTE_POS_DEPLOY.md` (status operacional pontual)
- `SUPABASE_LINTER_ALERTS_FIXED.md` (status redundante; consolidado no relatório final)
- `SUPABASE_LINTER_FIXES_REPORT.md` (status redundante; consolidado no relatório final)
- `SUPABASE_MIGRATIONS_SUMMARY.md` (status redundante; consolidado no relatório final)
- `FINAL_STATUS_ALL_ALERTS_FIXED.md` (status redundante; consolidado no relatório final)
- `DEPLOY-AGORA.md` (atalho redundante; substituído por `DEPLOY.md`)
- `ORGANIZATION-SUMMARY.md` (sumário redundante)
- `PROJECT-STRUCTURE.md` (estrutura redundante)
- `RELATORIO_ERROS_CORRIGIDOS.md` (relatório redundante)
- `RELATORIO_CORRECOES.md` (relatório redundante)
- `spec-kit-temp/` (diretório temporário com templates duplicados de `.specify/`)

### Novos conteúdos adicionados

- Referências consolidadas em `DEPLOY.md` (substitui guias Vercel redundantes)
- Referências corrigidas em relatórios executivos de alertas e deploy

### Estrutura final (documentação principal)

```
README.md
CHANGELOG.md
DEPLOY.md
ENV_SETUP.md
GOOGLE_API_KEY_SETUP.md
SUPABASE_SETUP.md
SUPABASE_MANUAL_SETUP.md
CONFIGURACAO-SEGURANCA.md
APLICAR-MIGRACAO-RLS.md
APPLY_MIGRATION.md
PROTECTED_FILES.md
docs/
  PROJECT_MEMORY_CONSOLIDATED.md
  (demais documentos técnicos mantidos em docs/)
```
