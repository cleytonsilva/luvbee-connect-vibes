# Luvbee Connect Vibes Constitution

## Core Principles

### I. Code Quality First
Every feature must follow TypeScript best practices, with proper typing, validation using Zod, and comprehensive error handling. Code must be production-ready from the first commit.

### II. Test-Driven Development (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Maintain test coverage above 80%.

### III. User Experience Consistency
All screens must be responsive, accessible, and follow modern UX patterns. Actions should be completable in maximum 3 clicks. Use Shadcn UI components for consistency.

### IV. Security & Validation
Validate all user inputs using Zod. Never trust unvalidated data. Implement proper authentication and authorization using Supabase. Protect sensitive data and API keys.

### V. Performance & Scalability
Optimize for performance from the start. Use lazy loading for components, implement caching strategies, and minimize bundle size. Code must be maintainable and scalable.

## Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite
- **UI**: TailwindCSS + shadcn/ui components
- **Backend**: Supabase (authentication, database, storage)
- **Payments**: Stripe (when needed)
- **Testing**: Vitest + React Testing Library

## Development Workflow

1. Write tests first (if tests are requested)
2. Implement feature following TDD cycle
3. Validate with Zod schemas
4. Ensure responsive design
5. Test accessibility
6. Update documentation
7. Code review before merge

## Code Standards

- Functions should be small (< 20 lines when possible)
- Each function has a single responsibility
- Use descriptive names (no abbreviations)
- Avoid code duplication
- Refactor when files exceed 200-300 lines
- Always respond in Portuguese (pt-BR)

## Spec-Kit Workflow Compliance (MANDATORY)

### VI. Spec-Driven Development Process

**TODAS as features DEVEM seguir rigorosamente o workflow do Spec-Kit, arquivo por arquivo, na ordem definida:**

1. **spec.md** (Especificação) - OBRIGATÓRIO antes de qualquer código
   - Define O QUE será construído e POR QUÊ
   - Contém user stories priorizadas (P1, P2, P3...)
   - Define requirements funcionais e success criteria
   - NENHUM código pode ser escrito sem spec.md completo e aprovado

2. **plan.md** (Plano de Implementação) - OBRIGATÓRIO após spec.md
   - Define COMO será implementado tecnicamente
   - Define stack tecnológica, estrutura de projeto, constraints
   - Deve passar Constitution Check antes de prosseguir
   - NENHUM código pode ser escrito sem plan.md completo

3. **research.md** (Pesquisa Técnica) - OBRIGATÓRIO se houver dúvidas técnicas
   - Resolve todos os "NEEDS CLARIFICATION" do plan.md
   - Documenta decisões técnicas e alternativas consideradas
   - Deve estar completo antes de Phase 1 (Design)

4. **data-model.md** (Modelo de Dados) - OBRIGATÓRIO para features com dados
   - Define entidades, campos, relacionamentos
   - Define regras de validação e constraints
   - Deve estar completo antes de criar tabelas/migrations

5. **contracts/** (Contratos de API) - OBRIGATÓRIO para features com APIs
   - Define endpoints, schemas, validações
   - Formato OpenAPI ou similar
   - Deve estar completo antes de implementar endpoints

6. **quickstart.md** (Guia Rápido) - OBRIGATÓRIO para validação
   - Documenta como testar a feature manualmente
   - Passos para validar cada user story
   - Deve ser seguido após implementação

7. **tasks.md** (Lista de Tarefas) - OBRIGATÓRIO antes de implementar
   - Quebra o plan.md em tarefas executáveis
   - Organizado por user story e prioridade
   - Define dependências e ordem de execução
   - NENHUM código pode ser escrito sem tasks.md completo

8. **Implementação** - Só após TODOS os arquivos acima completos
   - Seguir tasks.md na ordem definida
   - Implementar uma user story por vez (P1 → P2 → P3)
   - Validar cada user story independentemente antes de prosseguir

### Regras de Compliance

- **NUNCA pular etapas**: Cada arquivo do spec-kit deve ser completado antes do próximo
- **NUNCA escrever código sem spec.md**: Código sem especificação é proibido
- **NUNCA implementar sem tasks.md**: Implementação deve seguir a lista de tarefas
- **SEMPRE validar com quickstart.md**: Após implementação, validar seguindo quickstart.md
- **SEMPRE atualizar documentos**: Se código muda, documentos devem ser atualizados primeiro
- **SEMPRE seguir prioridades**: User stories P1 devem ser completas antes de P2, P2 antes de P3

### Validação de Compliance

Antes de cada commit/PR:
- [ ] spec.md existe e está completo
- [ ] plan.md existe e passou Constitution Check
- [ ] research.md existe (se necessário) e resolve todas as dúvidas
- [ ] data-model.md existe (se aplicável) e está atualizado
- [ ] contracts/ existe (se aplicável) e está completo
- [ ] tasks.md existe e todas as tarefas estão marcadas como concluídas
- [ ] quickstart.md foi seguido e validação passou
- [ ] Código implementado segue exatamente o que está documentado

### Exceções

ÚNICA exceção permitida: correções de bugs críticos em produção podem ser feitas sem seguir o workflow completo, MAS devem ser documentadas retroativamente após a correção.

## Governance

Constitution supersedes all other practices. All PRs/reviews must verify compliance. Complexity must be justified. Spec-Kit workflow compliance is NON-NEGOTIABLE. Use this constitution as the foundational guidance for all development decisions.

**Version**: 1.1.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
