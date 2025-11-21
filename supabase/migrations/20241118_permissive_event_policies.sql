-- Migration para garantir permissões completas para testes
-- ATENÇÃO: Esta migration é para ambiente de desenvolvimento/testes
-- Em produção, devem ser usadas políticas mais restritivas

-- Remover políticas existentes que podem estar causando conflito
DO $$
BEGIN
    -- Remover políticas que podem estar bloqueando
    DROP POLICY IF EXISTS "Allow service role to insert events" ON locations;
    DROP POLICY IF EXISTS "Allow authenticated users to view locations" ON locations;
    DROP POLICY IF EXISTS "Allow users to view active locations" ON locations;
    DROP POLICY IF EXISTS "Allow service role full access" ON locations;
    DROP POLICY IF EXISTS "Allow authenticated insert" ON locations;
    DROP POLICY IF EXISTS "Allow anon read access" ON locations;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros se as políticas não existirem
END $$;

-- Criar política permissiva para testes
CREATE POLICY "Allow all operations for development" ON locations
    FOR ALL USING (true);

-- Garantir permissões completas
GRANT ALL ON locations TO anon;
GRANT ALL ON locations TO authenticated;
GRANT ALL ON locations TO service_role;