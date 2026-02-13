-- SQL para criar tabela de cache de imagens
-- Execute este arquivo no SQL Editor do Supabase Dashboard

-- ===========================================
-- TABELA: cached_images
-- ===========================================

CREATE TABLE IF NOT EXISTS public.cached_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    place_id TEXT NOT NULL,
    photo_reference TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Garante que não haja duplicatas do mesmo lugar + foto
    UNIQUE(place_id, photo_reference)
);

-- ===========================================
-- ÍNDICES
-- ===========================================

-- Índice para busca rápida por place_id
CREATE INDEX IF NOT EXISTS idx_cached_images_place_id 
ON public.cached_images(place_id);

-- Índice para busca por photo_reference
CREATE INDEX IF NOT EXISTS idx_cached_images_photo_reference 
ON public.cached_images(photo_reference);

-- Índice para limpar cache expirado
CREATE INDEX IF NOT EXISTS idx_cached_images_expires_at 
ON public.cached_images(expires_at);

-- ===========================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ===========================================

-- Habilita RLS
ALTER TABLE public.cached_images ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ler imagens cacheadas (são públicas)
CREATE POLICY IF NOT EXISTS "cached_images_select_all" 
ON public.cached_images FOR SELECT 
TO anon, authenticated 
USING (true);

-- Política: Apenas usuários autenticados podem inserir
CREATE POLICY IF NOT EXISTS "cached_images_insert_authenticated" 
ON public.cached_images FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política: Apenas usuários autenticados podem deletar (para limpar cache)
CREATE POLICY IF NOT EXISTS "cached_images_delete_authenticated" 
ON public.cached_images FOR DELETE 
TO authenticated 
USING (true);

-- ===========================================
-- FUNÇÃO: Limpar cache expirado (opcional)
-- ===========================================

CREATE OR REPLACE FUNCTION public.clean_expired_image_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.cached_images 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da tabela
COMMENT ON TABLE public.cached_images IS 'Cache de imagens do Google Places para reduzir custos de API';

-- ===========================================
-- POLÍTICAS DO STORAGE (bucket 'places')
-- ===========================================

-- SELECT: Qualquer um pode ler imagens
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'places_select_all'
    ) THEN
        CREATE POLICY "places_select_all" 
        ON storage.objects FOR SELECT 
        TO anon, authenticated 
        USING (bucket_id = 'places');
    END IF;
END $$;

-- INSERT: Usuários autenticados podem salvar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'places_insert_authenticated'
    ) THEN
        CREATE POLICY "places_insert_authenticated" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'places');
    END IF;
END $$;

-- DELETE: Usuários autenticados podem deletar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'places_delete_authenticated'
    ) THEN
        CREATE POLICY "places_delete_authenticated" 
        ON storage.objects FOR DELETE 
        TO authenticated 
        USING (bucket_id = 'places');
    END IF;
END $$;

-- ===========================================
-- VERIFICAÇÃO
-- ===========================================

SELECT 'Tabela cached_images criada/verificada com sucesso!' as status;
SELECT 'Políticas do storage configuradas!' as status;
