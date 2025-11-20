# Configuração do GitHub CodeQL Action e Security Workflow

## 📋 Visão Geral

Este documento descreve a configuração completa do workflow de segurança com GitHub CodeQL Action, SARIF uploads e resolução de problemas comuns.

## 🔧 Configurações Implementadas

### 1. Workflow de Segurança (`.github/workflows/security.yml`)

#### Permissões Necessárias
```yaml
permissions:
  contents: read          # Leitura do código
  security-events: write  # Upload de resultados de segurança
  actions: read          # Leitura de actions
  checks: write          # Criação de checks
  pull-requests: write   # Comentários em PRs
```

#### Jobs Configurados

1. **Semgrep Analysis**
   - Executa análise com regras de segurança
   - Gera arquivo SARIF com resultados
   - Processa fingerprints para tracking
   - Upload para GitHub Security

2. **CodeQL Analysis**
   - Análise estática com CodeQL
   - Configuração personalizada via `codeql-config.yml`
   - Foco em segurança e qualidade de código

3. **Security Audit**
   - npm audit para vulnerabilidades
   - Conversão para formato SARIF
   - Análise ESLint de segurança

### 2. Configuração CodeQL (`.github/codeql/codeql-config.yml`)

```yaml
name: "CodeQL Config"

disable-default-queries: false

queries:
  - uses: security-and-quality
  - uses: security-extended
  - uses: javascript-security-and-quality

paths:
  - src
  - api
  - supabase/functions

paths-ignore:
  - node_modules
  - dist
  - '**/*.test.ts'
  - '**/__tests__/**'
```

### 3. Processamento SARIF (scripts/generate