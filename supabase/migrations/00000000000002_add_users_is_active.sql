-- =============================================
-- MIGRAÇÃO: Garantir coluna is_active em public.users
-- =============================================
-- Este script adiciona a coluna is_active na tabela users caso não exista,
-- evitando falhas nas políticas RLS e índices que dependem dela.

BEGIN;

DO $$
BEGIN
    -- Verificar se a tabela users existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        -- Verificar se a coluna is_active não existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'is_active'
        ) THEN
            -- Adicionar a coluna is_active com default TRUE e NOT NULL
            ALTER TABLE public.users 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

            -- Garantir valor TRUE para registros existentes
            UPDATE public.users 
            SET is_active = TRUE 
            WHERE is_active IS NULL;

            RAISE NOTICE '✅ Coluna is_active adicionada à tabela public.users';
        ELSE
            RAISE NOTICE 'ℹ️ Coluna is_active já existe em public.users';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Tabela public.users não existe — será criada pela migração principal';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'ℹ️ Coluna is_active já existe (erro ignorado)';
    WHEN OTHERS THEN
        RAISE WARNING '❌ Erro ao ajustar users.is_active: %', SQLERRM;
END $$;

COMMIT;