-- TABELA: cached_images
CREATE TABLE IF NOT EXISTS public.cached_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    place_id TEXT NOT NULL,
    photo_reference TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(place_id, photo_reference)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_cached_images_place_id ON public.cached_images(place_id);
CREATE INDEX IF NOT EXISTS idx_cached_images_photo_reference ON public.cached_images(photo_reference);
CREATE INDEX IF NOT EXISTS idx_cached_images_expires_at ON public.cached_images(expires_at);

-- RLS
ALTER TABLE public.cached_images ENABLE ROW LEVEL SECURITY;

-- Políticas (drop e recria para garantir)
DROP POLICY IF EXISTS "cached_images_select_all" ON public.cached_images;
DROP POLICY IF EXISTS "cached_images_insert_authenticated" ON public.cached_images;
DROP POLICY IF EXISTS "cached_images_delete_authenticated" ON public.cached_images;

CREATE POLICY "cached_images_select_all" ON public.cached_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cached_images_insert_authenticated" ON public.cached_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cached_images_delete_authenticated" ON public.cached_images FOR DELETE TO authenticated USING (true);

-- FUNÇÃO de limpeza
CREATE OR REPLACE FUNCTION public.clean_expired_image_cache()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM public.cached_images WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS DO STORAGE (bucket 'places')
-- Primeiro verifica se as políticas já existem e remove
DO $$
BEGIN
    -- Verifica e cria política SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'places_select_all'
    ) THEN
        CREATE POLICY "places_select_all" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'places');
    END IF;
    
    -- Verifica e cria política INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'places_insert_authenticated'
    ) THEN
        CREATE POLICY "places_insert_authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'places');
    END IF;
    
    -- Verifica e cria política DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'places_delete_authenticated'
    ) THEN
        CREATE POLICY "places_delete_authenticated" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'places');
    END IF;
END $$;
