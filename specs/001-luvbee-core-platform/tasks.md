# Tasks: LuvBee Core Platform

**Input**: Design documents from `/specs/001-luvbee-core-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Testes são OPCIONAIS conforme especificação. Se implementados, devem seguir TDD (escrever testes primeiro, garantir que falham, depois implementar).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/` at repository root (frontend React + Supabase backend)
- Paths shown below follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Criar estrutura de pastas conforme plan.md em `src/`
- [ ] T002 [P] Configurar TypeScript (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- [ ] T003 [P] Configurar Vite (`vite.config.ts`) com plugins React e SWC
- [ ] T004 [P] Configurar ESLint e Prettier conforme padrões do projeto
- [ ] T005 [P] Configurar TailwindCSS (`tailwind.config.ts`) com tema neo-brutalista
- [ ] T006 [P] Configurar Shadcn UI (`components.json`) e instalar componentes base
- [ ] T007 [P] Configurar Vitest (`vitest.config.ts`) e React Testing Library
- [ ] T008 Configurar variáveis de ambiente (`.env.example`, `.env.local`)
- [ ] T009 [P] Configurar React Router DOM com estrutura de rotas base
- [ ] T010 [P] Configurar fontes Space Grotesk e Space Mono (Google Fonts ou local)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Configurar cliente Supabase em `src/integrations/supabase.ts`
- [ ] T012 [P] Criar tipos TypeScript do banco em `src/integrations/database.types.ts` (gerar via Supabase CLI)
- [ ] T013 [P] Criar schemas Zod de validação em `src/lib/validations.ts` (baseado em contracts/zod-schemas.md)
- [ ] T014 Criar constantes do projeto em `src/lib/constants.ts` (cores, opções de preferências, etc.)
- [ ] T015 [P] Criar tipos TypeScript base em `src/types/` (user.types.ts, location.types.ts, match.types.ts, chat.types.ts)
- [ ] T016 [P] Criar utilitários em `src/lib/utils.ts` (cn helper, formatters, etc.)
- [ ] T017 Configurar sistema de tratamento de erros global
- [ ] T018 [P] Criar layout base `src/layouts/MainLayout.tsx` e `src/layouts/AuthLayout.tsx`
- [ ] T019 [P] Criar componente de navegação `src/components/layout/Navigation.tsx`
- [ ] T020 Configurar proteção de rotas (guards de autenticação)
- [ ] T021 [P] Criar hook base `src/hooks/useAuth.ts` para gerenciar autenticação
- [ ] T022 Configurar React Query (`@tanstack/react-query`) com provider global
- [ ] T023 Criar migrations do Supabase baseadas em data-model.md (todas as tabelas, índices, RLS policies, triggers)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Autenticação e Onboarding Inicial (Priority: P1) 🎯 MVP

**Goal**: Usuário pode criar conta, fazer login e configurar preferências iniciais

**Independent Test**: Criar novo usuário, completar onboarding, verificar preferências salvas

### Implementation for User Story 1

- [ ] T024 [US1] Criar componente `src/components/auth/RegisterForm.tsx` com validação Zod
- [ ] T025 [US1] Criar componente `src/components/auth/LoginForm.tsx` com validação Zod
- [ ] T026 [US1] Criar serviço `src/services/auth.service.ts` com métodos signup, login, logout
- [ ] T027 [US1] Criar página `src/pages/Auth.tsx` que alterna entre login e registro
- [ ] T028 [US1] Criar componente `src/components/auth/OnboardingFlow.tsx` com seleção de preferências
- [ ] T029 [US1] Criar serviço `src/services/user.service.ts` para gerenciar perfil e preferências
- [ ] T030 [US1] Criar página `src/pages/Onboarding.tsx` que usa OnboardingFlow
- [ ] T031 [US1] Implementar redirecionamento após registro → onboarding → dashboard
- [ ] T032 [US1] Implementar redirecionamento após login baseado em onboarding_completed
- [ ] T033 [US1] Adicionar validação de onboarding completo antes de acessar core loops
- [ ] T034 [US1] Implementar atualização de `onboarding_completed` após salvar preferências
- [ ] T035 [US1] Adicionar tratamento de erros e feedback visual em todos os formulários
- [ ] T036 [US1] Implementar persistência de sessão (refresh token)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Core Loop 1: Vibe Local (Priority: P1) 🎯 MVP

**Goal**: Usuário pode descobrir e dar match com locais através de interface de swipe

**Independent Test**: Após onboarding, acessar Vibe Local, dar swipe em locais, verificar matches salvos

**Prerequisites**: User Story 1 completa, migrations do banco executadas

### Implementation for User Story 2

- [ ] T037 [US2] Criar serviço `src/services/google-places.service.ts` para integração com Google Places API
- [ ] T038 [US2] Criar serviço `src/services/location.service.ts` para gerenciar locais e matches
- [ ] T039 [US2] Criar hook `src/hooks/useLocations.ts` para buscar e gerenciar locais
- [ ] T040 [US2] Criar componente `src/components/location/LocationCard.tsx` com informações do local
- [ ] T041 [US2] Criar componente `src/components/location/LocationSwipe.tsx` com gestos de swipe
- [ ] T042 [US2] Criar componente `src/components/location/LocationList.tsx` para lista de matches
- [ ] T043 [US2] Criar componente `src/components/location/LocationFilter.tsx` para filtros (opcional inicial)
- [ ] T044 [US2] Criar página `src/pages/VibeLocal.tsx` que usa LocationSwipe
- [ ] T045 [US2] Implementar busca de locais próximos baseada em localização do usuário
- [ ] T046 [US2] Implementar criação de `location_matches` quando usuário dá like
- [ ] T047 [US2] Implementar paginação/infinite scroll para carregar mais locais
- [ ] T048 [US2] Implementar feedback visual ao dar like/dislike (animações)
- [ ] T049 [US2] Implementar mensagem quando não há mais locais disponíveis
- [ ] T050 [US2] Adicionar tratamento de erros (API Google Places, rede, etc.)
- [ ] T051 [US2] Implementar cache de locais para melhorar performance
- [ ] T052 [US2] Criar página/rota para visualizar lista de matches com locais

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Core Loop 2: Vibe People (Priority: P1) 🎯 MVP

**Goal**: Usuário pode ver pessoas com locais em comum, ordenadas por compatibilidade, e dar match

**Independent Test**: Após ter matches com locais, acessar Vibe People, ver perfis filtrados, dar match, verificar match mútuo cria chat

**Prerequisites**: User Story 2 completa (usuário precisa ter matches com locais)

### Implementation for User Story 3

- [ ] T053 [US3] Criar função SQL `calculate_compatibility_score` no Supabase (baseada em preferências e locais em comum)
- [ ] T054 [US3] Criar serviço `src/services/compatibility.service.ts` para cálculo de compatibilidade
- [ ] T055 [US3] Criar serviço `src/services/matching.service.ts` para gerenciar matches entre pessoas
- [ ] T056 [US3] Criar hook `src/hooks/useCompatibility.ts` para calcular e cachear scores
- [ ] T057 [US3] Criar hook `src/hooks/useMatches.ts` para gerenciar matches com pessoas
- [ ] T058 [US3] Criar componente `src/components/matching/PersonCard.tsx` com informações do perfil
- [ ] T059 [US3] Criar componente `src/components/matching/CompatibilityBadge.tsx` para exibir score
- [ ] T060 [US3] Criar componente `src/components/matching/PersonSwipe.tsx` com gestos de swipe
- [ ] T061 [US3] Criar página `src/pages/VibePeople.tsx` que usa PersonSwipe
- [ ] T062 [US3] Implementar query para buscar pessoas com locais em comum (via Supabase PostgREST)
- [ ] T063 [US3] Implementar ordenação por `compatibility_score` (maior primeiro)
- [ ] T064 [US3] Implementar criação de `people_matches` quando usuário dá like
- [ ] T065 [US3] Implementar trigger/function para detectar match mútuo e atualizar status
- [ ] T066 [US3] Implementar bloqueio de acesso se usuário não tem matches com locais
- [ ] T067 [US3] Implementar exibição de preferências em comum e locais em comum no perfil
- [ ] T068 [US3] Implementar paginação/infinite scroll para carregar mais perfis
- [ ] T069 [US3] Implementar feedback visual ao dar like (animações)
- [ ] T070 [US3] Adicionar tratamento de erros e estados de loading
- [ ] T071 [US3] Implementar cache de scores de compatibilidade para performance

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently

---

## Phase 6: User Story 4 - Sistema de Chat e Conexões (Priority: P2)

**Goal**: Usuários com match mútuo podem trocar mensagens em tempo real

**Independent Test**: Após match mútuo, acessar chat, enviar mensagem, verificar recebimento em tempo real

**Prerequisites**: User Story 3 completa (match mútuo necessário)

### Implementation for User Story 4

- [ ] T072 [US4] Criar trigger no Supabase para criar chat automaticamente quando `people_matches.status` muda para 'mutual'
- [ ] T073 [US4] Criar serviço `src/services/chat.service.ts` para gerenciar chats e mensagens
- [ ] T074 [US4] Criar hook `src/hooks/useChat.ts` para gerenciar estado do chat e mensagens
- [ ] T075 [US4] Criar componente `src/components/chat/ChatListItem.tsx` para lista de conversas
- [ ] T076 [US4] Criar componente `src/components/chat/MessageList.tsx` para exibir mensagens
- [ ] T077 [US4] Criar componente `src/components/chat/MessageInput.tsx` para enviar mensagens
- [ ] T078 [US4] Criar componente `src/components/chat/ChatWindow.tsx` que combina MessageList e MessageInput
- [ ] T079 [US4] Criar página `src/pages/Chat.tsx` com lista de conversas e chat ativo
- [ ] T080 [US4] Configurar Supabase Realtime subscription para novas mensagens
- [ ] T081 [US4] Implementar envio de mensagens via PostgREST API
- [ ] T082 [US4] Implementar recebimento de mensagens em tempo real via Realtime
- [ ] T083 [US4] Implementar atualização de `read_at` quando mensagem é visualizada
- [ ] T084 [US4] Implementar contadores de mensagens não lidas (`user1_unread_count`, `user2_unread_count`)
- [ ] T085 [US4] Implementar exibição de locais em comum no chat
- [ ] T086 [US4] Implementar scroll automático para última mensagem
- [ ] T087 [US4] Implementar formatação de timestamps (relativo: "há 5 min", absoluto: "14:30")
- [ ] T088 [US4] Adicionar tratamento de erros (falha ao enviar, desconexão, etc.)
- [ ] T089 [US4] Implementar indicadores de status (enviando, enviado, lido)
- [ ] T090 [US4] Implementar notificações em tempo real quando recebe mensagem (se usuário está em outra tela)

**Checkpoint**: At this point, User Story 4 should be fully functional and testable independently

---

## Phase 7: User Story 5 - Descoberta: Explorar Locais e Eventos (Priority: P2)

**Goal**: Usuários podem explorar locais curados e eventos além do fluxo de swipe

**Independent Test**: Acessar Explorar, navegar locais, aplicar filtros, ver detalhes, dar match diretamente

**Prerequisites**: User Story 2 completa (sistema de locais funcionando)

### Implementation for User Story 5

- [ ] T091 [US5] Criar componente `src/components/discovery/ExploreLocations.tsx` para grid/lista de locais
- [ ] T092 [US5] Criar componente `src/components/discovery/LocationDetail.tsx` para página de detalhes
- [ ] T093 [US5] Criar componente `src/components/discovery/EventsList.tsx` para lista de eventos (se aplicável)
- [ ] T094 [US5] Criar página `src/pages/Explore.tsx` que usa ExploreLocations
- [ ] T095 [US5] Implementar busca de locais curados (`is_curated = true`) via PostgREST
- [ ] T096 [US5] Implementar filtros (tipo, localização, preço) em `src/components/location/LocationFilter.tsx`
- [ ] T097 [US5] Implementar rota `/explore/location/:id` para página de detalhes
- [ ] T098 [US5] Implementar dar match diretamente da página de detalhes
- [ ] T099 [US5] Implementar organização por categoria/tipo na tela Explorar
- [ ] T100 [US5] Implementar paginação/infinite scroll na lista de locais
- [ ] T101 [US5] Adicionar tratamento de erros e estados de loading
- [ ] T102 [US5] Implementar busca por texto (nome do local) se necessário

**Checkpoint**: At this point, User Story 5 should be fully functional and testable independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T103 [P] Aplicar design neo-brutalista em todos os componentes (cores #ff00ff e #FFFF00, fontes Space Grotesk/Mono, shadows hard, bordas grossas)
- [ ] T104 [P] Garantir responsividade em todas as telas (mobile-first, breakpoints consistentes)
- [ ] T105 [P] Adicionar acessibilidade (ARIA labels, navegação por teclado, contraste adequado)
- [ ] T106 [P] Implementar lazy loading de componentes pesados (React.lazy, Suspense)
- [ ] T107 [P] Otimizar bundle size (code splitting, tree shaking, análise de bundle)
- [ ] T108 [P] Implementar error boundaries para capturar erros React
- [ ] T109 [P] Adicionar loading states consistentes em todas as operações assíncronas
- [ ] T110 [P] Implementar toast notifications para feedback do usuário (usar Sonner ou similar)
- [ ] T111 Validar que todas as ações principais são completáveis em máximo 3 cliques
- [ ] T112 [P] Adicionar analytics/tracking básico (opcional, se necessário)
- [ ] T113 Executar validação completa seguindo quickstart.md
- [ ] T114 Corrigir bugs encontrados durante validação
- [ ] T115 [P] Atualizar documentação (README.md com instruções de setup)
- [ ] T116 Revisar e otimizar queries do Supabase para performance
- [ ] T117 Validar RLS policies em todas as tabelas (testar acesso não autorizado)
- [ ] T118 Validar validações Zod em todos os formulários (testar inputs inválidos)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (US1 → US2 → US3 → US4 → US5)
  - US2 depends on US1 (precisa de usuário autenticado com onboarding completo)
  - US3 depends on US2 (precisa de matches com locais)
  - US4 depends on US3 (precisa de match mútuo)
  - US5 can start after US2 (usa sistema de locais)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 completion (usuário autenticado e onboarding completo)
- **User Story 3 (P1)**: Depends on US2 completion (matches com locais necessários)
- **User Story 4 (P2)**: Depends on US3 completion (match mútuo necessário)
- **User Story 5 (P2)**: Depends on US2 completion (sistema de locais funcionando)

### Within Each User Story

- Services before components
- Components before pages
- Core functionality before polish (animações, feedback visual)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- T024-T036 (US1) can be partially parallel (forms, services, pages em arquivos diferentes)
- T037-T052 (US2) can be partially parallel (components, services, hooks em arquivos diferentes)
- T053-T071 (US3) can be partially parallel (components, services, hooks em arquivos diferentes)
- T072-T090 (US4) can be partially parallel (components, services, hooks em arquivos diferentes)
- T091-T102 (US5) can be partially parallel (components, pages em arquivos diferentes)
- All Polish tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Stories P1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL - blocks all stories**)
3. Complete Phase 3: User Story 1 (Autenticação e Onboarding)
4. Complete Phase 4: User Story 2 (Vibe Local)
5. Complete Phase 5: User Story 3 (Vibe People)
6. **STOP and VALIDATE**: Test all P1 stories independently using quickstart.md
7. Deploy/demo MVP if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo (MVP completo!)
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add Polish → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: Preparar infraestrutura para US2/US3
3. Once US1 is done:
   - Developer A: User Story 2
   - Developer B: User Story 3 (pode começar quando US2 tem matches salvos)
4. Once US2/US3 are done:
   - Developer A: User Story 4
   - Developer B: User Story 5
5. All developers: Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow quickstart.md for validation after each user story
- All tasks must follow Constitution rules (TypeScript, Zod validation, RLS, etc.)
- Design neo-brutalista must be applied consistently (cores, fontes, shadows)
- Maximum 3 clicks for main actions must be enforced

---

## Critical Path

**Minimum viable path to MVP (P1 stories only)**:

1. T001-T010 (Setup) → ~2-3 horas
2. T011-T023 (Foundational) → ~4-6 horas
3. T024-T036 (US1) → ~6-8 horas
4. T037-T052 (US2) → ~8-10 horas
5. T053-T071 (US3) → ~8-10 horas

**Total MVP**: ~28-37 horas de desenvolvimento

**Full platform (including P2 stories)**:

6. T072-T090 (US4) → ~6-8 horas
7. T091-T102 (US5) → ~4-6 horas
8. T103-T118 (Polish) → ~6-8 horas

**Total Full Platform**: ~44-59 horas de desenvolvimento

