# Plano de Retomada - LuvBee Core Platform

**Data**: 2025-01-27  
**Status**: Em Progresso

## 🎯 Objetivo

Retomar o desenvolvimento do LuvBee Connect Vibes seguindo rigorosamente o Spec-Kit, completando as funcionalidades faltantes e alinhando o código existente com as especificações.

## 📋 Situação Atual

### ✅ O Que Já Está Funcionando

1. **Infraestrutura Base**: Configuração completa (TypeScript, Vite, Tailwind, Shadcn)
2. **Autenticação**: Login, registro e onboarding funcionando
3. **Vibe Local**: Sistema de swipe com locais funcionando
4. **Estrutura de Código**: Componentes e serviços organizados

### ⚠️ O Que Precisa Ser Ajustado/Alinhado

1. **User Story 3 (Vibe People)**:
   - ❌ Não filtra por locais em comum (requisito core do produto)
   - ❌ Não calcula compatibilidade baseada em preferências
   - ❌ Não ordena por score de compatibilidade
   - ❌ Usa tabela `matches` ao invés de `people_matches`
   - ❌ Não detecta match mútuo automaticamente

2. **User Story 4 (Chat)**:
   - ⚠️ Chat existe mas não está integrado com match mútuo
   - ❌ Não cria chat automaticamente quando há match mútuo
   - ❌ Falta componentes específicos (ChatListItem, MessageList, MessageInput)

3. **Banco de Dados**:
   - ⚠️ Precisa verificar se todas as tabelas estão criadas conforme `data-model.md`
   - ⚠️ Precisa verificar RLS policies
   - ⚠️ Precisa criar triggers e functions SQL

## 🚀 Plano de Ação

### Fase 1: Alinhamento com Spec-Kit (Prioridade ALTA)

#### 1.1 Verificar e Criar Migrations
- [ ] Verificar estado atual do banco de dados
- [ ] Criar migrations faltantes conforme `data-model.md`
- [ ] Criar tabela `people_matches` (substituindo `matches`)
- [ ] Criar tabela `user_preferences` (separando de `users.preferences` JSONB)
- [ ] Criar tabela `location_matches` (se não existir)
- [ ] Criar tabela `chats` (se não existir)
- [ ] Configurar RLS policies conforme especificação
- [ ] Criar triggers e functions SQL

#### 1.2 Criar Funções SQL Necessárias
- [ ] `calculate_compatibility_score(user1_id, user2_id)` - Calcula score baseado em preferências e locais em comum
- [ ] `get_potential_matches(user_id)` - Retorna pessoas com locais em comum, ordenadas por compatibilidade
- [ ] Trigger para detectar match mútuo e criar chat automaticamente
- [ ] Trigger para atualizar `matched_at` quando status muda para 'mutual'

### Fase 2: Implementar Funcionalidades Faltantes (Prioridade ALTA)

#### 2.1 User Story 3 - Vibe People (Core Feature)
- [ ] Criar `compatibility.service.ts` - Serviço para cálculo de compatibilidade
- [ ] Criar `useCompatibility.ts` - Hook para calcular e cachear scores
- [ ] Criar `useMatches.ts` - Hook para gerenciar matches com pessoas
- [ ] Criar `CompatibilityBadge.tsx` - Componente para exibir score
- [ ] Criar `PersonSwipe.tsx` - Componente com gestos de swipe
- [ ] Atualizar `PeoplePage.tsx` para:
  - Filtrar apenas pessoas com locais em comum
  - Ordenar por compatibilidade
  - Exibir preferências e locais em comum
  - Bloquear acesso se não tem matches com locais
- [ ] Atualizar `match.service.ts` para usar `people_matches` ao invés de `matches`

#### 2.2 User Story 4 - Chat
- [ ] Criar `useChat.ts` - Hook para gerenciar estado do chat
- [ ] Criar `ChatListItem.tsx` - Componente para lista de conversas
- [ ] Criar `MessageList.tsx` - Componente para exibir mensagens
- [ ] Criar `MessageInput.tsx` - Componente para enviar mensagens
- [ ] Atualizar `ChatWindow.tsx` para usar novos componentes
- [ ] Configurar Realtime subscription para mensagens
- [ ] Implementar atualização de `read_at`
- [ ] Implementar contadores de não lidas
- [ ] Exibir locais em comum no chat

### Fase 3: Validação e Testes (Prioridade MÉDIA)

- [ ] Executar `quickstart.md` para validar todas as User Stories
- [ ] Corrigir bugs encontrados
- [ ] Validar RLS policies
- [ ] Validar validações Zod
- [ ] Validar performance (SC-002, SC-010)

### Fase 4: Polish (Prioridade BAIXA)

- [ ] Aplicar design neo-brutalista consistentemente
- [ ] Garantir responsividade completa
- [ ] Adicionar acessibilidade
- [ ] Implementar lazy loading
- [ ] Otimizar bundle size
- [ ] Implementar error boundaries
- [ ] Adicionar loading states consistentes
- [ ] Implementar toast notifications
- [ ] Validar máximo 3 cliques

## 📝 Próximos Passos Imediatos

1. **Verificar estado do banco de dados** - Ver quais tabelas existem e quais precisam ser criadas
2. **Criar migrations faltantes** - Baseado em `data-model.md`
3. **Criar função SQL `calculate_compatibility_score`** - Core feature para matching
4. **Atualizar `match.service.ts`** - Para usar `people_matches` e filtrar por locais em comum
5. **Criar `compatibility.service.ts`** - Serviço para cálculo de compatibilidade
6. **Atualizar `PeoplePage.tsx`** - Para usar novo sistema de matching

## 🔍 Notas Importantes

- O código atual está funcional mas não segue completamente a especificação do Spec-Kit
- A funcionalidade core (Match em Duas Camadas) não está implementada corretamente
- É crítico implementar o filtro por locais em comum antes de continuar com outras features
- Todas as mudanças devem seguir rigorosamente `data-model.md` e `spec.md`

## 📚 Documentos de Referência

- `spec.md` - Especificação completa da feature
- `plan.md` - Plano técnico de implementação
- `data-model.md` - Modelo de dados completo
- `tasks.md` - Lista de tarefas detalhada
- `quickstart.md` - Guia de validação manual
- `contracts/` - Contratos de API e validação

