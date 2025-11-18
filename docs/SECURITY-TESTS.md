# Segurança - Testes e Monitoramento

## Frameworks de Teste Existentes

| Tipo | Ferramenta | Local/Configuração |
| --- | --- | --- |
| Testes unitários/integrados | [Vitest](https://vitest.dev) + Testing Library | `vitest.config.ts`, scripts `npm test`, `npm run test:security` |
| Linting | ESLint + plugin interno `luvbee-security` | `eslint.config.js`, `eslint-security-plugin.js`, script `npm run lint:security` |
| Testes end-to-end Supabase | Scripts em `src/__tests__/` e `scripts/*.ts` | `npm run test:supabase` |
| Static Analysis | Semgrep customizado | `.semgrep.yml` |

## Novos Casos de Segurança

1. **SQL Injection / XSS** – `src/__tests__/security.validation.test.ts`
   - Validações centralizadas bloqueiam padrões maliciosos antes de chegar ao banco.
2. **CSRF** – `src/lib/csrf.ts` + testes em `src/__tests__/security.validation.test.ts` e `src/services/__tests__/message.service.security.test.ts`
   - Token é exigido ao enviar mensagens e validado em tempo constante.
3. **Fluxo de mensagens** – `src/services/__tests__/message.service.security.test.ts`
   - Garante que mensagens com payload malicioso sejam rejeitadas/sanitizadas e que a ausência de token impede a operação.

Execute localmente com:

```bash
npm run lint:security  # Lint direcionado aos módulos críticos
npm run test:security  # Casos focados em SQLi, XSS e CSRF
```

## Pipelines

O workflow `.github/workflows/security.yml` bloqueia merges em `main` quando qualquer etapa falha:

1. `npm ci`
2. `npm run lint:security`
3. `npm run test:security`
4. `returntocorp/semgrep-action` executando `semgrep scan --config ./.semgrep.yml --sarif --output semgrep.sarif`, seguido do upload com `github/codeql-action@v4`

Falhas críticas em qualquer etapa marcam o PR como vermelho.

## Acesso e Resultados

- Os relatórios do Semgrep aparecem na aba **Security** do GitHub por meio do artefato `semgrep.sarif`.
- Logs dos testes ficam disponíveis no histórico do workflow e podem ser replicados com os comandos acima.
- Novas regras podem ser adicionadas editando `.semgrep.yml` ou `eslint-security-plugin.js`.
