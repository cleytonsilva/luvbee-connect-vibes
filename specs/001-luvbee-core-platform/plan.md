# Implementation Plan: LuvBee Core Platform

**Branch**: `001-luvbee-core-platform` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-luvbee-core-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implementar a plataforma core do LuvBee, um aplicativo de curadoria de "rolês" e experiências sociais que resolve o problema de "matches mortos" através de um sistema de Match em Duas Camadas: primeiro com Locais, depois com Pessoas que compartilham os mesmos locais e têm alta compatibilidade de preferências. A solução técnica utiliza React + TypeScript + Vite no frontend, Supabase como backend completo (Auth, Database, Realtime), e integração com Google Places API para dados de locais.

## Technical Context

**Language/Version**: TypeScript 5.8+  
**Primary Dependencies**: React 18.3+, Vite 5.4+, React Router DOM 6.30+, @supabase/supabase-js 2.80+, @tanstack/react-query 5.83+, Zod 3.25+, React Hook Form 7.61+  
**Storage**: Supabase PostgreSQL (com Row Level Security ativo)  
**Testing**: Vitest 4.0+, React Testing Library 16.3+  
**Target Platform**: Web (desktop e mobile responsivo)  
**Project Type**: web (frontend + backend via Supabase)  
**Performance Goals**: 
- Carregamento inicial < 3s em 4G
- Latência de mensagens em tempo real < 1s
- Cálculo de compatibilidade < 2s
- Suporte a 10k usuários simultâneos
**Constraints**: 
- RLS obrigatório em produção
- Validação Zod em todos os inputs
- Máximo 3 cliques para ações principais
- Design neo-brutalista rigoroso (cores, fontes, shadows)
**Scale/Scope**: 
- 10.000 usuários simultâneos
- Milhares de locais via Google Places
- Milhões de matches e mensagens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Code Quality First**: TypeScript com tipos estritos, Zod para validação, error handling completo
✅ **Test-Driven Development**: TDD obrigatório, cobertura > 80%, testes antes de implementação
✅ **User Experience Consistency**: Responsivo, acessível, máximo 3 cliques, Shadcn UI
✅ **Security & Validation**: Zod em todos os inputs, RLS no Supabase, autenticação robusta
✅ **Performance & Scalability**: Lazy loading, caching, otimização de bundle, código escalável

## Project Structure

### Documentation (this feature)

```text
specs/001-luvbee-core-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── OnboardingFlow.tsx
│   ├── location/
│   │   ├── LocationCard.tsx
│   │   ├── LocationSwipe.tsx
│   │   ├── LocationList.tsx
│   │   └── LocationFilter.tsx
│   ├── matching/
│   │   ├── PersonCard.tsx
│   │   ├── PersonSwipe.tsx
│   │   └── CompatibilityBadge.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatListItem.tsx
│   ├── discovery/
│   │   ├── ExploreLocations.tsx
│   │   ├── EventsList.tsx
│   │   └── LocationDetail.tsx
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   └── ui/              # Shadcn components
├── pages/
│   ├── Auth.tsx
│   ├── Onboarding.tsx
│   ├── VibeLocal.tsx
│   ├── VibePeople.tsx
│   ├── Chat.tsx
│   ├── Explore.tsx
│   └── Dashboard.tsx
├── services/
│   ├── auth.service.ts
│   ├── location.service.ts
│   ├── matching.service.ts
│   ├── chat.service.ts
│   ├── compatibility.service.ts
│   └── google-places.service.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useLocations.ts
│   ├── useMatches.ts
│   ├── useChat.ts
│   └── useCompatibility.ts
├── integrations/
│   ├── supabase.ts
│   ├── google-places.ts
│   └── database.types.ts
├── lib/
│   ├── utils.ts
│   ├── validations.ts    # Zod schemas
│   └── constants.ts
├── types/
│   ├── user.types.ts
│   ├── location.types.ts
│   ├── match.types.ts
│   └── chat.types.ts
└── test/
    └── setup.ts

tests/
├── unit/
│   ├── services/
│   ├── hooks/
│   └── utils/
├── integration/
│   ├── auth.test.ts
│   ├── matching.test.ts
│   └── chat.test.ts
└── e2e/
    └── user-journey.test.ts
```

**Structure Decision**: Estrutura web single-page application com separação clara entre componentes, serviços, hooks e tipos. Frontend React completo com backend via Supabase (sem código backend separado). Testes organizados por tipo (unit, integration, e2e).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Integração Google Places API | Necessário para dados reais de locais | Usar dados mockados não entrega valor real ao usuário e não escala |
| Sistema de cálculo de compatibilidade | Core feature que diferencia o produto | Matching simples sem ranking não resolve problema de "matches mortos" |
| Realtime para chat | Essencial para experiência de comunicação fluida | Polling aumenta latência e custos, degrada UX |

