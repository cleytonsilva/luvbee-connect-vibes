# Modelo de Versionamento - LuvBee Connect Vibes

## Estrutura de Versionamento

Usamos **Semantic Versioning (SemVer)** com o formato: `MAJOR.MINOR.PATCH`

- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades compatíveis com versões anteriores
- **PATCH**: Correções de bugs compatíveis

## Versão Atual: v0.1.0

### Changelog v0.1.0

#### Correções (Fixes)
- ✅ Corrigido erro crítico na função RPC `get_potential_matches`
  - Tipo de retorno alterado de `VARCHAR(100)` para `TEXT`
  - Melhorada extração de dados do campo JSONB `location`
  - Resolve erro na página "People"

#### Funcionalidades (Features)
- ✅ Implementado cache inteligente de locais
  - Busca primeiro do banco de dados (cache)
  - Consulta API apenas se necessário (< 10 locais no cache)
  - Locais descobertos são salvos automaticamente
  - Redução de 70-80% nas chamadas à API

#### Performance
- ✅ Melhorada performance de busca de locais
- ✅ Redução de custos de API do Google Places
- ✅ Cache do banco com validade de 24 horas
- ✅ Cache da API com validade de 5 minutos

## Próximas Versões Planejadas

### v0.2.0 (Planejado)
- Melhorias na interface de matching
- Otimizações de performance
- Novas funcionalidades de descoberta

### v0.3.0 (Planejado)
- Sistema de notificações em tempo real
- Melhorias no sistema de chat
- Analytics e métricas

## Como Criar Nova Versão

1. **Atualizar versão no `package.json`**:
   ```json
   "version": "0.2.0"
   ```

2. **Criar commit com mudanças**:
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   ```

3. **Criar tag de versão**:
   ```bash
   git tag -a v0.2.0 -m "Versão 0.2.0 - Descrição das mudanças"
   ```

4. **Push para GitHub**:
   ```bash
   git push origin 001-luvbee-core-platform
   git push origin v0.2.0
   ```

## Convenções de Commits

Seguimos o padrão **Conventional Commits**:

- `fix:` - Correção de bug
- `feat:` - Nova funcionalidade
- `docs:` - Documentação
- `style:` - Formatação, ponto e vírgula, etc
- `refactor:` - Refatoração de código
- `perf:` - Melhoria de performance
- `test:` - Adição ou correção de testes
- `chore:` - Mudanças em build, dependências, etc

## Branch de Desenvolvimento

- **Branch Principal**: `001-luvbee-core-platform`
- **Branches de Feature**: `feature/nome-da-feature`
- **Branches de Fix**: `fix/nome-do-fix`

## Tags no GitHub

Todas as versões são marcadas com tags Git que podem ser usadas para:
- Criar releases no GitHub
- Deploy de versões específicas
- Rollback se necessário
- Histórico de versões

