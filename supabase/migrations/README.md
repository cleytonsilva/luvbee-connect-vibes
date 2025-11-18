# Supabase Migrations

Este diretório contém as migrations do Supabase para o projeto LuvBee.

## Estrutura

- `20250127000000_create_core_tables.sql` - Migration inicial criando todas as tabelas core, índices, RLS policies, triggers e funções

## Como Aplicar Migrations

### Usando Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Aplicar migrations
supabase db push

# Ou aplicar migration específica
supabase migration up
```

### Usando Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Copie e cole o conteúdo do arquivo de migration
4. Execute o script

## Ordem de Aplicação

As migrations devem ser aplicadas na ordem cronológica (nome do arquivo):

1. `20250127000000_create_core_tables.sql` - Cria estrutura base completa

## Verificação

Após aplicar as migrations, verifique:

```sql
-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'user_preferences', 'locations', 'location_matches',
  'people_matches', 'chats', 'messages', 'check_ins',
  'location_categories', 'favorites', 'reviews', 'audit_logs'
)
ORDER BY table_name;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = TRUE;

-- Verificar índices
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Rollback

Para fazer rollback de uma migration:

```bash
# Usando Supabase CLI
supabase migration down
```

Ou manualmente no SQL Editor do Supabase Dashboard executando comandos DROP apropriados.

## Notas Importantes

- ⚠️ **Backup**: Sempre faça backup do banco antes de aplicar migrations em produção
- ⚠️ **Teste**: Teste migrations em ambiente de desenvolvimento/staging primeiro
- ⚠️ **RLS**: Todas as tabelas têm RLS habilitado - certifique-se de que as policies estão corretas
- ⚠️ **Compatibilidade**: Esta migration cria a estrutura nova mantendo compatibilidade com estrutura existente (campos legados)

## Próximas Migrations

Futuras migrations devem seguir o padrão:
- `YYYYMMDDHHMMSS_description.sql`
- Numeradas sequencialmente
- Documentadas neste README

