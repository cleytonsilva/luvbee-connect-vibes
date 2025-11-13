-- Migração: Criar bucket div e tabela cached_place_photos
-- Data: 2025-01-12
-- Responsável: Sistema Esquads

-- =============================================
-- 1. BUCKET DE IMAGENS DIV
-- =============================================

-- Criar bucket público para armazenar imagens de lugares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('div', 'div', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública para o bucket div
CREATE POLICY "public_read_div" ON storage.objects
FOR SELECT
USING (bucket_id = 'div');

-- Política de inserção para usuários autenticados (via Edge Functions)
CREATE POLICY "authenticated_insert_div" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'div' AND auth.role() = 'authenticated'
);

-- Política de exclusão para administradores
CREATE POLICY "admin_delete_div" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'div' AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- =============================================
-- 2. TABELA DE CACHE DE FOTOS
-- =============================================

-- Criar tabela para rastrear fotos cacheadas
CREATE TABLE IF NOT EXISTS public.cached_place_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  photo_reference TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cached_photos_place_id ON public.cached_place_photos(place_id);
CREATE INDEX IF NOT EXISTS idx_cached_photos_created_at ON public.cached_place_photos(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cached_photos_place_unique ON public.cached_place_photos(place_id);

-- RLS (Row Level Security)
ALTER TABLE public.cached_place_photos ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "cached_place_photos_read" ON public.cached_place_photos
FOR SELECT
USING (true);

-- Política de inserção para usuários autenticados
CREATE POLICY "cached_place_photos_insert" ON public.cached_place_photos
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política de atualização para administradores
CREATE POLICY "cached_place_photos_update_admin" ON public.cached_place_photos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Política de exclusão para administradores
CREATE POLICY "cached_place_photos_delete_admin" ON public.cached_place_photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cached_place_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cached_place_photos_updated_at
  BEFORE UPDATE ON public.cached_place_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_cached_place_photos_updated_at();

-- =============================================
-- 3. FUNÇÃO AUXILIAR PARA VERIFICAR CACHE
-- =============================================

CREATE OR REPLACE FUNCTION public.get_cached_photo_url(place_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  cached_url TEXT;
BEGIN
  SELECT public_url INTO cached_url
  FROM public.cached_place_photos
  WHERE place_id = place_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN cached_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. PERMISSÕES
-- =============================================

-- Grant permissions
GRANT SELECT ON public.cached_place_photos TO anon, authenticated;
GRANT INSERT ON public.cached_place_photos TO authenticated;
GRANT UPDATE, DELETE ON public.cached_place_photos TO authenticated;

-- Storage permissions
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION public.get_cached_photo_url(TEXT) TO anon, authenticated;

-- =============================================
-- 5. VERIFICAÇÃO
-- =============================================

-- Verificar se o bucket foi criado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'div') THEN
    RAISE NOTICE '✅ Bucket div criado com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar bucket div';
  END IF;
END $$;

-- Verificar se a tabela foi criada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cached_place_photos') THEN
    RAISE NOTICE '✅ Tabela cached_place_photos criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar tabela cached_place_photos';
  END IF;
END $$;