# Plano de Migração: Estrutura Existente → Spec-Kit

**Data**: 2025-01-27 | **Status**: Planejamento

## Visão Geral

Este documento detalha o plano de migração da estrutura de banco de dados existente (documentada em `.trae/documents/migracao-supabase.sql`) para a nova estrutura definida no spec-kit (`data-model.md`).

## Objetivos da Migração

1. **Manter compatibilidade**: Não quebrar funcionalidades existentes
2. **Melhorar estrutura**: Implementar melhorias do spec-kit (user_preferences separado, location_matches, people_matches melhorado, chats)
3. **Integração Google Places**: Adicionar suporte completo para Google Places API
4. **Two-Layer Match**: Implementar o conceito central do LuvBee (match com locais primeiro, depois com pessoas)

## Mapeamento de Tabelas

### Tabelas Mantidas (com expansões)

| Tabela Existente | Mudanças | Status |
|------------------|----------|--------|
| `users` | Adicionar: `age`, `location_latitude`, `location_longitude`, `search_radius_km`, `onboarding_completed`<br>Manter: `preferences` JSONB (legado, será migrado)<br>Migrar: `preferences` → `user_preferences` | ⏳ Planejado |
| `locations` | Adicionar: `google_place_id`, `type`, `latitude`, `longitude`, `price_level`, `google_places_data`, `is_curated`, `last_synced_at`<br>Manter: `category` (legado), `location` POINT (legado)<br>Migrar: `category` → `type`, `location` POINT → `latitude`/`longitude` | ⏳ Planejado |
| `check_ins` | Nenhuma mudança | ✅ Mantido |
| `location_categories` | Nenhuma mudança | ✅ Mantido |
| `favorites` | Nenhuma mudança | ✅ Mantido |
| `reviews` | Nenhuma mudança | ✅ Mantido |
| `audit_logs` | Nenhuma mudança | ✅ Mantido |

### Tabelas Novas

| Nova Tabela | Origem | Status |
|-------------|--------|--------|
| `user_preferences` | Extraído de `users.preferences` JSONB | ⏳ Criar |
| `location_matches` | Nova - Core Loop 1 (match com locais) | ⏳ Criar |
| `people_matches` | Substitui `matches` com melhorias | ⏳ Criar |
| `chats` | Nova - estrutura de conversas | ⏳ Criar |

### Tabelas Migradas

| Tabela Antiga | Tabela Nova | Mudanças |
|---------------|-------------|----------|
| `matches` | `people_matches` | Adicionar: `compatibility_score`, `common_locations_count`, `user1_liked_at`, `user2_liked_at`<br>Melhorar: estrutura para suportar Two-Layer Match |
| `messages` | `messages` (expandida) | Adicionar: `chat_id`<br>Manter: `sender_id`, `receiver_id` (compatibilidade durante migração) |

## Fases de Migração

### Fase 1: Preparação (Sem Downtime)

**Duração estimada**: 2-4 horas

1. ✅ Backup completo do banco de dados
2. ✅ Criar branch de migração no Git
3. ✅ Documentar estrutura atual completa
4. ✅ Validar integridade referencial
5. ✅ Criar scripts de rollback

**Checklist**:
- [ ] Backup criado e validado
- [ ] Scripts de rollback testados
- [ ] Documentação atualizada

---

### Fase 2: Criar Novas Tabelas (Sem Downtime)

**Duração estimada**: 1-2 horas

1. Criar `user_preferences` (vazia inicialmente)
2. Criar `location_matches` (vazia inicialmente)
3. Criar `people_matches` (vazia inicialmente)
4. Criar `chats` (vazia inicialmente)
5. Criar índices e constraints
6. Configurar RLS policies

**SQL**:
```sql
-- Ver migracao-fase2.sql
```

**Checklist**:
- [ ] Tabelas criadas sem erros
- [ ] Índices criados
- [ ] RLS policies configuradas
- [ ] Validação de integridade passou

---

### Fase 3: Migrar Preferências (Downtime Mínimo)

**Duração estimada**: 30-60 minutos

1. Migrar dados de `users.preferences` JSONB → `user_preferences`
2. Validar migração
3. Manter `users.preferences` como legado (será removido na Fase 6)

**SQL**:
```sql
-- Migrar preferências
INSERT INTO user_preferences (user_id, drink_preferences, food_preferences, music_preferences, vibe_preferences)
SELECT 
  id,
  COALESCE(preferences->>'drinks', '[]')::TEXT[],
  COALESCE(preferences->>'food', '[]')::TEXT[],
  COALESCE(preferences->>'music', '[]')::TEXT[],
  preferences->'vibe'
FROM users
WHERE preferences IS NOT NULL AND preferences != '{}'::JSONB;
```

**Checklist**:
- [ ] Todos os usuários com preferências migrados
- [ ] Validação de dados passou
- [ ] Rollback testado

---

### Fase 4: Migrar Matches (Downtime Mínimo)

**Duração estimada**: 1-2 horas

1. Migrar dados de `matches` → `people_matches`
2. Calcular `compatibility_score` para matches existentes
3. Calcular `common_locations_count` para matches existentes
4. Normalizar `user1_id` < `user2_id`
5. Manter `matches` como legado (será removido na Fase 6)

**SQL**:
```sql
-- Migrar matches
INSERT INTO people_matches (user1_id, user2_id, user1_liked_at, user2_liked_at, matched_at, status, compatibility_score, common_locations_count)
SELECT 
  LEAST(user_id, matched_user_id) as user1_id,
  GREATEST(user_id, matched_user_id) as user2_id,
  CASE WHEN user_id < matched_user_id THEN created_at ELSE NULL END as user1_liked_at,
  CASE WHEN user_id > matched_user_id THEN created_at ELSE NULL END as user2_liked_at,
  CASE WHEN status = 'accepted' THEN updated_at ELSE NULL END as matched_at,
  CASE 
    WHEN status = 'accepted' THEN 'mutual'
    WHEN status = 'rejected' THEN 'unmatched'
    ELSE 'pending'
  END as status,
  NULL as compatibility_score, -- Será calculado depois
  0 as common_locations_count -- Será calculado depois
FROM matches
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- Calcular compatibility_score e common_locations_count
-- (usar função calculate_compatibility_score)
```

**Checklist**:
- [ ] Todos os matches migrados
- [ ] Compatibility scores calculados
- [ ] Common locations count calculado
- [ ] Validação de dados passou

---

### Fase 5: Criar Chats e Migrar Messages (Downtime Mínimo)

**Duração estimada**: 1-2 horas

1. Criar `chats` para todos os matches mútuos existentes
2. Adicionar coluna `chat_id` em `messages` (NULLABLE inicialmente)
3. Migrar `messages` para usar `chat_id`
4. Manter `sender_id` e `receiver_id` para compatibilidade

**SQL**:
```sql
-- Criar chats para matches mútuos
INSERT INTO chats (user1_id, user2_id, people_match_id, created_at)
SELECT 
  user1_id,
  user2_id,
  id,
  matched_at
FROM people_matches
WHERE status = 'mutual' AND matched_at IS NOT NULL;

-- Adicionar chat_id em messages
ALTER TABLE messages ADD COLUMN chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Migrar messages para usar chat_id
UPDATE messages m
SET chat_id = c.id
FROM chats c
WHERE (c.user1_id = m.sender_id AND c.user2_id = m.receiver_id)
   OR (c.user1_id = m.receiver_id AND c.user2_id = m.sender_id);
```

**Checklist**:
- [ ] Chats criados para matches mútuos
- [ ] Messages migradas para usar chat_id
- [ ] Validação de integridade passou

---

### Fase 6: Expandir Tabelas Existentes (Sem Downtime)

**Duração estimada**: 2-3 horas

1. Adicionar novos campos em `users`
2. Adicionar novos campos em `locations`
3. Criar índices para novos campos
4. Migrar dados de campos legados para novos campos

**SQL**:
```sql
-- Expandir users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 120),
  ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS search_radius_km INTEGER DEFAULT 10 CHECK (search_radius_km >= 1 AND search_radius_km <= 100),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Expandir locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  ADD COLUMN IF NOT EXISTS google_places_data JSONB,
  ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Migrar location POINT para latitude/longitude
UPDATE locations
SET latitude = ST_Y(location::geometry),
    longitude = ST_X(location::geometry)
WHERE location IS NOT NULL AND latitude IS NULL;

-- Migrar category para type
UPDATE locations
SET type = category
WHERE type IS NULL AND category IS NOT NULL;
```

**Checklist**:
- [ ] Novos campos adicionados
- [ ] Dados migrados de campos legados
- [ ] Índices criados
- [ ] Validação passou

---

### Fase 7: Validação e Testes (Sem Downtime)

**Duração estimada**: 2-4 horas

1. Testes de integridade referencial
2. Testes de RLS policies
3. Testes de performance
4. Validação de dados migrados
5. Testes de rollback

**Checklist**:
- [ ] Todos os testes passando
- [ ] Performance dentro dos limites esperados
- [ ] RLS policies funcionando corretamente
- [ ] Rollback testado e funcionando

---

### Fase 8: Deprecar Campos Legados (Opcional, Futuro)

**Duração estimada**: TBD

**NOTA**: Esta fase será executada apenas após validação completa em produção (mínimo 1 mês).

1. Remover `users.preferences` JSONB (após migração completa)
2. Remover `matches` (após migração completa)
3. Remover `locations.category` (após migração completa)
4. Remover `locations.location` POINT (após migração completa)
5. Tornar `messages.sender_id` e `receiver_id` NULLABLE (após migração completa)

**Checklist**:
- [ ] Validação em produção por 1+ mês
- [ ] Nenhum código usando campos legados
- [ ] Backup completo antes de remover campos

---

## Rollback Plan

Em caso de problemas críticos durante qualquer fase:

1. **Imediato**: Reverter código da aplicação para versão anterior
2. **Dados**: Restaurar backup do banco de dados
3. **Validação**: Verificar integridade após rollback
4. **Análise**: Documentar causa do problema
5. **Correção**: Corrigir problemas antes de tentar novamente

## Monitoramento

Durante e após a migração, monitorar:

- **Performance**: Tempo de resposta de queries
- **Erros**: Logs de erro do Supabase
- **Integridade**: Validações automáticas de integridade referencial
- **Uso**: Métricas de uso das novas tabelas vs. legadas

## Cronograma Estimado

| Fase | Duração | Downtime | Risco |
|------|---------|----------|-------|
| Fase 1 | 2-4h | Nenhum | Baixo |
| Fase 2 | 1-2h | Nenhum | Baixo |
| Fase 3 | 30-60min | Mínimo | Médio |
| Fase 4 | 1-2h | Mínimo | Médio |
| Fase 5 | 1-2h | Mínimo | Médio |
| Fase 6 | 2-3h | Nenhum | Baixo |
| Fase 7 | 2-4h | Nenhum | Baixo |
| **Total** | **10-18h** | **Mínimo** | **Médio** |

## Próximos Passos

1. ✅ Revisar e aprovar este plano
2. ⏳ Criar scripts SQL detalhados para cada fase
3. ⏳ Criar scripts de validação
4. ⏳ Criar scripts de rollback
5. ⏳ Agendar janela de migração
6. ⏳ Executar migração fase por fase

---

**Última atualização**: 2025-01-27
**Responsável**: Equipe de Desenvolvimento LuvBee

