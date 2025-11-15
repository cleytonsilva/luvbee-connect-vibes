-- =============================================
-- Script para Habilitar Realtime no Supabase
-- =============================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new

-- Habilitar Realtime para mensagens
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;

-- Habilitar Realtime para matches de pessoas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'people_matches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE people_matches;
    END IF;
END $$;

-- Habilitar Realtime para matches de locais
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'location_matches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE location_matches;
    END IF;
END $$;

-- Habilitar Realtime para chats
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chats;
    END IF;
END $$;

-- Verificar tabelas habilitadas no Realtime
SELECT 
  schemaname,
  tablename,
  '✅ Realtime habilitado' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'people_matches', 'location_matches', 'chats')
ORDER BY tablename;

-- Verificar se todas as tabelas foram habilitadas
SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Todas as 4 tabelas têm Realtime habilitado'
    ELSE '⚠️ Apenas ' || COUNT(*) || ' de 4 tabelas têm Realtime habilitado'
  END as status_final
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'people_matches', 'location_matches', 'chats');
