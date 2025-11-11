# Integrações e Configurações - Luvbee Connect Vibes

## 📋 Visão Geral
Este documento contém todas as integrações externas e configurações do sistema Luvbee Connect Vibes, seguindo as diretrizes do sistema Esquads.

## 🔗 Integrações Principais

### 1. Supabase
**Descrição**: Backend-as-a-Service principal para banco de dados, autenticação e storage
**Status**: ✅ Em implementação
**Versão**: 2.38.5

#### Configurações
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_SERVICE_KEY=[service-key]
```

#### Endpoints
- **Auth**: `/auth/v1/*`
- **Database**: `/rest/v1/*`
- **Storage**: `/storage/v1/*`
- **Realtime**: `/realtime/v1/*`

#### Permissões RLS
- `anon`: Leitura de dados públicos
- `authenticated`: CRUD completo nos próprios dados
- `service_role`: Acesso administrativo

### 2. Supabase Storage
**Descrição**: Armazenamento de arquivos (avatars, imagens de locais)
**Status**: ✅ Configurado
**Buckets**:
- `avatars`: Imagens de perfil (5MB máx, JPEG/PNG)
- `locations`: Imagens de estabelecimentos (10MB máx, JPEG/PNG/WebP)
- `public`: Assets públicos

### 3. Supabase Realtime
**Descrição**: Notificações em tempo real para chat e matches
**Status**: ✅ Configurado
**Canais**:
- `messages:[user_id]`: Novas mensagens
- `matches:[user_id]`: Novos matches
- `locations:[location_id]`: Atualizações de locais

#### Publicação Realtime (Status Atual)
- `supabase_realtime` habilitado
- Tabelas incluídas:
  - `public.messages` ✅
  - `public.people_matches` ✅
  - `public.location_matches` ✅
  - `public.chats` ✅

#### Tabelas (Status Atual)
- `users` ✅ (inclui `is_active`)
- `locations` ✅
- `location_matches` ✅
- `people_matches` ✅
- `chats` ✅
- `messages` ✅
- `check_ins` ➖ (aguarda migração principal)

#### Atualizações Recentes (Compatibilidade App)
- `users.age`: agora aceitando `NULL` no banco. A aplicação mantém fallback de `18` na criação de perfil (AuthService) para consistência com validação de idade mínima.
- `users.location` (JSONB): agora `NULLABLE`. Tipos atualizados:
  - Supabase types: `Json | null`
  - App types (`UserProfile.location`): `Record<string, any> | null`
  - Inserção padrão no AuthService: `location: null` durante criação do perfil
  - Objetivo: evitar erros `23502` em criação de usuários quando localização não é fornecida.

## 🔧 Configurações do Sistema

### Variáveis de Ambiente
```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_KEY=

# Aplicação
VITE_APP_NAME=Luvbee Connect Vibes
VITE_APP_URL=https://luvbee-connect-vibes.vercel.app
VITE_API_URL=https://api.luvbee-connect-vibes.com

# Segurança
VITE_JWT_SECRET=[jwt-secret]
VITE_ENCRYPTION_KEY=[encryption-key]

# Analytics (opcional)
VITE_GA_MEASUREMENT_ID=
VITE_SENTRY_DSN=
```

### Configurações de Segurança

#### Rate Limiting
- **Login**: 5 tentativas por IP/15min
- **Registro**: 3 tentativas por IP/hora
- **API Geral**: 100 requisições por IP/min

#### CORS
```typescript
// Origens permitidas
const allowedOrigins = [
  'https://luvbee-connect-vibes.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
]
```

#### Headers de Segurança
```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

## 📊 Métricas e Monitoramento

### Logs de Auditoria
**Local**: Tabela `audit_logs` no Supabase
**Retenção**: 90 dias
**Eventos registrados**:
- Login/Logout
- Criação/Atualização/Exclusão de dados
- Mudanças de permissões
- Acessos a dados sensíveis

### Métricas de Performance
**Local**: Tabela `metrics` no Supabase
**Métricas coletadas**:
- Tempo de resposta de APIs
- Taxa de sucesso de autenticação
- Quantidade de usuários ativos
- Performance de queries

### Alertas
**Configuração**: Via Supabase Dashboard
**Canais**: Email, Slack
**Triggers**:
- Taxa de erro > 5%
- Tempo de resposta > 2s
- Tentativas de login falhadas > 10/min
- Uso de CPU/DB > 80%

## 🔐 Segurança

### Certificados SSL
- **Fornecedor**: Let's Encrypt
- **Validade**: 90 dias (renovação automática)
- **Configuração**: TLS 1.3

### Backup
**Frequência**: Diário às 02:00 AM UTC
**Retenção**: 30 dias
**Local**: Armazenamento em nuvem (AWS S3)
**Teste**: Restauração mensal

### Conformidade
- **LGPD**: Implementado (consentimento, portabilidade, exclusão)
- **GDPR**: Parcialmente implementado
- **Política de Privacidade**: Disponível em `/privacy`
- **Termos de Serviço**: Disponível em `/terms`

## 🚀 Deployment

### Ambientes
1. **Desenvolvimento**: Branch `develop`
   - URL: `https://dev.luvbee-connect-vibes.vercel.app`
   - Database: `luvbee-dev`
   
2. **Staging**: Branch `staging`
   - URL: `https://staging.luvbee-connect-vibes.vercel.app`
   - Database: `luvbee-staging`
   
3. **Produção**: Branch `main`
   - URL: `https://luvbee-connect-vibes.vercel.app`
   - Database: `luvbee-prod`

### CI/CD
**Plataforma**: GitHub Actions
**Pipeline**:
1. Testes unitários
2. Testes de integração
3. Análise de segurança (SAST)
4. Build
5. Deploy

### Rollback
**Procedimento**:
1. Reverter commit no Git
2. Executar rollback de migrações
3. Restaurar backup se necessário
4. Notificar equipe

## 📞 Contatos

### Responsáveis
- **Desenvolvimento**: [Nome] <email@luvbee.com>
- **Infraestrutura**: [Nome] <infra@luvbee.com>
- **Segurança**: [Nome] <security@luvbee.com>
- **Suporte**: support@luvbee.com

### Fornecedores
- **Supabase**: support@supabase.io
- **Vercel**: support@vercel.com
- **Cloudflare**: support@cloudflare.com

## 📋 Checklist de Manutenção

### Diário
- [ ] Verificar logs de erro
- [ ] Monitorar métricas de performance
- [ ] Validar backups
- [ ] Verificar certificados SSL

### Semanal
- [ ] Atualizar dependências de segurança
- [ ] Revisar logs de auditoria
- [ ] Testar procedimentos de backup/restore
- [ ] Verificar uso de recursos

### Mensal
- [ ] Pen test (teste de penetração)
- [ ] Revisão de permissões
- [ ] Atualização de documentação
- [ ] Treinamento da equipe

### Anual
- [ ] Auditoria de segurança completa
- [ ] Revisão de conformidade legal
- [ ] Atualização de políticas
- [ ] Planejamento de capacidade

## 📝 Notas

### Última Atualização
Data: 2025-11-09
Responsável: Assistente
Versão: 1.1.0

### Histórico de Mudanças
```markdown
## [1.1.0] - 2025-11-09
### Modificado
- Atualizado status de publicação Realtime e tabelas criadas

## [1.0.0] - 2024-01-15
### Adicionado
- Documentação inicial de integrações
- Configurações de segurança
- Procedimentos de deployment
```

### Próximos Passos
1. Implementar monitoramento APM
2. Adicionar CDN global
3. Configurar multi-region failover
4. Implementar chatbot de suporte

---
**⚠️ Importante**: Este documento contém informações sensíveis. Mantenha em local seguro e atualize sempre que houver mudanças no sistema.
