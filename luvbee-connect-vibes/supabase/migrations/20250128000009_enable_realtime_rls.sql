-- Migration: Enable Realtime RLS for messages table
-- Date: 2025-01-28
-- Description: Garante que políticas RLS se aplicam ao Realtime

-- Adicionar tabela messages à publicação do Realtime (se ainda não estiver)
-- Isso garante que as políticas RLS se aplicam às mudanças em tempo real
DO $$
BEGIN
    -- Verificar se a tabela já está na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;

-- Garantir que a tabela chats também está na publicação
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

