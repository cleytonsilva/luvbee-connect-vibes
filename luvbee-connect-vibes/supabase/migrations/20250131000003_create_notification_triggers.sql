-- Migration: Create notification triggers
-- Date: 2025-01-31
-- Description: Creates triggers to automatically create notifications for matches and messages
--              Required for RF-07.1: Sistema de Notificações

-- Function to notify on mutual match
CREATE OR REPLACE FUNCTION notify_match_mutual()
RETURNS TRIGGER AS $$
DECLARE
    user1_name TEXT;
    user2_name TEXT;
BEGIN
    -- Only create notifications when status changes to 'mutual'
    IF NEW.status = 'mutual' AND (OLD.status IS NULL OR OLD.status != 'mutual') THEN
        -- Get user names
        SELECT name INTO user1_name FROM users WHERE id = NEW.user1_id;
        SELECT name INTO user2_name FROM users WHERE id = NEW.user2_id;
        
        -- Create notification for user1
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.user1_id,
            'match_mutual',
            'Novo Match!',
            COALESCE('Você e ' || user2_name || ' deram match!', 'Você tem um novo match!'),
            jsonb_build_object(
                'match_id', NEW.id,
                'user_id', NEW.user2_id,
                'compatibility_score', NEW.compatibility_score
            )
        );
        
        -- Create notification for user2
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.user2_id,
            'match_mutual',
            'Novo Match!',
            COALESCE('Você e ' || user1_name || ' deram match!', 'Você tem um novo match!'),
            jsonb_build_object(
                'match_id', NEW.id,
                'user_id', NEW.user1_id,
                'compatibility_score', NEW.compatibility_score
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mutual matches
DROP TRIGGER IF EXISTS on_match_mutual ON people_matches;
CREATE TRIGGER on_match_mutual
    AFTER UPDATE ON people_matches
    FOR EACH ROW
    WHEN (NEW.status = 'mutual' AND (OLD.status IS NULL OR OLD.status != 'mutual'))
    EXECUTE FUNCTION notify_match_mutual();

-- Function to notify on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    receiver_id UUID;
    chat_record RECORD;
BEGIN
    -- Get receiver_id from chat
    SELECT 
        CASE 
            WHEN NEW.sender_id = c.user1_id THEN c.user2_id
            ELSE c.user1_id
        END as receiver,
        c.id as chat_id
    INTO chat_record
    FROM chats c
    WHERE c.id = NEW.chat_id;
    
    receiver_id := chat_record.receiver;
    
    -- Only notify if receiver exists
    IF receiver_id IS NOT NULL THEN
        -- Get sender name
        SELECT name INTO sender_name FROM users WHERE id = NEW.sender_id;
        
        -- Create notification for receiver
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            receiver_id,
            'new_message',
            COALESCE('Nova mensagem de ' || sender_name, 'Nova mensagem'),
            COALESCE(
                CASE 
                    WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
                    ELSE NEW.content
                END,
                'Você tem uma nova mensagem'
            ),
            jsonb_build_object(
                'chat_id', NEW.chat_id,
                'sender_id', NEW.sender_id,
                'message_id', NEW.id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Add comments
COMMENT ON FUNCTION notify_match_mutual IS 'Creates notifications when a mutual match occurs';
COMMENT ON FUNCTION notify_new_message IS 'Creates notifications when a new message is sent';

