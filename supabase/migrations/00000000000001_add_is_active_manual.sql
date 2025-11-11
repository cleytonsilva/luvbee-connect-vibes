-- =============================================
-- SOLUÇÃO ALTERNATIVA: Adicionar coluna is_active diretamente
-- =============================================
-- Se o script de preparação não funcionou, execute este comando diretamente:

-- Verificar se a tabela existe primeiro
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'check_ins'
        ) THEN 'Tabela check_ins EXISTE'
        ELSE 'Tabela check_ins NÃO EXISTE'
    END as tabela_status;

-- Se a tabela existir, execute este comando:
-- ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- OU se o IF NOT EXISTS não funcionar no seu PostgreSQL, use:
-- ALTER TABLE public.check_ins ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Depois verifique:
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'check_ins'
ORDER BY ordinal_position;

