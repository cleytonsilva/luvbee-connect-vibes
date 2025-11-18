# 🔧 Solução Manual para Adicionar Coluna is_active

## Diagnóstico

Se o script retornou "❌ Coluna is_active NÃO existe", pode ser que:

1. **A tabela `check_ins` não existe ainda** - Nesse caso, a migração principal vai criá-la com a coluna
2. **Houve um erro silencioso** ao adicionar a coluna

## Solução Manual (Execute no SQL Editor)

### Passo 1: Verificar se a tabela existe

```sql
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'check_ins'
        ) THEN 'Tabela EXISTE'
        ELSE 'Tabela NÃO EXISTE'
    END as status;
```

### Passo 2A: Se a tabela EXISTE, adicione a coluna manualmente

```sql
-- Execute este comando diretamente:
ALTER TABLE public.check_ins 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Se o IF NOT EXISTS não funcionar, use:
ALTER TABLE public.check_ins 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
```

### Passo 2B: Se a tabela NÃO EXISTE

Não precisa fazer nada! A migração principal vai criar a tabela com a coluna `is_active` incluída.

### Passo 3: Verificar se funcionou

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'check_ins'
ORDER BY ordinal_position;
```

Você deve ver `is_active` na lista de colunas.

## Solução Alternativa: Modificar a Migração Principal

Se preferir, podemos modificar a migração principal para incluir `is_active` diretamente na definição da tabela. Isso evitaria o problema completamente.

## Próximos Passos

1. Execute o Passo 1 acima para verificar se a tabela existe
2. Se existir, execute o Passo 2A
3. Depois execute a migração principal normalmente

