<!-- f9f8bb68-9b3c-417e-8bd9-9dbe1b6d36bd a5ef1696-7e10-478b-9110-b88792d0389d -->
# Plano de Implementação - PRD v1.3 e Gaps

## Objetivo

Alinhar a plataforma LuvBee com o PRD v1.3, implementando todas as funcionalidades faltantes identificadas no PLANO_IMPLEMENTACAO_GAPS.md, aumentando o alinhamento de 65% para 95%+.

## Estrutura de Implementação

### Sprint 1: Fundação Crítica (Prioridade CRÍTICA)

#### RF-01.1: Preferências de Identidade e Descoberta

**Arquivos a modificar:**

- `supabase/migrations/`: Criar migration para adicionar campos `identity` e `who_to_see` em `user_preferences`
- `src/lib/validations.ts`: Adicionar schemas Zod para `identity` e `who_to_see`
- `src/types/app.types.ts`: Atualizar interface `UserPreferences`
- `src/components/auth/OnboardingFlow.tsx`: Adicionar step de "Preferências de Descoberta" antes dos gostos
- `src/services/user.service.ts`: Atualizar para salvar novos campos

**Ações:**

1. Criar migration SQL adicionando colunas `identity VARCHAR(50)` e `who_to_see TEXT[]` em `user_preferences`
2. Adicionar validações Zod: `identitySchema` e `whoToSeeSchema` em `validations.ts`
3. Atualizar `OnboardingFlow.tsx` para incluir novo step com RadioGroup para identidade e CheckboxGroup para "quem quer ver"
4. Atualizar `UserService.saveUserPreferences` para aceitar novos campos

#### RF-04.1: Filtrar People por Preferências de Descoberta

**Arquivos a modificar:**

- `supabase/migrations/`: Refatorar RPC `get_potential_matches` para filtrar por identidade/preferências
- `src/services/match.service.ts`: Verificar se precisa atualizar tipos

**Ações:**

1. Refatorar função SQL `get_potential_matches` para incluir filtros bidirecionais:

- Verificar se usuário atual quer ver o target (baseado em `who_to_see`)
- Verificar se target quer ver usuário atual (baseado em `who_to_see` do target)

2. Criar migration SQL com nova versão da função

#### RF-03.1: Redefinir Locations como "Meus Favoritos"

**Arquivos a modificar:**

- `src/pages/LocationsPage.tsx`: Remover `LocationFilter`, alterar fonte de dados
- `src/components/location/LocationFilter.tsx`: Comentar/remover uso
- `src/services/location.service.ts`: Criar método `getLocationsByIds` se não existir

**Ações:**

1. Remover import e uso de `LocationFilter` em `LocationsPage.tsx`
2. Alterar lógica para buscar apenas locais com match: usar `LocationService.getUserLocationMatches(userId)`
3. Criar método `getLocationsByIds` em `LocationService` se necessário
4. Atualizar UI: título "Meus Locais Favoritos", remover filtros laterais
5. Adicionar mensagem quando não há matches

### Sprint 2: Notificações e Melhorias Core

#### RF-07.1: Sistema de Notificações

**Arquivos a criar/modificar:**

- `supabase/migrations/`: Criar tabela `notifications` e triggers
- `src/hooks/useNotifications.ts`: Criar hook para gerenciar notificações
- `src/components/notifications/NotificationBell.tsx`: Criar componente de sino
- `src/services/notification.service.ts`: Criar serviço para notificações

**Ações:**

1. Criar migration SQL com tabela `notifications` (id, user_id, type, title, body, data JSONB, read, created_at)
2. Criar trigger `notify_match_mutual` que dispara quando `people_matches.status` muda para 'mutual'
3. Criar trigger para novas mensagens (quando `messages` é inserido)
4. Criar hook `useNotifications` com subscription Realtime
5. Criar componente `NotificationBell` com badge de contador e dropdown
6. Integrar `NotificationBell` no `Dashboard` ou header

#### RF-01.2: Filtrar Locais por Preferências de Gostos

**Arquivos a modificar:**

- `supabase/migrations/`: Refatorar RPC `get_places_nearby` para aceitar arrays de preferências
- `src/hooks/useVibePlaces.ts`: Buscar preferências do usuário e passar para RPC

**Ações:**

1. Refatorar `get_places_nearby` para aceitar parâmetros opcionais: `drink_preferences TEXT[]`, `food_preferences TEXT[]`, `music_preferences TEXT[]`
2. Adicionar lógica SQL para filtrar locais que correspondem às preferências (usar operadores de array `&&`)
3. Atualizar `useVibePlaces.ts` para buscar preferências do usuário via `UserService.getUserPreferences`
4. Passar preferências para RPC quando disponíveis

#### RF-02.1: Toggle Modo Solo Visível na UI

**Arquivos a modificar:**

- `src/pages/VibeLocalPage.tsx`: Adicionar toggle Switch visível no header

**Ações:**

1. Adicionar componente Switch no header de `VibeLocalPage.tsx`
2. Conectar ao `useVibeModeStore` (já existe)
3. Adicionar `useEffect` para re-executar busca quando `soloMode` mudar

### Sprint 3: Finalizações e Melhorias UX

#### RF-03.2: Aba "Pessoas" no LocationDetail

**Arquivos a modificar:**

- `src/pages/LocationDetailPage.tsx`: Adicionar Tabs com aba "Pessoas"
- `src/components/matching/PeopleForLocation.tsx`: Criar componente (similar a PeoplePage mas filtrado por local)

**Ações:**

1. Adicionar componente `Tabs` do shadcn em `LocationDetailPage.tsx`
2. Criar componente `PeopleForLocation` que usa `get_potential_matches` com filtro adicional de `location_id`
3. Passar `locationId` como prop e filtrar resultados

#### RF-04.2: Bio Visível no PersonCard

**Arquivos a modificar:**

- `src/components/matching/PersonCard.tsx`: Verificar e adicionar exibição de bio

**Ações:**

1. Verificar se `PersonCard.tsx` já exibe bio
2. Se não, adicionar `<p>` com bio (truncada com `line-clamp-2`)

#### RF-05.1: Design Neo-Brutalista no Chat

**Arquivos a modificar:**

- `src/components/messages/MessageList.tsx`: Aplicar classes Neo-Brutalistas
- `src/components/messages/MessageInput.tsx`: Verificar estilos

**Ações:**

1. Atualizar balões de mensagem: `rounded-none`, `border-2 border-foreground`, `shadow-hard`
2. Aplicar cores: `bg-primary` para próprias mensagens, `bg-background` para outras
3. Adicionar `font-mono` no texto das mensagens

#### RF-06.1: Editar Preferências de Descoberta no Profile

**Arquivos a modificar:**

- `src/components/profile/ProfileForm.tsx`: Adicionar seção de preferências de descoberta

**Ações:**

1. Adicionar Card com seção "Preferências de Descoberta"
2. RadioGroup para "Como você se identifica?"
3. CheckboxGroup para "Quem você quer ver?"
4. Conectar ao `UserService.saveUserPreferences`

### Sprint 4: Polish e Decisões

#### RF-03.3: Recomendação Social (Prioridade BAIXA)

**Arquivos a criar/modificar:**

- `supabase/migrations/`: Criar RPC `get_locations_with_mutual_likes`
- `src/pages/LocationsPage.tsx`: Destacar locais com badge especial

**Ações:**

1. Criar função SQL que identifica locais onde alguém que gostou de você também deu match
2. Adicionar badge visual nos cards de locais correspondentes

#### Decisão sobre Página Explore

**Ações:**

1. Verificar se `/dashboard/explore` ainda está em uso
2. Se sim, decidir: remover ou manter como feature adicional
3. Se remover: deletar arquivos e rotas relacionadas

## Ordem de Execução e Dependências

**Dependências críticas:**

- RF-01.1 deve ser feito PRIMEIRO (pré-requisito para RF-04.1, RF-01.2, RF-06.1)
- RF-04.1 depende de RF-01.1
- RF-03.2 depende de RF-04.1 (filtro de pessoas já funcional)

**Ordem sugerida:**

1. RF-01.1 (Migration + UI Onboarding)
2. RF-04.1 (Filtro People)
3. RF-03.1 (Locations como Favoritos)
4. RF-07.1 (Notificações - pode ser paralelo)
5. RF-01.2 (Filtro Locais por Preferências)
6. RF-02.1 (Toggle Modo Solo)
7. RF-03.2 (Aba Pessoas)
8. RF-04.2 (Bio no Card)
9. RF-05.1 (Design Chat)
10. RF-06.1 (Editar Preferências Profile)
11. RF-03.3 (Recomendação Social)
12. Decisão Explore

## Métricas de Sucesso

- Alinhamento com PRD: 65% → 95%+
- Onboarding: 70% → 100%
- Vibe Local: 85% → 100%
- Locations: 40% → 100%
- People: 80% → 100%
- Messages: 95% → 100%
- Profile: 75% → 100%
- Notificações: 0% → 100%

### To-dos

- [ ] RF-01.1: Adicionar campos identity e who_to_see no banco, validações Zod, e step no onboarding
- [ ] RF-04.1: Refatorar get_potential_matches para filtrar por preferências de descoberta bidirecionais
- [ ] RF-03.1: Redefinir LocationsPage para mostrar apenas locais com match (remover LocationFilter)
- [ ] RF-07.1: Criar sistema completo de notificações (tabela, triggers, hook, componente NotificationBell)
- [ ] RF-01.2: Refatorar get_places_nearby e useVibePlaces para filtrar locais por preferências de gostos
- [ ] RF-02.1: Adicionar toggle Switch visível para Modo Solo em VibeLocalPage
- [ ] RF-03.2: Adicionar aba 'Pessoas' no LocationDetail com componente PeopleForLocation
- [ ] RF-04.2: Verificar e adicionar exibição de bio no PersonCard
- [ ] RF-05.1: Aplicar design Neo-Brutalista no chat (balões com cantos vivos, font-mono)
- [ ] RF-06.1: Adicionar seção de edição de preferências de descoberta no ProfileForm
- [ ] RF-03.3: Implementar recomendação social destacando locais com mutual likes
- [ ] Decidir e executar ação sobre página Explore (remover ou manter)