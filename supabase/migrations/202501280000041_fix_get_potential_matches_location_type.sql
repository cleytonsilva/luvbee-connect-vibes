-- Fix get_potential_matches function - Final corrections
-- Date: 2025-01-28
-- Description: Fixes all type mismatches in get_potential_matches function
-- Changes:
--   1. location: VARCHAR(100) -> TEXT
--   2. email, name: VARCHAR -> TEXT (for consistency)
--   3. common_locations_count: INTEGER -> BIGINT (COUNT returns BIGINT)

DROP FUNCTION IF EXISTS get_potential_matches(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION get_potential_matches(
    p_user_id UUID,
    match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    age INTEGER,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    onboarding_completed BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    compatibility_score DECIMAL(5, 2),
    common_locations_count BIGINT,
    drink_preferences TEXT[],
    food_preferences TEXT[],
    music_preferences TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.id,
        u.email::TEXT,
        u.name::TEXT,
        u.age,
        -- Extract first photo from photos array as avatar_url
        CASE 
            WHEN array_length(u.photos, 1) > 0 THEN u.photos[1]
            ELSE NULL
        END AS avatar_url,
        u.bio,
        -- Extract location string from JSONB (handle NULL properly)
        CASE 
            WHEN u.location IS NOT NULL AND u.location ? 'formatted_address' THEN 
                (u.location->>'formatted_address')::TEXT
            WHEN u.location IS NOT NULL AND u.location ? 'address' THEN 
                (u.location->>'address')::TEXT
            ELSE NULL
        END AS location,
        -- Extract latitude from JSONB location
        CASE 
            WHEN u.location IS NOT NULL AND u.location ? 'lat' THEN 
                (u.location->>'lat')::DECIMAL(10, 8)
            WHEN u.location IS NOT NULL AND u.location ? 'latitude' THEN 
                (u.location->>'latitude')::DECIMAL(10, 8)
            ELSE NULL
        END AS location_latitude,
        -- Extract longitude from JSONB location
        CASE 
            WHEN u.location IS NOT NULL AND u.location ? 'lng' THEN 
                (u.location->>'lng')::DECIMAL(11, 8)
            WHEN u.location IS NOT NULL AND u.location ? 'longitude' THEN 
                (u.location->>'longitude')::DECIMAL(11, 8)
            ELSE NULL
        END AS location_longitude,
        u.onboarding_completed,
        u.is_active,
        u.created_at,
        u.updated_at,
        calculate_compatibility_score(p_user_id, u.id) AS compatibility_score,
        (
            SELECT COUNT(DISTINCT lm1.location_id)::BIGINT
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_potential_matches(UUID, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_potential_matches IS 'Returns potential matches filtered by common locations and ordered by compatibility score (Two-Layer Matching). Fixed all type mismatches: location, email, name to TEXT, common_locations_count to BIGINT.';
