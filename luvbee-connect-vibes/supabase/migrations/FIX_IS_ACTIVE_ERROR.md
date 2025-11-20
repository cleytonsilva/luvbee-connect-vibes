# 🔧 Solução para Erro: column "is_active" does not exist

## Problema

O erro ocorre porque a tabela `check_ins` pode já existir no banco sem a coluna `is_active`, e quando o script tenta criar índices que dependem dessa coluna, ela ainda não existe.

## Solução em 2 Passos

### Passo 1: Execute o Script de Pré-Migração

**IMPORTANTE:** Execute este script ANTES do script principal:

1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
2. Copie e execute o conteúdo de: `supabase/migrations/00000000000000_prepare_check_ins.sql`
3. Verifique se aparece: `✅ Coluna is_active existe`

### Passo 2: Execute a Migração Principal

Depois que o Passo 1 for concluído com sucesso:

1. No mesmo SQL Editor, execute o script principal: `supabase/migrations/20250127000000_create_core_tables.sql`

## Alternativa: Executar Tudo de Uma Vez

Se preferir executar tudo em uma única transação, copie e cole na seguinte ordem:

1. Primeiro: Conteúdo de `00000000000000_prepare_check_ins.sql`
2. Depois: Conteúdo de `20250127000000_create_core_tables.sql`

## Verificação

Após executar ambos os scripts, verifique:

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'check_ins'
AND column_name = 'is_active';

-- Verificar se os índices foram criados
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'check_ins'
AND indexname LIKE '%active%';
```

## Por Que Isso Acontece?

- A tabela `check_ins` pode ter sido criada anteriormente sem a coluna `is_active`
- O `CREATE TABLE IF NOT EXISTS` não modifica tabelas existentes
- Os índices tentam usar a coluna antes que ela seja adicionada

## Solução Permanente

O script principal já inclui código para adicionar a coluna, mas executar o pré-script garante que ela exista antes de qualquer operação que a referencie.

