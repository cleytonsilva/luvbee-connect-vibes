# Plano de Testes - Otimizações do Banco de Dados

**Data**: 2025-01-28  
**Versão**: 1.0

---

## 📋 Objetivo

Validar todas as otimizações implementadas no banco de dados através de testes unitários, de integração e de performance.

---

## 1. Testes Unitários

### 1.1 Validação de Constraints

#### Teste: Validação de Coordenadas Geográficas

```sql
-- Teste 1: Coordenadas válidas devem ser aceitas
INSERT INTO users (email, name, location_latitude, location_longitude)
VALUES ('test1@example.com', 'Test User', -23.5505, -46.6333);
-- ✅ Esperado: Sucesso

-- Teste 2: Coordenadas inválidas devem ser rejeitadas
INSERT INTO users (email, name, location_latitude, location_longitude)
VALUES ('test2@example.com', 'Test User', 91.0, 181.0);
-- ❌ Esperado: Erro de constraint violation

-- Teste 3: Coordenadas NULL devem ser aceitas
INSERT INTO users (email, name, location_latitude, location_longitude)
VALUES ('test3@example.com', 'Test User', NULL, NULL);
-- ✅ Esperado: Sucesso
```

#### Teste: Validação de Mensagens

```sql
-- Teste 1: Mensagem vazia deve ser rejeitada
INSERT INTO messages (chat_id, sender_id, content)
VALUES ('chat-id', 'user-id', '   ');
-- ❌ Esperado: Erro de constraint violation

-- Teste 2: Mensagem válida deve ser aceita
INSERT INTO messages (chat_id, sender_id, content)
VALUES ('chat-id', 'user-id', 'Mensagem válida');
-- ✅ Esperado: Sucesso
```

---

### 1.2 Testes de Funções

#### Teste: `get_nearby_users()`

```sql
-- Setup: Criar usuários de teste
INSERT INTO users (id, email, name, location_latitude, location_longitude, is_active, onboarding_completed)
VALUES 
    ('user1', 'user1@test.com', 'User 1', -23.5505, -46.6333, TRUE, TRUE),
    ('user2', 'user2@test.com', 'User 2', -23.5510, -46.6340, TRUE, TRUE),
    ('user3', 'user3@test.com', 'User 3', -23.6000, -46.7000, TRUE, TRUE);

-- Teste: Buscar usuários próximos (raio 5km)
SELECT * FROM get_nearby_users(-23.5505, -46.6333, 5, 10);
-- ✅ Esperado: Retornar user1 e user2 (dentro de 5km)
-- ❌ Não deve retornar user3 (muito distante)

-- Teste: Verificar distância calculada
SELECT distance_km FROM get_nearby_users(-23.5505, -46.6333, 10, 10)
WHERE id = 'user2';
-- ✅ Esperado: Distância aproximada de 0.7km
```

#### Teste: Triggers de Contadores

```sql
-- Setup: Criar chat de teste
INSERT INTO chats (id, user1_id, user2_id)
VALUES ('chat1', 'user1', 'user2');

-- Teste 1: Criar mensagem deve atualizar contador
INSERT INTO messages (chat_id, sender_id, content)
VALUES ('chat1', 'user1', 'Mensagem de teste');

SELECT user2_unread_count FROM chats WHERE id = 'chat1';
-- ✅ Esperado: user2_unread_count = 1

-- Teste 2: Marcar mensagem como lida deve decrementar contador
UPDATE messages SET read_at = NOW() WHERE chat_id = 'chat1' AND sender_id = 'user1';

SELECT user2_unread_count FROM chats WHERE id = 'chat1';
-- ✅ Esperado: user2_unread_count = 0
```

---

## 2. Testes de Integração

### 2.1 Fluxo Completo: Matching de Usuários

```sql
-- 1. Criar dois usuários próximos
INSERT INTO users (id, email, name, location_latitude, location_longitude, is_active, onboarding_completed)
VALUES 
    ('match-user1', 'match1@test.com', 'Match User 1', -23.5505, -46.6333, TRUE, TRUE),
    ('match-user2', 'match2@test.com', 'Match User 2', -23.5510, -46.6340, TRUE, TRUE);

-- 2. Buscar usuários próximos
SELECT * FROM get_nearby_users(-23.5505, -46.6333, 10, 10);
-- ✅ Esperado: Retornar match-user2

-- 3. Criar match
INSERT INTO people_matches (user1_id, user2_id, user1_liked_at, status)
VALUES ('match-user1', 'match-user2', NOW(), 'pending');

-- 4. Verificar que chat foi criado automaticamente quando match vira mutual
UPDATE people_matches SET status = 'mutual' WHERE user1_id = 'match-user1';

SELECT * FROM chats WHERE user1_id = 'match-user1' AND user2_id = 'match-user2';
-- ✅ Esperado: Chat criado automaticamente
```

### 2.2 Fluxo Completo: Busca de Locations

```sql
-- 1. Criar locations de teste
INSERT INTO locations (id, name, category, address, latitude, longitude, is_active)
VALUES 
    ('loc1', 'Bar Teste', 'Bar', 'Rua Teste 1', -23.5505, -46.6333, TRUE),
    ('loc2', 'Restaurante Teste', 'Restaurante', 'Rua Teste 2', -23.5510, -46.6340, TRUE);

-- 2. Buscar locations próximas usando função RPC
SELECT * FROM get_nearby_locations(-23.5505, -46.6333, 5000);
-- ✅ Esperado: Retornar loc1 e loc2 com distâncias calculadas

-- 3. Buscar por categoria
SELECT * FROM locations WHERE category = 'Bar' AND is_active = TRUE;
-- ✅ Esperado: Usar índice idx_locations_category_active
```

### 2.3 Fluxo Completo: Mensagens

```sql
-- 1. Criar chat
INSERT INTO chats (id, user1_id, user2_id)
VALUES ('msg-chat1', 'user1', 'user2');

-- 2. Enviar mensagem
INSERT INTO messages (chat_id, sender_id, content)
VALUES ('msg-chat1', 'user1', 'Olá!');

-- 3. Verificar contador atualizado
SELECT user2_unread_count FROM chats WHERE id = 'msg-chat1';
-- ✅ Esperado: user2_unread_count = 1

-- 4. Buscar mensagens do chat
SELECT * FROM messages 
WHERE chat_id = 'msg-chat1' 
ORDER BY sent_at DESC;
-- ✅ Esperado: Usar índice idx_messages_chat_sent_at

-- 5. Marcar como lida
UPDATE messages SET read_at = NOW() WHERE chat_id = 'msg-chat1';

-- 6. Verificar contador decrementado
SELECT user2_unread_count FROM chats WHERE id = 'msg-chat1';
-- ✅ Esperado: user2_unread_count = 0
```

---

## 3. Testes de Performance

### 3.1 Benchmark de Queries

#### Query 1: Busca de Usuários Próximos

```sql
-- Antes da otimização (estimado)
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE location_latitude BETWEEN -23.6 AND -23.5
AND location_longitude BETWEEN -46.7 AND -46.6
AND is_active = TRUE
AND onboarding_completed = TRUE;

-- Após otimização
EXPLAIN ANALYZE
SELECT * FROM get_nearby_users(-23.5505, -46.6333, 10, 50);

-- ✅ Esperado: Redução de 70-80% no tempo de execução
```

#### Query 2: Busca de Locations por Categoria

```sql
-- Antes da otimização
EXPLAIN ANALYZE
SELECT * FROM locations 
WHERE category = 'Bar' 
AND is_active = TRUE;

-- Após otimização (com índice composto)
EXPLAIN ANALYZE
SELECT * FROM locations 
WHERE category = 'Bar' 
AND is_active = TRUE;

-- ✅ Esperado: Uso do índice idx_locations_category_active
-- ✅ Esperado: Redução de 60% no tempo de execução
```

#### Query 3: Listagem de Mensagens

```sql
-- Antes da otimização
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE chat_id = 'chat-id'
ORDER BY sent_at DESC
LIMIT 50;

-- Após otimização (com índice)
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE chat_id = 'chat-id'
ORDER BY sent_at DESC
LIMIT 50;

-- ✅ Esperado: Uso do índice idx_messages_chat_sent_at
-- ✅ Esperado: Redução de 50% no tempo de execução
```

---

### 3.2 Testes de Carga

#### Teste: 1000 Usuários Simultâneos

```sql
-- Criar 1000 usuários de teste
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..1000 LOOP
        INSERT INTO users (email, name, location_latitude, location_longitude, is_active, onboarding_completed)
        VALUES (
            'user' || i || '@test.com',
            'User ' || i,
            -23.5505 + (RANDOM() * 0.1),
            -46.6333 + (RANDOM() * 0.1),
            TRUE,
            TRUE
        );
    END LOOP;
END $$;

-- Teste de busca
SELECT COUNT(*) FROM get_nearby_users(-23.5505, -46.6333, 10, 100);
-- ✅ Esperado: Executar em < 500ms
```

---

## 4. Testes de Segurança (RLS)

### 4.1 Teste: Acesso a Users

```sql
-- Como usuário autenticado
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user1';

-- Deve poder ver seu próprio perfil
SELECT * FROM users WHERE id = 'user1';
-- ✅ Esperado: Sucesso

-- Deve poder ver outros usuários ativos
SELECT * FROM users WHERE id = 'user2' AND is_active = TRUE;
-- ✅ Esperado: Sucesso

-- Não deve ver usuários inativos
SELECT * FROM users WHERE is_active = FALSE;
-- ✅ Esperado: Nenhum resultado
```

### 4.2 Teste: Acesso a Messages

```sql
-- Como user1
SET request.jwt.claim.sub = 'user1';

-- Deve ver mensagens do seu chat
SELECT * FROM messages WHERE chat_id = 'chat1';
-- ✅ Esperado: Sucesso (se user1 participa do chat)

-- Não deve ver mensagens de outros chats
SELECT * FROM messages WHERE chat_id = 'chat2';
-- ✅ Esperado: Nenhum resultado

-- Não deve ver mensagens deletadas
SELECT * FROM messages WHERE is_deleted = TRUE;
-- ✅ Esperado: Nenhum resultado (filtrado por RLS)
```

---

## 5. Checklist de Validação

### 5.1 Pré-Migração

- [ ] Backup completo do banco de dados
- [ ] Ambiente de staging configurado
- [ ] Documentação revisada
- [ ] Plano de rollback preparado

### 5.2 Pós-Migração

- [ ] Todos os índices criados com sucesso
- [ ] Todas as funções criadas com sucesso
- [ ] Todos os triggers funcionando
- [ ] Constraints validados
- [ ] RLS policies testadas
- [ ] Performance melhorada conforme esperado

### 5.3 Validação de Dados

- [ ] Coordenadas geográficas validadas
- [ ] Mensagens não podem ser vazias
- [ ] Arrays de preferências válidos
- [ ] Contadores de mensagens corretos

---

## 6. Scripts de Teste Automatizados

### 6.1 Script de Teste Completo

```bash
#!/bin/bash
# test_database_optimizations.sh

echo "🧪 Iniciando testes de otimização do banco de dados..."

# Teste 1: Validação de constraints
echo "Teste 1: Validação de constraints..."
psql $DATABASE_URL -f tests/constraints_test.sql

# Teste 2: Funções
echo "Teste 2: Testando funções..."
psql $DATABASE_URL -f tests/functions_test.sql

# Teste 3: Performance
echo "Teste 3: Benchmark de performance..."
psql $DATABASE_URL -f tests/performance_test.sql

# Teste 4: RLS
echo "Teste 4: Testando RLS policies..."
psql $DATABASE_URL -f tests/rls_test.sql

echo "✅ Todos os testes concluídos!"
```

---

## 7. Métricas de Sucesso

### 7.1 Performance

- ✅ Query de usuários próximos: < 300ms (antes: ~800ms)
- ✅ Busca de locations: < 250ms (antes: ~600ms)
- ✅ Listagem de mensagens: < 200ms (antes: ~300ms)
- ✅ Contadores de não lidas: instantâneo (antes: ~400ms)

### 7.2 Segurança

- ✅ RLS policies funcionando corretamente
- ✅ Apenas dados autorizados acessíveis
- ✅ Validações de dados ativas

### 7.3 Integridade

- ✅ Constraints validando dados
- ✅ Triggers atualizando contadores
- ✅ Funções retornando resultados corretos

---

## 8. Problemas Conhecidos e Soluções

### 8.1 Problema: Índices muito grandes

**Solução**: Monitorar tamanho dos índices e considerar particionamento

### 8.2 Problema: Triggers lentos em alta carga

**Solução**: Otimizar triggers ou mover lógica para background jobs

### 8.3 Problema: Busca full-text não funciona

**Solução**: Verificar se extensão `pg_trgm` está instalada

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 9. Próximos Passos

1. Executar testes em ambiente de staging
2. Aplicar migração em produção
3. Monitorar performance por 1 semana
4. Ajustar índices conforme necessário
5. Documentar lições aprendidas

---

**Última atualização**: 2025-01-28  
**Versão**: 1.0

