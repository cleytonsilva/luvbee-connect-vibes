-- =============================================
-- MIGRAÇÃO: Criar tabelas people_matches e chats (condicional)
-- =============================================
-- Esta migração cria apenas as tabelas people_matches e chats, 
-- com índices e RLS, sem interferir nas tabelas já existentes.

BEGIN;

-- Criar people_matches se não existir
CREATE TABLE IF NOT EXISTS public.people_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user1_liked_at TIMESTAMPTZ,
    user2_liked_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'mutual', 'unmatched')),
    compatibility_score DECIMAL(5, 2) CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    common_locations_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user1_id, user2_id),
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    CONSTRAINT user1_less_than_user2 CHECK (user1_id < user2_id)
);

-- Criar chats se não existir
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    people_match_id UUID REFERENCES public.people_matches(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    user1_unread_count INTEGER DEFAULT 0 NOT NULL,
    user2_unread_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user1_id, user2_id),
    CONSTRAINT different_chat_users CHECK (user1_id != user2_id)
);

-- Índices de people_matches
CREATE INDEX IF NOT EXISTS idx_people_matches_users ON public.people_matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_user1 ON public.people_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_user2 ON public.people_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_status ON public.people_matches(status);
CREATE INDEX IF NOT EXISTS idx_people_matches_compatibility ON public.people_matches(compatibility_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_people_matches_matched_at ON public.people_matches(matched_at DESC NULLS LAST);

-- Índices de chats
CREATE INDEX IF NOT EXISTS idx_chats_users ON public.chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON public.chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON public.chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON public.chats(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chats_people_match ON public.chats(people_match_id);

-- Habilitar RLS
ALTER TABLE public.people_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para people_matches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'people_matches_select_own' 
          AND polrelid = 'public.people_matches'::regclass
    ) THEN
        CREATE POLICY "people_matches_select_own" ON public.people_matches
            FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'people_matches_insert_own' 
          AND polrelid = 'public.people_matches'::regclass
    ) THEN
        CREATE POLICY "people_matches_insert_own" ON public.people_matches
            FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'people_matches_update_own' 
          AND polrelid = 'public.people_matches'::regclass
    ) THEN
        CREATE POLICY "people_matches_update_own" ON public.people_matches
            FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;
END $$;

-- Políticas RLS para chats
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'chats_select_own' 
          AND polrelid = 'public.chats'::regclass
    ) THEN
        CREATE POLICY "chats_select_own" ON public.chats
            FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'chats_insert_own' 
          AND polrelid = 'public.chats'::regclass
    ) THEN
        CREATE POLICY "chats_insert_own" ON public.chats
            FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy 
        WHERE polname = 'chats_update_own' 
          AND polrelid = 'public.chats'::regclass
    ) THEN
        CREATE POLICY "chats_update_own" ON public.chats
            FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;
END $$;

COMMIT;