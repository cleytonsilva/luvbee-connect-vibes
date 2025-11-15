-- Fix get_potential_matches function to use correct column names
-- The users table has 'photos' (array) instead of 'avatar_url'
-- The users table has 'location' (JSONB) instead of separate latitude/longitude columns

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
        -- Extract first photo from photos array as avatar_url
        CASE 
            WHEN array_length(u.photos, 1) > 0 THEN u.photos[1]
            ELSE NULL
        END AS avatar_url,
        u.bio,
        -- Extract location string from JSONB
        CASE 
            WHEN u.location IS NOT NULL THEN u.location->>'formatted_address'
            ELSE NULL
        END AS location,
        -- Extract latitude from JSONB location
        CASE 
            WHEN u.location IS NOT NULL AND u.location->>'lat' IS NOT NULL 
            THEN (u.location->>'lat')::DECIMAL(10, 8)
            ELSE NULL
        END AS location_latitude,
        -- Extract longitude from JSONB location
        CASE 
            WHEN u.location IS NOT NULL AND u.location->>'lng' IS NOT NULL 
            THEN (u.location->>'lng')::DECIMAL(11, 8)
            ELSE NULL
        END AS location_longitude,
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

-- Add comment
COMMENT ON FUNCTION get_potential_matches IS 'Returns potential matches filtered by common locations and ordered by compatibility score (Two-Layer Matching). Fixed to use photos array and location JSONB.';

