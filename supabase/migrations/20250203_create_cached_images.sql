-- Migration: Criar tabela de cache de imagens
-- Isso armazena as URLs das imagens cacheadas do Google Places

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
CREATE POLICY "cached_images_select_all" 
ON public.cached_images FOR SELECT 
TO anon, authenticated 
USING (true);

-- Política: Apenas usuários autenticados podem inserir
CREATE POLICY "cached_images_insert_authenticated" 
ON public.cached_images FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política: Apenas usuários autenticados podem deletar (para limpar cache)
CREATE POLICY "cached_images_delete_authenticated" 
ON public.cached_images FOR DELETE 
TO authenticated 
USING (true);

-- ===========================================
-- BUCKET DE STORAGE: places
-- ===========================================

-- NOTA: O bucket 'places' já existe no projeto.
-- Certifique-se de que ele está configurado como público e
-- tem as políticas de acesso corretas.

-- Políticas recomendadas para o bucket 'places':
/*
-- SELECT: Qualquer um pode ler
CREATE POLICY "places_select_all" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'places');

-- INSERT: Usuários autenticados podem salvar imagens
CREATE POLICY "places_insert_authenticated" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'places');

-- DELETE: Usuários autenticados podem deletar (para limpar cache)
CREATE POLICY "places_delete_authenticated" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'places');
*/

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
