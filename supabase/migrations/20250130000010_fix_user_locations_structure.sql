-- Migration: Fix user_locations table structure
-- Date: 2025-01-30
-- Description: Corrige a estrutura da tabela user_locations para suportar google_place_id
-- e estabelece a relação correta com a tabela locations

-- =============================================
-- 1. CRIAR TABELA user_locations SE NÃO EXISTIR
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    google_place_id TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('liked', 'passed', 'saved')),
    place_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraint única para evitar duplicatas
    CONSTRAINT user_locations_user_google_unique UNIQUE (user_id, google_place_id)
);

-- =============================================
-- 2. AJUSTAR CONSTRAINTS EXISTENTES
-- =============================================

-- Remover constraint NOT NULL do location_id se existir
DO $$
BEGIN
    -- Verificar se existe constraint NOT NULL na coluna location_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_locations' 
        AND column_name = 'location_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Alterar coluna para permitir NULL
        ALTER TABLE public.user_locations 
        ALTER COLUMN location_id DROP NOT NULL;
        
        RAISE NOTICE 'Constraint NOT NULL removida de location_id';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao ajustar location_id: %', SQLERRM;
END $$;

-- =============================================
-- 3. ADICIONAR COLUNAS SE NÃO EXISTIREM
-- =============================================

-- Adicionar coluna google_place_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_locations' 
        AND column_name = 'google_place_id'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN google_place_id TEXT;
        
        RAISE NOTICE 'Coluna google_place_id adicionada';
    END IF;
END $$;

-- Adicionar coluna place_data se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_locations' 
        AND column_name = 'place_data'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN place_data JSONB;
        
        RAISE NOTICE 'Coluna place_data adicionada';
    END IF;
END $$;

-- =============================================
-- 4. CRIAR ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id 
ON public.user_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_location_id 
ON public.user_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_google_place_id 
ON public.user_locations(google_place_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_status 
ON public.user_locations(status);

CREATE INDEX IF NOT EXISTS idx_user_locations_created_at 
ON public.user_locations(created_at DESC);

-- =============================================
-- 5. HABILITAR RLS
-- =============================================

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CRIAR POLÍTICAS RLS
-- =============================================

DROP POLICY IF EXISTS "user_locations_select_own" ON public.user_locations;
DROP POLICY IF EXISTS "user_locations_insert_own" ON public.user_locations;
DROP POLICY IF EXISTS "user_locations_update_own" ON public.user_locations;
DROP POLICY IF EXISTS "user_locations_delete_own" ON public.user_locations;

CREATE POLICY "user_locations_select_own" 
ON public.user_locations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "user_locations_insert_own" 
ON public.user_locations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_locations_update_own" 
ON public.user_locations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "user_locations_delete_own" 
ON public.user_locations FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- =============================================
-- 7. TRIGGER PARA ATUALIZAR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_user_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_locations_updated_at_trigger ON public.user_locations;

CREATE TRIGGER update_user_locations_updated_at_trigger
    BEFORE UPDATE ON public.user_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_locations_updated_at();

-- =============================================
-- 8. FUNÇÃO PARA SINCRONIZAR location_id
-- =============================================

-- Esta função busca ou cria o location correspondente ao google_place_id
CREATE OR REPLACE FUNCTION sync_user_location_id()
RETURNS TRIGGER AS $$
DECLARE
    v_location_id UUID;
BEGIN
    -- Se já tem location_id, não fazer nada
    IF NEW.location_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Se tem google_place_id, tentar encontrar location correspondente
    IF NEW.google_place_id IS NOT NULL THEN
        SELECT id INTO v_location_id
        FROM public.locations
        WHERE google_place_id = NEW.google_place_id
        LIMIT 1;
        
        -- Se encontrou, atualizar o location_id
        IF v_location_id IS NOT NULL THEN
            NEW.location_id = v_location_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_user_location_id_trigger ON public.user_locations;

CREATE TRIGGER sync_user_location_id_trigger
    BEFORE INSERT OR UPDATE ON public.user_locations
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_location_id();

-- =============================================
-- 9. PERMISSÕES
-- =============================================

GRANT ALL ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
GRANT SELECT ON public.user_locations TO anon;

-- =============================================
-- 10. VERIFICAÇÃO
-- =============================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_locations'
ORDER BY ordinal_position;
