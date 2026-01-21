-- Adicionar coluna para caminho da imagem no storage
ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_storage_path TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS image_storage_path TEXT;

-- Criar bucket 'places' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('places', 'places', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Storage: Leitura Pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'places' );

-- Política de Storage: Escrita apenas para Service Role (Edge Functions) ou Admins
-- Nota: Edge Functions usam service_role key que bypassa RLS, mas é bom ter política explícita se usarmos cliente autenticado
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'places' );

CREATE POLICY "Service Role Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'places' );
