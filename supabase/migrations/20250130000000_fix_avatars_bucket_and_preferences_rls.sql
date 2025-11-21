-- Migração: Corrigir políticas RLS para bucket avatars e user_preferences
-- Data: 2025-01-30
-- Responsável: Sistema Esquads
-- 
-- Problema: Erros 400 e 403 ao fazer upload de avatar e salvar preferências no onboarding
-- Solução: Criar bucket avatars com políticas RLS corretas e garantir políticas de upsert

-- =============================================
-- 1. CRIAR BUCKET AVATARS SE NÃO EXISTIR
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. POLÍTICAS DE STORAGE PARA AVATARS
-- =============================================

-- Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "authenticated_insert_avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_avatars" ON storage.objects;
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;

-- Política de leitura pública para o bucket avatars
CREATE POLICY "public_read_avatars" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Política de inserção para usuários autenticados (apenas próprios avatares)
-- Permite upload apenas em pastas com o próprio user_id
CREATE POLICY "authenticated_insert_avatars" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  -- Permite upload em pastas com o próprio user_id ou diretamente com nome que começa com user_id
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- Política de atualização para usuários autenticados (apenas próprios avatares)
CREATE POLICY "authenticated_update_avatars" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- Política de exclusão para usuários autenticados (apenas próprios avatares)
CREATE POLICY "authenticated_delete_avatars" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- =============================================
-- 3. CORRIGIR POLÍTICAS DE USER_PREFERENCES
-- =============================================

-- Remover políticas antigas se existirem (para garantir que não há conflitos)
DROP POLICY IF EXISTS "user_preferences_upsert_own" ON public.user_preferences;

-- Criar política de upsert para user_preferences
-- Isso permite INSERT e UPDATE em uma única operação
CREATE POLICY "user_preferences_upsert_own" ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Garantir que as políticas de INSERT e UPDATE também existem (para compatibilidade)
-- Se já existem, não faz nada devido ao IF NOT EXISTS implícito
DO $$
BEGIN
  -- Verificar se a política de INSERT existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_preferences' 
    AND policyname = 'user_preferences_insert_own'
  ) THEN
    CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Verificar se a política de UPDATE existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_preferences' 
    AND policyname = 'user_preferences_update_own'
  ) THEN
    CREATE POLICY "user_preferences_update_own" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================
-- 4. VERIFICAÇÕES
-- =============================================

-- Verificar se o bucket foi criado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    RAISE NOTICE '✅ Bucket avatars criado/verificado com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar bucket avatars';
  END IF;
END $$;

-- Verificar se as políticas foram criadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_preferences' 
    AND policyname = 'user_preferences_upsert_own'
  ) THEN
    RAISE NOTICE '✅ Política de upsert para user_preferences criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar política de upsert para user_preferences';
  END IF;
END $$;

-- =============================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================

COMMENT ON POLICY "authenticated_insert_avatars" ON storage.objects IS 
'Permite usuários autenticados fazerem upload de avatares em pastas com seu próprio user_id';

COMMENT ON POLICY "user_preferences_upsert_own" ON public.user_preferences IS 
'Permite usuários autenticados fazerem upsert (INSERT ou UPDATE) de suas próprias preferências';

