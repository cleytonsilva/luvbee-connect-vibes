-- Migration: Add CHECK constraints for backend validation
-- Date: 2025-01-28
-- Description: Adiciona constraints de validação no PostgreSQL para prevenir bypass do frontend

-- =============================================
-- 1. CONSTRAINTS PARA TABELA USERS
-- =============================================

-- Constraint de formato de email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_format'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_email_format 
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Constraint de tamanho de nome
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_name_length'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_name_length 
            CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 100);
    END IF;
END $$;

-- Constraint de idade mínima (18 anos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_age_minimum'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_age_minimum 
            CHECK (age IS NULL OR age >= 18);
    END IF;
END $$;

-- Constraint de idade máxima (razoável)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_age_maximum'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_age_maximum 
            CHECK (age IS NULL OR age <= 120);
    END IF;
END $$;

-- =============================================
-- 2. FUNÇÃO DE VALIDAÇÃO PARA USER_PREFERENCES
-- =============================================

CREATE OR REPLACE FUNCTION validate_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que drink_preferences não está vazio (se não for NULL)
    IF NEW.drink_preferences IS NOT NULL AND array_length(NEW.drink_preferences, 1) IS NULL THEN
        RAISE EXCEPTION 'drink_preferences não pode estar vazio';
    END IF;
    
    -- Validar tamanho máximo de drink_preferences
    IF NEW.drink_preferences IS NOT NULL AND array_length(NEW.drink_preferences, 1) > 10 THEN
        RAISE EXCEPTION 'Máximo de 10 preferências de bebida permitidas';
    END IF;
    
    -- Validar que food_preferences não está vazio (se não for NULL)
    IF NEW.food_preferences IS NOT NULL AND array_length(NEW.food_preferences, 1) IS NULL THEN
        RAISE EXCEPTION 'food_preferences não pode estar vazio';
    END IF;
    
    -- Validar tamanho máximo de food_preferences
    IF NEW.food_preferences IS NOT NULL AND array_length(NEW.food_preferences, 1) > 10 THEN
        RAISE EXCEPTION 'Máximo de 10 preferências de comida permitidas';
    END IF;
    
    -- Validar que music_preferences não está vazio (se não for NULL)
    IF NEW.music_preferences IS NOT NULL AND array_length(NEW.music_preferences, 1) IS NULL THEN
        RAISE EXCEPTION 'music_preferences não pode estar vazio';
    END IF;
    
    -- Validar tamanho máximo de music_preferences
    IF NEW.music_preferences IS NOT NULL AND array_length(NEW.music_preferences, 1) > 10 THEN
        RAISE EXCEPTION 'Máximo de 10 preferências musicais permitidas';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS validate_user_preferences_trigger ON public.user_preferences;

CREATE TRIGGER validate_user_preferences_trigger
    BEFORE INSERT OR UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_preferences();

-- =============================================
-- 3. CONSTRAINTS PARA TABELA MESSAGES
-- =============================================

-- Constraint de tamanho de conteúdo de mensagem (já existe no schema, mas garantindo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_content_length'
    ) THEN
        ALTER TABLE public.messages
            ADD CONSTRAINT messages_content_length 
            CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000);
    END IF;
END $$;

-- =============================================
-- 4. CONSTRAINTS PARA TABELA USERS (BIO)
-- =============================================

-- Constraint de tamanho de bio (se a coluna existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'bio'
    ) THEN
        -- Remover constraint antiga se existir
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_bio_length;
        
        -- Adicionar nova constraint
        ALTER TABLE public.users
            ADD CONSTRAINT users_bio_length 
            CHECK (bio IS NULL OR LENGTH(bio) <= 500);
    END IF;
END $$;

