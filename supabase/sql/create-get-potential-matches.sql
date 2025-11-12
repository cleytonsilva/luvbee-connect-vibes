-- Create get_potential_matches function for matching users
-- This function returns potential matches for a user based on preferences and location

CREATE OR REPLACE FUNCTION get_potential_matches(
  user_id UUID,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  name VARCHAR(255),
  age INTEGER,
  avatar_url TEXT,
  bio TEXT,
  location JSONB,
  preferences JSONB,
  onboarding_completed BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  compatibility_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.age,
    u.avatar_url,
    u.bio,
    u.location,
    u.preferences,
    u.onboarding_completed,
    u.is_active,
    u.created_at,
    u.updated_at,
    -- Simple compatibility score based on common preferences
    CASE 
      WHEN u.age IS NOT NULL AND up.age_preference IS NOT NULL THEN
        CASE 
          WHEN u.age BETWEEN (up.age_preference->>'min')::INTEGER AND (up.age_preference->>'max')::INTEGER THEN 30
          ELSE 0
        END
      ELSE 20
    END +
    CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 50 THEN 20 ELSE 10 END +
    CASE WHEN u.avatar_url IS NOT NULL THEN 25 ELSE 0 END +
    CASE WHEN u.location IS NOT NULL THEN 25 ELSE 0 END AS compatibility_score
  FROM public.users u
  LEFT JOIN public.user_preferences up ON up.user_id = user_id
  WHERE 
    u.id != user_id
    AND u.is_active = TRUE
    AND u.onboarding_completed = TRUE
    -- Exclude users that are already matched or blocked
    AND u.id NOT IN (
      SELECT matched_user_id 
      FROM public.matches 
      WHERE user_id = get_potential_matches.user_id
      UNION
      SELECT user_id 
      FROM public.matches 
      WHERE matched_user_id = get_potential_matches.user_id
      UNION
      SELECT blocked_user_id 
      FROM public.blocked_users 
      WHERE user_id = get_potential_matches.user_id
    )
  ORDER BY compatibility_score DESC, u.created_at DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_potential_matches(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_potential_matches(UUID, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_potential_matches IS 'Returns potential matches for a user based on preferences and compatibility score';