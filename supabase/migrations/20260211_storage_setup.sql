-- Configuração do Storage para o bucket 'photos'
-- 1. Criar o bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de segurança (RLS)
-- Primeiro, remover políticas antigas para evitar duplicidade/conflito
DROP POLICY IF EXISTS "Public Access to Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized Users Can Upload Photos" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Update Their Own Photos" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Delete Their Own Photos" ON storage.objects;

-- Política de Leitura (Qualquer um pode ver)
CREATE POLICY "Public Access to Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Política de Upload (Usuário autenticado pode enviar)
CREATE POLICY "Authorized Users Can Upload Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Política de Atualização (Usuário pode atualizar seus próprios arquivos)
CREATE POLICY "Users Can Update Their Own Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1]::uuid = auth.uid());

-- Política de Deleção (Usuário pode deletar seus próprios arquivos)
CREATE POLICY "Users Can Delete Their Own Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1]::uuid = auth.uid());
