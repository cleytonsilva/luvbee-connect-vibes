-- =============================================
-- MIGRAÇÃO: Habilitar Realtime condicionalmente
-- =============================================
-- Adiciona tabelas à publicação supabase_realtime apenas se existirem.

DO $$
DECLARE
    _tbl TEXT;
BEGIN
    -- Lista de tabelas alvo
    FOREACH _tbl IN ARRAY ARRAY['messages','people_matches','location_matches','chats'] LOOP
        -- Verificar se a tabela existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = _tbl
        ) THEN
            -- Verificar se já está na publicação
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                  AND schemaname = 'public' 
                  AND tablename = _tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _tbl);
                RAISE NOTICE '✅ Tabela % adicionada à publicação supabase_realtime', _tbl;
            ELSE
                RAISE NOTICE 'ℹ️ Tabela % já está na publicação supabase_realtime', _tbl;
            END IF;
        ELSE
            RAISE NOTICE '⚠️ Tabela % não existe — ignorando', _tbl;
        END IF;
    END LOOP;
END $$;

-- Verificar tabelas habilitadas
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;