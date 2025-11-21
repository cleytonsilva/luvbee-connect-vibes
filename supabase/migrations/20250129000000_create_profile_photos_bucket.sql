-- Migração: Criar bucket profile-photos para fotos de perfil
-- Data: 2025-01-29
-- Responsável: Sistema Esquads

-- =============================================
-- 1. BUCKET DE FOTOS DE PERFIL
-- =============================================

-- Criar bucket público para armazenar fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. POLÍTICAS DE STORAGE PARA PROFILE-PHOTOS
-- =============================================

-- Política de leitura pública para o bucket profile-photos
CREATE POLICY "public_read_profile_photos" ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-photos');

-- Política de inserção para usuários autenticados (apenas próprias fotos)
CREATE POLICY "authenticated_insert_own_photos" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de atualização para usuários autenticados (apenas próprias fotos)
CREATE POLICY "authenticated_update_own_photos" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de exclusão para usuários autenticados (apenas próprias fotos)
CREATE POLICY "authenticated_delete_own_photos" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-photos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- 3. FUNÇÃO AUXILIAR PARA DELETAR FOTOS ANTIGAS
-- =============================================

CREATE OR REPLACE FUNCTION public.delete_old_profile_photos(user_id_param UUID, new_photo_path TEXT)
RETURNS VOID AS $$
BEGIN
  -- Deletar fotos antigas do mesmo usuário (exceto a nova)
  DELETE FROM storage.objects
  WHERE bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = user_id_param::text
    AND name != new_photo_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. PERMISSÕES
-- =============================================

-- Storage permissions
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT ON storage.objects TO authenticated;
GRANT UPDATE ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION public.delete_old_profile_photos(UUID, TEXT) TO authenticated;

-- =============================================
-- 5. VERIFICAÇÃO
-- =============================================

-- Verificar se o bucket foi criado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-photos') THEN
    RAISE NOTICE '✅ Bucket profile-photos criado com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar bucket profile-photos';
  END IF;
END $$;