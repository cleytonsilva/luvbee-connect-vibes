-- Migration: Database Optimization and Performance Improvements
-- Date: 2025-01-28
-- Description: Otimizações de performance, índices adicionais, validações e melhorias de segurança
-- Baseado em análise das páginas: /profiles, /locations, /messages

-- =============================================
-- 1. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =============================================

-- Índices compostos para queries frequentes de profiles
CREATE INDEX IF NOT EXISTS idx_users_active_onboarding ON public.users(is_active, onboarding_completed) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_location_search ON public.users(location_latitude, location_longitude) 
WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

-- Índice para busca de texto completo em users (se necessário)
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin(name gin_trgm_ops);

-- Índices compostos para locations
CREATE INDEX IF NOT EXISTS idx_locations_active_verified ON public.locations(is_active, is_verified) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_locations_category_active ON public.locations(category, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_locations_type_active ON public.locations(type, is_active) 
WHERE is_active = TRUE;

-- Índice para busca de texto completo em locations
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON public.locations USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_address_trgm ON public.locations USING gin(address gin_trgm_ops);

-- Índices para messages e chats (otimização de queries de mensagens)
CREATE INDEX IF NOT EXISTS idx_messages_chat_sent_at ON public.messages(chat_id, sent_at DESC) 
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_unread_by_chat ON public.messages(chat_id, read_at) 
WHERE read_at IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_sender_chat ON public.messages(sender_id, chat_id, sent_at DESC);

-- Índice para atualizar contadores de não lidas
CREATE INDEX IF NOT EXISTS idx_chats_unread_counts ON public.chats(user1_id, user2_id, user1_unread_count, user2_unread_count);

-- Índices para people_matches (otimização de matching)
CREATE INDEX IF NOT EXISTS idx_people_matches_status_compatibility ON public.people_matches(status, compatibility_score DESC NULLS LAST) 
WHERE status = 'mutual';

CREATE INDEX IF NOT EXISTS idx_people_matches_pending ON public.people_matches(user1_id, user2_id, status) 
WHERE status = 'pending';

-- Índices para location_matches (otimização de busca de locais próximos)
CREATE INDEX IF NOT EXISTS idx_location_matches_user_status ON public.location_matches(user_id, status, matched_at DESC) 
WHERE status = 'active';

-- =============================================
-- 2. VALIDAÇÕES E CONSTRAINTS ADICIONAIS
-- =============================================

-- Validação de email único e formato
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_check'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_email_check 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Validação de coordenadas geográficas válidas
ALTER TABLE public.users 
ADD CONSTRAINT IF NOT EXISTS users_valid_coordinates 
CHECK (
    (location_latitude IS NULL AND location_longitude IS NULL) OR
    (location_latitude BETWEEN -90 AND 90 AND location_longitude BETWEEN -180 AND 180)
);

ALTER TABLE public.locations 
ADD CONSTRAINT IF NOT EXISTS locations_valid_coordinates 
CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- Validação de conteúdo de mensagem não vazio após trim
ALTER TABLE public.messages 
ADD CONSTRAINT IF NOT EXISTS messages_content_not_empty 
CHECK (LENGTH(TRIM(content)) > 0);

-- Validação de arrays de preferências não vazios quando presentes
ALTER TABLE public.user_preferences 
ADD CONSTRAINT IF NOT EXISTS user_preferences_valid_arrays 
CHECK (
    (array_length(drink_preferences, 1) IS NULL OR array_length(drink_preferences, 1) > 0) AND
    (array_length(food_preferences, 1) IS NULL OR array_length(food_preferences, 1) > 0) AND
    (array_length(music_preferences, 1) IS NULL OR array_length(music_preferences, 1) > 0)
);

-- =============================================
-- 3. FUNÇÕES DE OTIMIZAÇÃO
-- =============================================

-- Função para atualizar contadores de mensagens não lidas
CREATE OR REPLACE FUNCTION update_chat_unread_counts()
RETURNS TRIGGER AS $$
DECLARE
    chat_record RECORD;
BEGIN
    -- Buscar informações do chat
    SELECT user1_id, user2_id INTO chat_record
    FROM public.chats
    WHERE id = NEW.chat_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Atualizar contador baseado no sender
    IF NEW.sender_id = chat_record.user1_id THEN
        UPDATE public.chats
        SET user2_unread_count = (
            SELECT COUNT(*) 
            FROM public.messages 
            WHERE chat_id = NEW.chat_id 
            AND sender_id != chat_record.user2_id
            AND read_at IS NULL
            AND is_deleted = FALSE
        )
        WHERE id = NEW.chat_id;
    ELSE
        UPDATE public.chats
        SET user1_unread_count = (
            SELECT COUNT(*) 
            FROM public.messages 
            WHERE chat_id = NEW.chat_id 
            AND sender_id != chat_record.user1_id
            AND read_at IS NULL
            AND is_deleted = FALSE
        )
        WHERE id = NEW.chat_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contadores quando mensagem é criada
DROP TRIGGER IF EXISTS update_chat_unread_counts_trigger ON public.messages;
CREATE TRIGGER update_chat_unread_counts_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_unread_counts();

-- Função para atualizar contadores quando mensagem é lida
CREATE OR REPLACE FUNCTION update_chat_unread_on_read()
RETURNS TRIGGER AS $$
DECLARE
    chat_record RECORD;
BEGIN
    -- Se mensagem foi marcada como lida
    IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read_at IS DISTINCT FROM NEW.read_at) THEN
        SELECT user1_id, user2_id INTO chat_record
        FROM public.chats
        WHERE id = NEW.chat_id;

        IF FOUND THEN
            -- Decrementar contador apropriado
            IF NEW.receiver_id = chat_record.user1_id THEN
                UPDATE public.chats
                SET user1_unread_count = GREATEST(0, user1_unread_count - 1)
                WHERE id = NEW.chat_id;
            ELSIF NEW.receiver_id = chat_record.user2_id THEN
                UPDATE public.chats
                SET user2_unread_count = GREATEST(0, user2_unread_count - 1)
                WHERE id = NEW.chat_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contadores quando mensagem é lida
DROP TRIGGER IF EXISTS update_chat_unread_on_read_trigger ON public.messages;
CREATE TRIGGER update_chat_unread_on_read_trigger
    AFTER UPDATE OF read_at ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_unread_on_read();

-- Função para buscar usuários próximos otimizada
CREATE OR REPLACE FUNCTION get_nearby_users(
    user_lat DECIMAL(10, 8),
    user_lng DECIMAL(11, 8),
    radius_km INTEGER DEFAULT 10,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    distance_km DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.avatar_url,
        u.bio,
        u.location_latitude,
        u.location_longitude,
        (
            6371 * acos(
                LEAST(1.0, 
                    cos(radians(user_lat)) * 
                    cos(radians(u.location_latitude::DECIMAL)) * 
                    cos(radians(u.location_longitude::DECIMAL) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(u.location_latitude::DECIMAL))
                )
            )
        )::DECIMAL(10, 2) AS distance_km
    FROM public.users u
    WHERE 
        u.is_active = TRUE
        AND u.onboarding_completed = TRUE
        AND u.location_latitude IS NOT NULL
        AND u.location_longitude IS NOT NULL
        -- Pre-filter usando bounding box
        AND u.location_latitude BETWEEN user_lat - (radius_km::DECIMAL / 111.0) 
                                    AND user_lat + (radius_km::DECIMAL / 111.0)
        AND u.location_longitude BETWEEN user_lng - (radius_km::DECIMAL / (111.0 * cos(radians(user_lat)))) 
                                     AND user_lng + (radius_km::DECIMAL / (111.0 * cos(radians(user_lat))))
        -- Distância exata usando Haversine
        AND (
            6371 * acos(
                LEAST(1.0, 
                    cos(radians(user_lat)) * 
                    cos(radians(u.location_latitude::DECIMAL)) * 
                    cos(radians(u.location_longitude::DECIMAL) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(u.location_latitude::DECIMAL))
                )
            )
        ) <= radius_km
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_users(DECIMAL, DECIMAL, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_users(DECIMAL, DECIMAL, INTEGER, INTEGER) TO anon;

-- =============================================
-- 4. MELHORIAS DE RLS POLICIES
-- =============================================

-- Policy melhorada para users: permitir busca de usuários ativos para matching
DROP POLICY IF EXISTS "users_select_for_matching" ON public.users;
CREATE POLICY "users_select_for_matching" ON public.users
    FOR SELECT 
    USING (
        is_active = TRUE 
        AND onboarding_completed = TRUE
        AND (
            -- Usuário pode ver seu próprio perfil
            auth.uid() = id
            OR
            -- Usuário pode ver outros usuários ativos (para matching)
            (is_active = TRUE AND onboarding_completed = TRUE)
        )
    );

-- Policy para messages: garantir que apenas participantes do chat possam ver mensagens
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own" ON public.messages
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
            AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        )
        AND is_deleted = FALSE
    );

-- Policy para messages: apenas sender pode deletar suas próprias mensagens
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages
    FOR DELETE 
    USING (auth.uid() = sender_id);

-- =============================================
-- 5. OTIMIZAÇÕES DE TABELAS
-- =============================================

-- Adicionar coluna de busca full-text se necessário (para PostgreSQL 12+)
DO $$
BEGIN
    -- Criar coluna tsvector para busca full-text em locations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'locations' 
        AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE public.locations 
        ADD COLUMN search_vector tsvector;
        
        -- Criar índice GIN para busca full-text
        CREATE INDEX idx_locations_search_vector ON public.locations USING gin(search_vector);
        
        -- Criar função para atualizar search_vector
        CREATE OR REPLACE FUNCTION update_locations_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := 
                setweight(to_tsvector('portuguese', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'B') ||
                setweight(to_tsvector('portuguese', COALESCE(NEW.address, '')), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Trigger para atualizar search_vector
        CREATE TRIGGER update_locations_search_vector_trigger
        BEFORE INSERT OR UPDATE ON public.locations
        FOR EACH ROW
        EXECUTE FUNCTION update_locations_search_vector();
        
        -- Atualizar registros existentes
        UPDATE public.locations 
        SET search_vector = 
            setweight(to_tsvector('portuguese', COALESCE(name, '')), 'A') ||
            setweight(to_tsvector('portuguese', COALESCE(description, '')), 'B') ||
            setweight(to_tsvector('portuguese', COALESCE(address, '')), 'C');
    END IF;
END $$;

-- =============================================
-- 6. VACUUM E ANALYZE
-- =============================================

-- Executar VACUUM ANALYZE para otimizar estatísticas
VACUUM ANALYZE public.users;
VACUUM ANALYZE public.locations;
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.chats;
VACUUM ANALYZE public.people_matches;
VACUUM ANALYZE public.location_matches;

-- =============================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================

COMMENT ON FUNCTION get_nearby_users IS 'Busca usuários próximos usando coordenadas geográficas. Retorna distância em km.';
COMMENT ON FUNCTION update_chat_unread_counts IS 'Atualiza contadores de mensagens não lidas quando nova mensagem é criada.';
COMMENT ON FUNCTION update_chat_unread_on_read IS 'Atualiza contadores de mensagens não lidas quando mensagem é marcada como lida.';
COMMENT ON INDEX idx_users_active_onboarding IS 'Índice composto para filtrar usuários ativos que completaram onboarding.';
COMMENT ON INDEX idx_locations_active_verified IS 'Índice composto para filtrar locais ativos e verificados.';
COMMENT ON INDEX idx_messages_chat_sent_at IS 'Índice para ordenar mensagens por chat e data de envio.';

