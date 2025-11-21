# Changelog

## [1.2.0] - 2025-11-20

### Corrigido
- **Upload de Avatar (RLS)**: Corrigido erro `new row violates row-level security policy` ao enviar fotos no onboarding. Implementado fallback de bucket (`avatars` → `profile-photos`) com caminho sob `user_id/arquivo` para conformidade com políticas.

### Modificado
- **OnboardingFlow**: Validação de tipos de imagem (`jpeg|jpg|png|webp`), verificação de sessão antes do upload, barra de progresso no rodapé com links de termos e privacidade, logs informativos com `safeLog`.
- **UserService.uploadAvatar**: Ajustado para salvar em pasta do usuário, com fallback de bucket e retorno de URL pública do bucket utilizado.

### Adicionado
- **Logs**: Mensagens de erro e contexto em falhas de upload para facilitar depuração futura, respeitando sanitização.

**Responsável**: Sistema Esquads
**Revisor**: AI Assistant
**Data de Deploy**: 2025-11-20 12:00

## [1.1.0] - 2025-01-18

### Adicionado
- **Segurança Aprimorada**: Implementado workflow de segurança GitHub Actions com análise automatizada
- **CSRF Protection**: Adicionada proteção contra CSRF com token validation
- **Testes de Segurança**: Criados testes unitários para validação de segurança
- **ESLint Security Plugin**: Configurado plugin de segurança para análise estática de código
- **Semgrep Config**: Adicionada configuração Semgrep para análise de vulnerabilidades

### Modificado
- **VibeLocalPage**: Melhorias na geolocalização e tratamento de permissões
- **Serviço de Mensagens**: Refatorado com validações de segurança aprimoradas
- **Serviço de Validação**: Implementado validação de entrada com DOMPurify
- **Hooks de Chat**: Otimizados para melhor performance e segurança

### Corrigido
- **Loop de Geolocalização**: Resolvido problema de loop quando permissão é negada
- **Validações de Entrada**: Corrigidas vulnerabilidades de XSS
- **Tratamento de Erros**: Melhorado tratamento de erros em serviços críticos

### Segurança
- **XSS Protection**: Implementada sanitização completa com DOMPurify
- **Input Validation**: Adicionadas validações em todos os pontos de entrada
- **CSRF Tokens**: Implementada proteção CSRF em formulários
- **Content Security Policy**: Headers de segurança configurados

**Responsável**: Sistema Esquads
**Revisor**: AI Assistant
**Data de Deploy**: 2025-01-18 16:50