-- =============================================
-- PRÉ-MIGRAÇÃO: Garantir coluna is_active em check_ins
-- =============================================
-- Execute este script ANTES de executar a migração principal
-- Isso garante que a coluna is_active exista antes de criar índices

-- Método 1: Tentar adicionar diretamente (ignora erro se já existir)
DO $$
BEGIN
    ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Tentativa de adicionar coluna is_active';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela check_ins não existe ainda - será criada pela migração principal';
    WHEN duplicate_column THEN
        RAISE NOTICE 'Coluna is_active já existe';
    WHEN OTHERS THEN
        RAISE WARNING 'Erro: %', SQLERRM;
END $$;

-- Método 2: Verificar e adicionar se necessário (mais seguro)
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins'
    ) THEN
        -- Verificar se a coluna não existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'check_ins' 
            AND column_name = 'is_active'
        ) THEN
            -- Adicionar a coluna
            ALTER TABLE public.check_ins 
            ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            
            -- Atualizar registros existentes
            UPDATE public.check_ins 
            SET is_active = TRUE 
            WHERE is_active IS NULL;
            
            RAISE NOTICE '✅ Coluna is_active adicionada com sucesso';
        ELSE
            RAISE NOTICE '✅ Coluna is_active já existe';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Tabela check_ins não existe ainda - será criada pela migração principal';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '✅ Coluna is_active já existe (erro ignorado)';
    WHEN OTHERS THEN
        RAISE WARNING '❌ Erro ao adicionar coluna: %', SQLERRM;
END $$;

-- Verificar status final
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'check_ins'
        ) THEN
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'check_ins' 
                    AND column_name = 'is_active'
                ) THEN '✅ Coluna is_active existe na tabela check_ins'
                ELSE '❌ Tabela check_ins existe mas coluna is_active NÃO existe'
            END
        ELSE 'ℹ️ Tabela check_ins não existe ainda (será criada pela migração)'
    END as status;

