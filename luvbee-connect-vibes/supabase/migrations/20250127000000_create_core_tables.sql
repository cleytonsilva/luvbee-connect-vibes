-- Migration: Create core tables for LuvBee Platform
-- Date: 2025-01-27
-- Description: Creates all core tables, indexes, RLS policies, triggers, and functions
-- Based on: specs/001-luvbee-core-platform/data-model.md

-- =============================================
-- 1. EXTENSIONS
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 2. CORE TABLES
-- =============================================

-- Table: users (extends Supabase Auth)
-- NOTE: This table will be migrated from existing structure
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age >= 18 AND age <= 120),
    avatar_url TEXT,
    bio TEXT CHECK (LENGTH(bio) <= 500),
    location VARCHAR(100), -- LEGACY: will be migrated to coordinates
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    search_radius_km INTEGER DEFAULT 10 CHECK (search_radius_km >= 1 AND search_radius_km <= 100),
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    preferences JSONB DEFAULT '{}', -- LEGACY: will be migrated to user_preferences
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    drink_preferences TEXT[] NOT NULL DEFAULT '{}',
    food_preferences TEXT[] NOT NULL DEFAULT '{}',
    music_preferences TEXT[] NOT NULL DEFAULT '{}',
    vibe_preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: locations
-- NOTE: This table will be migrated from existing structure
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id TEXT UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- LEGACY: will be mapped to type
    type VARCHAR(50),
    address TEXT NOT NULL,
    location POINT, -- LEGACY: PostGIS POINT
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    images TEXT[] DEFAULT '{}',
    photo_url TEXT,
    description TEXT CHECK (LENGTH(description) <= 1000),
    phone VARCHAR(20),
    website TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
    opening_hours JSONB DEFAULT '{}',
    google_places_data JSONB,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_curated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_synced_at TIMESTAMPTZ
);

-- Table: location_matches (NEW - Core Loop 1)
CREATE TABLE IF NOT EXISTS public.location_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    matched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, location_id)
);

-- Table: people_matches (replaces matches with improved structure)
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

-- Table: chats (NEW - chat structure)
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

-- Table: messages (updated with chat_id)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- LEGACY: for compatibility
    content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT different_participants CHECK (sender_id != receiver_id OR receiver_id IS NULL)
);

-- Table: check_ins (EXISTING - maintained)
-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Ensure is_active column exists (for tables created before this migration)
-- This handles the case where the table was created without is_active
DO $$
BEGIN
    -- Only add column if table exists and column doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'check_ins'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.check_ins 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Set default value for existing rows
        UPDATE public.check_ins 
        SET is_active = TRUE 
        WHERE is_active IS NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors (column might already exist)
        NULL;
END $$;

-- Table: location_categories (EXISTING - maintained)
CREATE TABLE IF NOT EXISTS public.location_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#000000',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: favorites (EXISTING - maintained)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Table: reviews (EXISTING - maintained)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Table: audit_logs (EXISTING - maintained)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON public.users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_drinks ON public.user_preferences USING GIN(drink_preferences);
CREATE INDEX IF NOT EXISTS idx_user_preferences_food ON public.user_preferences USING GIN(food_preferences);
CREATE INDEX IF NOT EXISTS idx_user_preferences_music ON public.user_preferences USING GIN(music_preferences);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_category ON public.locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id ON public.locations(google_place_id);
CREATE INDEX IF NOT EXISTS idx_locations_rating ON public.locations(rating DESC);
CREATE INDEX IF NOT EXISTS idx_locations_verified ON public.locations(is_verified);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_curated ON public.locations(is_curated);
CREATE INDEX IF NOT EXISTS idx_locations_owner ON public.locations(owner_id);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON public.locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_geo ON public.locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_locations_location ON public.locations(latitude, longitude);

-- Location matches indexes
CREATE INDEX IF NOT EXISTS idx_location_matches_user_location ON public.location_matches(user_id, location_id);
CREATE INDEX IF NOT EXISTS idx_location_matches_user ON public.location_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_location_matches_location ON public.location_matches(location_id);
CREATE INDEX IF NOT EXISTS idx_location_matches_matched_at ON public.location_matches(matched_at DESC);

-- People matches indexes
CREATE INDEX IF NOT EXISTS idx_people_matches_users ON public.people_matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_user1 ON public.people_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_user2 ON public.people_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_people_matches_status ON public.people_matches(status);
CREATE INDEX IF NOT EXISTS idx_people_matches_compatibility ON public.people_matches(compatibility_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_people_matches_matched_at ON public.people_matches(matched_at DESC NULLS LAST);

-- Chats indexes
CREATE INDEX IF NOT EXISTS idx_chats_users ON public.chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON public.chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON public.chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON public.chats(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chats_people_match ON public.chats(people_match_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(chat_id, read_at) WHERE read_at IS NULL;

-- Check-ins indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_location ON public.check_ins(location_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.check_ins(created_at DESC);

-- Indexes that depend on is_active column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins' 
        AND column_name = 'is_active'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_checkins_active ON public.check_ins(is_active);
        -- Unique constraint: Only one active check-in per user per location
        CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique_active 
        ON public.check_ins(user_id, location_id) 
        WHERE is_active = TRUE;
    END IF;
END $$;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_location ON public.reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_location ON public.favorites(location_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.favorites(created_at DESC);

-- =============================================
-- 4. FUNCTIONS
-- =============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate compatibility score between two users
CREATE OR REPLACE FUNCTION calculate_compatibility_score(user1_id UUID, user2_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    score DECIMAL(5, 2) := 0;
    preferences_weight DECIMAL(5, 2) := 50.0;
    locations_weight DECIMAL(5, 2) := 30.0;
    proximity_weight DECIMAL(5, 2) := 20.0;
    common_drinks INTEGER;
    common_food INTEGER;
    common_music INTEGER;
    common_locations INTEGER;
    total_preferences INTEGER;
    preferences_match DECIMAL(5, 2);
BEGIN
    -- Calculate preferences match
    SELECT 
        COUNT(*) FILTER (WHERE d1.drink = ANY(d2.drink_preferences)),
        COUNT(*) FILTER (WHERE f1.food = ANY(f2.food_preferences)),
        COUNT(*) FILTER (WHERE m1.music = ANY(m2.music_preferences))
    INTO common_drinks, common_food, common_music
    FROM user_preferences up1
    CROSS JOIN LATERAL unnest(up1.drink_preferences) AS d1(drink)
    CROSS JOIN LATERAL unnest(up1.food_preferences) AS f1(food)
    CROSS JOIN LATERAL unnest(up1.music_preferences) AS m1(music)
    JOIN user_preferences up2 ON up2.user_id = user2_id
    CROSS JOIN LATERAL unnest(up2.drink_preferences) AS d2(drink)
    CROSS JOIN LATERAL unnest(up2.food_preferences) AS f2(food)
    CROSS JOIN LATERAL unnest(up2.music_preferences) AS m2(music)
    WHERE up1.user_id = user1_id;

    total_preferences := (
        SELECT COUNT(*) FROM user_preferences WHERE user_id = user1_id
    ) + (
        SELECT COUNT(*) FROM user_preferences WHERE user_id = user2_id
    );

    IF total_preferences > 0 THEN
        preferences_match := ((common_drinks + common_food + common_music)::DECIMAL / total_preferences::DECIMAL) * 100;
    ELSE
        preferences_match := 0;
    END IF;

    -- Calculate common locations
    SELECT COUNT(DISTINCT lm1.location_id)
    INTO common_locations
    FROM location_matches lm1
    INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
    WHERE lm1.user_id = user1_id
      AND lm2.user_id = user2_id
      AND lm1.status = 'active'
      AND lm2.status = 'active';

    -- Calculate final score
    score := (
        (preferences_match * preferences_weight / 100) +
        (LEAST(common_locations * 10, 100) * locations_weight / 100) +
        (proximity_weight) -- TODO: Add proximity calculation
    );

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function: Get common locations between two users
CREATE OR REPLACE FUNCTION get_common_locations(user1_id UUID, user2_id UUID)
RETURNS TABLE(location_id UUID, location_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT l.id, l.name
    FROM locations l
    INNER JOIN location_matches lm1 ON l.id = lm1.location_id
    INNER JOIN location_matches lm2 ON l.id = lm2.location_id
    WHERE lm1.user_id = user1_id
      AND lm2.user_id = user2_id
      AND lm1.status = 'active'
      AND lm2.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function: Update location rating from reviews
CREATE OR REPLACE FUNCTION update_location_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.locations
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE location_id = COALESCE(NEW.location_id, OLD.location_id)
          AND is_verified = TRUE
    )
    WHERE id = COALESCE(NEW.location_id, OLD.location_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_matches_updated_at
    BEFORE UPDATE ON public.people_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update matched_at when people_match status changes to 'mutual'
CREATE OR REPLACE FUNCTION update_matched_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'mutual' AND OLD.status != 'mutual' THEN
        NEW.matched_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_people_matches_matched_at
    BEFORE UPDATE ON public.people_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_matched_at();

-- Trigger: Update chats.last_message_at when message is created
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats
    SET last_message_at = NEW.sent_at
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_last_message_at
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_last_message();

-- Trigger: Update location rating when review changes
CREATE TRIGGER update_location_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_location_rating();

-- Trigger: Create chat when people_match becomes mutual
CREATE OR REPLACE FUNCTION create_chat_on_mutual_match()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'mutual' AND (OLD.status IS NULL OR OLD.status != 'mutual') THEN
        INSERT INTO public.chats (user1_id, user2_id, people_match_id, created_at)
        VALUES (NEW.user1_id, NEW.user2_id, NEW.id, NOW())
        ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_chat_on_mutual_match_trigger
    AFTER INSERT OR UPDATE ON public.people_matches
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_on_mutual_match();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users RLS Policies
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON public.users
    FOR DELETE USING (auth.uid() = id);

-- User Preferences RLS Policies
CREATE POLICY "user_preferences_select_own" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Locations RLS Policies
CREATE POLICY "locations_select_active" ON public.locations
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "locations_insert_authenticated" ON public.locations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Location Matches RLS Policies
CREATE POLICY "location_matches_select_own" ON public.location_matches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "location_matches_insert_own" ON public.location_matches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "location_matches_update_own" ON public.location_matches
    FOR UPDATE USING (auth.uid() = user_id);

-- People Matches RLS Policies
CREATE POLICY "people_matches_select_own" ON public.people_matches
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "people_matches_insert_own" ON public.people_matches
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "people_matches_update_own" ON public.people_matches
    FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Chats RLS Policies
CREATE POLICY "chats_select_own" ON public.chats
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats_insert_own" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats_update_own" ON public.chats
    FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages RLS Policies
CREATE POLICY "messages_select_own" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
            AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        )
    );

CREATE POLICY "messages_insert_own" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.chats
            WHERE chats.id = messages.chat_id
            AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        )
    );

CREATE POLICY "messages_update_own" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Check-ins RLS Policies
CREATE POLICY "checkins_select_own" ON public.check_ins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "checkins_insert_own" ON public.check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkins_update_own" ON public.check_ins
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "checkins_delete_own" ON public.check_ins
    FOR DELETE USING (auth.uid() = user_id);

-- Favorites RLS Policies
CREATE POLICY "favorites_select_own" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Reviews RLS Policies
CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (TRUE);

CREATE POLICY "reviews_insert_own" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. SEED DATA
-- =============================================

-- Insert default location categories
INSERT INTO public.location_categories (name, icon, color) VALUES
    ('Bar', 'wine', '#8B5CF6'),
    ('Club', 'music', '#EC4899'),
    ('Restaurante', 'utensils', '#F59E0B'),
    ('Pub', 'beer', '#10B981'),
    ('Lounge', 'sofa', '#6366F1'),
    ('Café', 'coffee', '#D97706'),
    ('Hotel', 'hotel', '#3B82F6'),
    ('Evento', 'calendar', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 8. PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select permissions to anon for public data
GRANT SELECT ON public.locations TO anon;
GRANT SELECT ON public.location_categories TO anon;
GRANT SELECT ON public.reviews TO anon;

