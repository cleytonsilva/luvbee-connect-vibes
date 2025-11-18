-- Migration: Create compatibility functions and triggers for Two-Layer Matching
-- Date: 2025-01-27
-- Description: Creates functions and triggers for calculating compatibility scores
--              and filtering matches by common locations (Core Feature)
-- Based on: specs/001-luvbee-core-platform/data-model.md

-- =============================================
-- 1. UPDATE calculate_compatibility_score FUNCTION
-- =============================================
-- This function calculates compatibility based on preferences and common locations

CREATE OR REPLACE FUNCTION calculate_compatibility_score(user1_id UUID, user2_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    score DECIMAL(5, 2) := 0;
    preferences_weight DECIMAL(5, 2) := 50.0;
    locations_weight DECIMAL(5, 2) := 30.0;
    proximity_weight DECIMAL(5, 2) := 20.0;
    common_drinks INTEGER := 0;
    common_food INTEGER := 0;
    common_music INTEGER := 0;
    common_locations INTEGER := 0;
    total_preferences INTEGER := 0;
    preferences_match DECIMAL(5, 2) := 0;
    user1_drinks TEXT[];
    user1_food TEXT[];
    user1_music TEXT[];
    user2_drinks TEXT[];
    user2_food TEXT[];
    user2_music TEXT[];
BEGIN
    -- Get preferences for both users
    SELECT drink_preferences, food_preferences, music_preferences
    INTO user1_drinks, user1_food, user1_music
    FROM user_preferences
    WHERE user_id = user1_id;
    
    SELECT drink_preferences, food_preferences, music_preferences
    INTO user2_drinks, user2_food, user2_music
    FROM user_preferences
    WHERE user_id = user2_id;
    
    -- Calculate common preferences
    IF user1_drinks IS NOT NULL AND user2_drinks IS NOT NULL THEN
        SELECT COUNT(*) INTO common_drinks
        FROM unnest(user1_drinks) AS d1
        WHERE d1 = ANY(user2_drinks);
    END IF;
    
    IF user1_food IS NOT NULL AND user2_food IS NOT NULL THEN
        SELECT COUNT(*) INTO common_food
        FROM unnest(user1_food) AS f1
        WHERE f1 = ANY(user2_food);
    END IF;
    
    IF user1_music IS NOT NULL AND user2_music IS NOT NULL THEN
        SELECT COUNT(*) INTO common_music
        FROM unnest(user1_music) AS m1
        WHERE m1 = ANY(user2_music);
    END IF;
    
    -- Calculate total preferences
    total_preferences := COALESCE(array_length(user1_drinks, 1), 0) +
                         COALESCE(array_length(user1_food, 1), 0) +
                         COALESCE(array_length(user1_music, 1), 0) +
                         COALESCE(array_length(user2_drinks, 1), 0) +
                         COALESCE(array_length(user2_food, 1), 0) +
                         COALESCE(array_length(user2_music, 1), 0);
    
    -- Calculate preferences match percentage
    IF total_preferences > 0 THEN
        preferences_match := ((common_drinks + common_food + common_music)::DECIMAL / total_preferences::DECIMAL) * 100;
    ELSE
        preferences_match := 0;
    END IF;
    
    -- Calculate common locations (CORE FEATURE: Two-Layer Matching)
    SELECT COUNT(DISTINCT lm1.location_id)
    INTO common_locations
    FROM location_matches lm1
    INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
    WHERE lm1.user_id = user1_id
      AND lm2.user_id = user2_id
      AND lm1.status = 'active'
      AND lm2.status = 'active';
    
    -- Calculate final score
    -- Preferences: 50% weight
    -- Common locations: 30% weight (max 10 locations = 100%)
    -- Proximity: 20% weight (TODO: implement proximity calculation)
    score := (
        (preferences_match * preferences_weight / 100) +
        (LEAST(common_locations * 10, 100) * locations_weight / 100) +
        (proximity_weight) -- TODO: Add proximity calculation based on location_latitude/longitude
    );
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 2. CREATE get_potential_matches FUNCTION
-- =============================================
-- This function returns potential matches filtered by common locations
-- and ordered by compatibility score (CORE FEATURE)

-- Drop existing function if it exists (may have different signature)
DROP FUNCTION IF EXISTS get_potential_matches(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_potential_matches(
    p_user_id UUID,
    match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    name VARCHAR(100),
    age INTEGER,
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    onboarding_completed BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    compatibility_score DECIMAL(5, 2),
    common_locations_count INTEGER,
    drink_preferences TEXT[],
    food_preferences TEXT[],
    music_preferences TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.id,
        u.email,
        u.name,
        u.age,
        u.avatar_url,
        u.bio,
        u.location,
        u.location_latitude,
        u.location_longitude,
        u.onboarding_completed,
        u.is_active,
        u.created_at,
        u.updated_at,
        calculate_compatibility_score(p_user_id, u.id) AS compatibility_score,
        (
            SELECT COUNT(DISTINCT lm1.location_id)
            FROM location_matches lm1
            INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
            WHERE lm1.user_id = p_user_id
              AND lm2.user_id = u.id
              AND lm1.status = 'active'
              AND lm2.status = 'active'
        ) AS common_locations_count,
        up.drink_preferences,
        up.food_preferences,
        up.music_preferences
    FROM users u
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE 
        -- Exclude self
        u.id != p_user_id
        -- Only active users with completed onboarding
        AND u.is_active = TRUE
        AND u.onboarding_completed = TRUE
        -- CORE FEATURE: Only users with at least one common location
        AND EXISTS (
            SELECT 1
            FROM location_matches lm1
            INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
            WHERE lm1.user_id = p_user_id
              AND lm2.user_id = u.id
              AND lm1.status = 'active'
              AND lm2.status = 'active'
        )
        -- Exclude users already matched
        AND NOT EXISTS (
            SELECT 1
            FROM people_matches pm
            WHERE (
                (pm.user1_id = p_user_id AND pm.user2_id = u.id) OR
                (pm.user1_id = u.id AND pm.user2_id = p_user_id)
            )
            AND pm.status IN ('mutual', 'pending')
        )
    ORDER BY 
        compatibility_score DESC,
        common_locations_count DESC,
        u.created_at DESC
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_potential_matches(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_compatibility_score(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_potential_matches IS 'Returns potential matches filtered by common locations and ordered by compatibility score (Two-Layer Matching)';
COMMENT ON FUNCTION calculate_compatibility_score IS 'Calculates compatibility score between two users based on preferences and common locations';

-- =============================================
-- 3. CREATE TRIGGER TO UPDATE COMPATIBILITY SCORE
-- =============================================
-- Updates compatibility_score and common_locations_count when preferences or location_matches change

CREATE OR REPLACE FUNCTION update_people_match_compatibility()
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
    other_user_id UUID;
BEGIN
    -- Determine which user was affected
    IF TG_TABLE_NAME = 'location_matches' THEN
        affected_user_id := NEW.user_id;
        
        -- Update all people_matches involving this user
        UPDATE people_matches pm
        SET 
            compatibility_score = calculate_compatibility_score(
                LEAST(pm.user1_id, pm.user2_id),
                GREATEST(pm.user1_id, pm.user2_id)
            ),
            common_locations_count = (
                SELECT COUNT(DISTINCT lm1.location_id)
                FROM location_matches lm1
                INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
                WHERE lm1.user_id = pm.user1_id
                  AND lm2.user_id = pm.user2_id
                  AND lm1.status = 'active'
                  AND lm2.status = 'active'
            ),
            updated_at = NOW()
        WHERE pm.user1_id = affected_user_id OR pm.user2_id = affected_user_id;
        
    ELSIF TG_TABLE_NAME = 'user_preferences' THEN
        affected_user_id := NEW.user_id;
        
        -- Update all people_matches involving this user
        UPDATE people_matches pm
        SET 
            compatibility_score = calculate_compatibility_score(
                LEAST(pm.user1_id, pm.user2_id),
                GREATEST(pm.user1_id, pm.user2_id)
            ),
            updated_at = NOW()
        WHERE pm.user1_id = affected_user_id OR pm.user2_id = affected_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_compatibility_on_location_match ON location_matches;
CREATE TRIGGER update_compatibility_on_location_match
    AFTER INSERT OR UPDATE OR DELETE ON location_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_people_match_compatibility();

DROP TRIGGER IF EXISTS update_compatibility_on_preferences ON user_preferences;
CREATE TRIGGER update_compatibility_on_preferences
    AFTER INSERT OR UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_people_match_compatibility();

-- =============================================
-- 4. CREATE FUNCTION TO HANDLE PEOPLE MATCH INSERT
-- =============================================
-- Handles insertion of people_matches and detects mutual matches
-- This function is called from the application layer, not as a trigger
-- The trigger create_chat_on_mutual_match_trigger handles chat creation

-- Function to create or update a people match
CREATE OR REPLACE FUNCTION create_people_match(
    p_user1_id UUID,
    p_user2_id UUID,
    p_liker_id UUID
)
RETURNS people_matches AS $$
DECLARE
    normalized_user1_id UUID;
    normalized_user2_id UUID;
    existing_match people_matches;
    result_match people_matches;
BEGIN
    -- Normalize user IDs (user1_id < user2_id)
    IF p_user1_id < p_user2_id THEN
        normalized_user1_id := p_user1_id;
        normalized_user2_id := p_user2_id;
    ELSE
        normalized_user1_id := p_user2_id;
        normalized_user2_id := p_user1_id;
    END IF;
    
    -- Check for existing match
    SELECT * INTO existing_match
    FROM people_matches
    WHERE user1_id = normalized_user1_id
      AND user2_id = normalized_user2_id;
    
    IF existing_match IS NOT NULL THEN
        -- Update existing match
        IF existing_match.status = 'pending' THEN
            -- Check if this is a mutual like
            IF (normalized_user1_id = p_liker_id AND existing_match.user2_liked_at IS NOT NULL) OR
               (normalized_user2_id = p_liker_id AND existing_match.user1_liked_at IS NOT NULL) THEN
                -- Mutual match!
                UPDATE people_matches
                SET 
                    status = 'mutual',
                    matched_at = NOW(),
                    user1_liked_at = COALESCE(user1_liked_at, CASE WHEN normalized_user1_id = p_liker_id THEN NOW() ELSE user1_liked_at END),
                    user2_liked_at = COALESCE(user2_liked_at, CASE WHEN normalized_user2_id = p_liker_id THEN NOW() ELSE user2_liked_at END),
                    compatibility_score = calculate_compatibility_score(normalized_user1_id, normalized_user2_id),
                    common_locations_count = (
                        SELECT COUNT(DISTINCT lm1.location_id)
                        FROM location_matches lm1
                        INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
                        WHERE lm1.user_id = normalized_user1_id
                          AND lm2.user_id = normalized_user2_id
                          AND lm1.status = 'active'
                          AND lm2.status = 'active'
                    ),
                    updated_at = NOW()
                WHERE id = existing_match.id
                RETURNING * INTO result_match;
            ELSE
                -- Just update the liked_at timestamp
                UPDATE people_matches
                SET 
                    user1_liked_at = CASE WHEN normalized_user1_id = p_liker_id THEN NOW() ELSE user1_liked_at END,
                    user2_liked_at = CASE WHEN normalized_user2_id = p_liker_id THEN NOW() ELSE user2_liked_at END,
                    updated_at = NOW()
                WHERE id = existing_match.id
                RETURNING * INTO result_match;
            END IF;
        ELSE
            -- Match already exists with different status
            result_match := existing_match;
        END IF;
    ELSE
        -- Create new match
        INSERT INTO people_matches (
            user1_id,
            user2_id,
            user1_liked_at,
            user2_liked_at,
            status,
            compatibility_score,
            common_locations_count
        )
        VALUES (
            normalized_user1_id,
            normalized_user2_id,
            CASE WHEN normalized_user1_id = p_liker_id THEN NOW() ELSE NULL END,
            CASE WHEN normalized_user2_id = p_liker_id THEN NOW() ELSE NULL END,
            'pending',
            calculate_compatibility_score(normalized_user1_id, normalized_user2_id),
            (
                SELECT COUNT(DISTINCT lm1.location_id)
                FROM location_matches lm1
                INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
                WHERE lm1.user_id = normalized_user1_id
                  AND lm2.user_id = normalized_user2_id
                  AND lm1.status = 'active'
                  AND lm2.status = 'active'
            )
        )
        RETURNING * INTO result_match;
    END IF;
    
    RETURN result_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_people_match(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION create_people_match IS 'Creates or updates a people match and detects mutual matches';

-- =============================================
-- 5. NOTE: create_chat_on_mutual_match TRIGGER
-- =============================================
-- The trigger create_chat_on_mutual_match_trigger should be created
-- by the main migration (20250127000000_create_core_tables.sql)
-- If it doesn't exist, it will be created there

