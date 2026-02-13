-- CORRIGIR: Criar constraint única para ON CONFLICT funcionar

-- 1. Primeiro, verificar se a coluna google_place_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        AND column_name = 'google_place_id'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN google_place_id TEXT;
    END IF;
END $$;

-- 2. Verificar se a coluna place_data existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        AND column_name = 'place_data'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN place_data JSONB;
    END IF;
END $$;

-- 3. Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.user_locations 
        ADD COLUMN status TEXT DEFAULT 'liked';
    END IF;
END $$;

-- 4. Remover constraint única existente (se houver) para recriar
ALTER TABLE public.user_locations 
DROP CONSTRAINT IF EXISTS user_locations_user_google_unique;

ALTER TABLE public.user_locations 
DROP CONSTRAINT IF EXISTS user_locations_user_id_google_place_id_key;

-- 5. Remover duplicatas antes de criar a constraint
-- Manter apenas o registro mais recente para cada combinação user_id + google_place_id
DELETE FROM public.user_locations a
WHERE a.ctid NOT IN (
    SELECT MAX(b.ctid)
    FROM public.user_locations b
    WHERE b.user_id = a.user_id
    AND (
        (b.google_place_id IS NOT NULL AND b.google_place_id = a.google_place_id) OR
        (b.google_place_id IS NULL AND a.google_place_id IS NULL AND b.id = a.id)
    )
    GROUP BY b.user_id, b.google_place_id
);

-- 6. Criar constraint única nas colunas corretas
ALTER TABLE public.user_locations 
ADD CONSTRAINT user_locations_user_google_unique 
UNIQUE (user_id, google_place_id);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_locations_google_place_id 
ON public.user_locations(google_place_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_status 
ON public.user_locations(user_id, status);

-- 8. Garantir RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- 9. Recriar políticas
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

-- 10. Verificar o resultado
SELECT 
    'Constraint criada com sucesso!' as status,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = 'user_locations' 
     AND constraint_type = 'UNIQUE') as unique_constraints_count;
