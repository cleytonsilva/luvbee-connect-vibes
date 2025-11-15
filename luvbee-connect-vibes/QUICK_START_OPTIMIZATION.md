# 🚀 Guia Rápido: Aplicar Otimizações do Banco de Dados

**Data**: 2025-01-28  
**Tempo estimado**: 15-30 minutos

---

## ⚡ Aplicação Rápida (3 Passos)

### 1️⃣ Backup do Banco de Dados

```bash
# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Ou via Dashboard
# SQL Editor > Export Database > Download
```

### 2️⃣ Aplicar Migrações

```bash
# Opção A: Via Supabase CLI (Recomendado)
cd luvbee-connect-vibes
supabase db push

# Opção B: Via Dashboard Supabase
# 1. Acesse https://app.supabase.com
# 2. Selecione seu projeto
# 3. Vá em SQL Editor
# 4. Execute o arquivo: supabase/migrations/20250128000001_optimize_database_performance.sql
```

### 3️⃣ Verificar Aplicação

```sql
-- Verificar índices criados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verificar funções criadas
SELECT proname 
FROM pg_proc 
WHERE proname IN (
    'get_nearby_users',
    'update_chat_unread_counts',
    'update_chat_unread_on_read'
);

-- Verificar triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%unread%';
```

---

## 📋 Checklist de Aplicação

### Antes de Aplicar

- [ ] Backup completo do banco de dados
- [ ] Ambiente de staging testado (se disponível)
- [ ] Janela de manutenção agendada
- [ ] Equipe notificada

### Durante a Aplicação

- [ ] Executar migração
- [ ] Verificar logs de erro
- [ ] Confirmar criação de índices
- [ ] Confirmar criação de funções
- [ ] Confirmar criação de triggers

### Após Aplicar

- [ ] Executar testes básicos
- [ ] Verificar performance de queries críticas
- [ ] Monitorar logs por 1 hora
- [ ] Validar contadores de mensagens
- [ ] Testar busca de usuários próximos
- [ ] Testar busca de locations

---

## 🧪 Testes Rápidos

### Teste 1: Busca de Usuários Próximos

```sql
-- Deve retornar resultados rapidamente
SELECT * FROM get_nearby_users(-23.5505, -46.6333, 10, 10);
-- ✅ Esperado: < 300ms
```

### Teste 2: Contadores de Mensagens

```sql
-- Criar mensagem de teste
INSERT INTO messages (chat_id, sender_id, content)
VALUES ('chat-id', 'user-id', 'Teste');

-- Verificar contador atualizado
SELECT user1_unread_count, user2_unread_count 
FROM chats 
WHERE id = 'chat-id';
-- ✅ Esperado: Contador atualizado automaticamente
```

### Teste 3: Busca de Locations

```sql
-- Deve usar índice composto
EXPLAIN ANALYZE
SELECT * FROM locations 
WHERE category = 'Bar' 
AND is_active = TRUE;
-- ✅ Esperado: Uso do índice idx_locations_category_active
```

---

## ⚠️ Problemas Comuns e Soluções

### Problema: Erro ao criar índice

**Erro**: `relation "idx_..." already exists`

**Solução**: 
```sql
-- Remover índice existente primeiro
DROP INDEX IF EXISTS idx_nome_do_indice;
-- Depois executar migração novamente
```

### Problema: Função não encontrada

**Erro**: `function get_nearby_users does not exist`

**Solução**: Verificar se a migração foi aplicada completamente. Executar apenas a parte da função:

```sql
-- Copiar apenas a definição da função do arquivo de migração
CREATE OR REPLACE FUNCTION get_nearby_users(...)
```

### Problema: Trigger não funciona

**Erro**: Contadores não atualizam automaticamente

**Solução**: Verificar se trigger foi criado:

```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'update_chat_unread_counts_trigger';
```

Se não existir, criar manualmente:

```sql
CREATE TRIGGER update_chat_unread_counts_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_unread_counts();
```

---

## 📊 Monitoramento Pós-Migração

### Queries de Monitoramento

```sql
-- Verificar uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as vezes_usado
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Verificar queries lentas
SELECT 
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verificar tamanho dos índices
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 🔄 Rollback (Se Necessário)

Se algo der errado, execute:

```sql
-- Remover índices novos
DROP INDEX IF EXISTS idx_users_active_onboarding;
DROP INDEX IF EXISTS idx_users_location_search;
DROP INDEX IF EXISTS idx_locations_active_verified;
DROP INDEX IF EXISTS idx_locations_category_active;
DROP INDEX IF EXISTS idx_messages_chat_sent_at;
DROP INDEX IF EXISTS idx_messages_unread_by_chat;
-- ... (outros índices)

-- Remover funções
DROP FUNCTION IF EXISTS get_nearby_users(DECIMAL, DECIMAL, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_chat_unread_counts();
DROP FUNCTION IF EXISTS update_chat_unread_on_read();

-- Remover triggers
DROP TRIGGER IF EXISTS update_chat_unread_counts_trigger ON messages;
DROP TRIGGER IF EXISTS update_chat_unread_on_read_trigger ON messages;
DROP TRIGGER IF EXISTS update_locations_search_vector_trigger ON locations;

-- Remover constraints (se necessário)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_valid_coordinates;
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_valid_coordinates;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_not_empty;
```

---

## 📞 Suporte

- **Documentação completa**: Ver `DATABASE_OPTIMIZATION_REPORT.md`
- **Plano de testes**: Ver `TEST_PLAN.md`
- **Migração SQL**: `supabase/migrations/20250128000001_optimize_database_performance.sql`

---

**Última atualização**: 2025-01-28

