-- Migration para garantir permissões do robô de eventos
-- Permitir inserção de eventos na tabela locations

-- Verificar se a política já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'locations' 
        AND schemaname = 'public'
        AND policyname = 'Allow service role to insert events'
    ) THEN
        -- Criar política para permitir inserção com service_role
        CREATE POLICY "Allow service role to insert events" ON locations
            FOR INSERT WITH CHECK (
                current_setting('role', true) = 'service_role'
            );
    END IF;
END $$;

-- Verificar se a política de leitura já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'locations' 
        AND schemaname = 'public'
        AND policyname = 'Allow anon read access'
    ) THEN
        -- Criar política para permitir leitura pública
        CREATE POLICY "Allow anon read access" ON locations
            FOR SELECT USING (true);
    END IF;
END $$;

-- Garantir permissões para os roles
GRANT SELECT ON locations TO anon;
GRANT INSERT ON locations TO authenticated;
GRANT ALL ON locations TO service_role;