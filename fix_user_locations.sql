-- Adicionar coluna google_place_id na tabela user_locations
-- E criar constraint única para evitar duplicatas

-- 1. Adicionar a coluna se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        AND column_name = 'google_place_id'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN google_place_id TEXT;
        
        RAISE NOTICE 'Coluna google_place_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna google_place_id já existe';
    END IF;
END $$;

-- 2. Adicionar coluna place_data (JSON) se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        AND column_name = 'place_data'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN place_data JSONB;
        
        RAISE NOTICE 'Coluna place_data adicionada';
    ELSE
        RAISE NOTICE 'Coluna place_data já existe';
    END IF;
END $$;

-- 3. Criar índice na coluna google_place_id
CREATE INDEX IF NOT EXISTS idx_user_locations_google_place_id 
ON public.user_locations(google_place_id);

-- 4. Criar índice composto para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_locations_user_google 
ON public.user_locations(user_id, google_place_id);

-- 5. Adicionar constraint única (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_locations_user_google_unique'
    ) THEN
        -- Primeiro, remover duplicatas se existirem
        DELETE FROM public.user_locations a
        USING public.user_locations b
        WHERE a.ctid < b.ctid
        AND a.user_id = b.user_id
        AND COALESCE(a.google_place_id, '') = COALESCE(b.google_place_id, '');
        
        -- Depois adicionar a constraint
        ALTER TABLE public.user_locations 
        ADD CONSTRAINT user_locations_user_google_unique 
        UNIQUE (user_id, google_place_id);
        
        RAISE NOTICE 'Constraint única adicionada';
    ELSE
        RAISE NOTICE 'Constraint única já existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar constraint: %', SQLERRM;
END $$;

-- 6. Garantir que RLS está habilitado
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- 7. Atualizar políticas RLS
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

SELECT 'Migração concluída com sucesso!' as status;
