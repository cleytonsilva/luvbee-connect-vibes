-- Migration: Create function to get locations with mutual likes
-- Date: 2025-01-31
-- Description: Creates RPC function to get locations where user has mutual matches
--              Required for RF-03.3: Recomendação Social em Locations

CREATE OR REPLACE FUNCTION get_locations_with_mutual_likes(
  p_user_id UUID
)
RETURNS TABLE (
  location_id UUID,
  mutual_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm1.location_id,
    COUNT(DISTINCT lm2.user_id)::BIGINT AS mutual_count
  FROM location_matches lm1
  INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
  INNER JOIN people_matches pm ON (
    (pm.user1_id = p_user_id AND pm.user2_id = lm2.user_id) OR
    (pm.user1_id = lm2.user_id AND pm.user2_id = p_user_id)
  )
  WHERE 
    lm1.user_id = p_user_id
    AND lm1.status = 'active'
    AND lm2.status = 'active'
    AND lm2.user_id != p_user_id
    AND pm.status = 'mutual'
  GROUP BY lm1.location_id
  HAVING COUNT(DISTINCT lm2.user_id) > 0
  ORDER BY mutual_count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_locations_with_mutual_likes(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_locations_with_mutual_likes IS 'Returns locations where the user has mutual matches with other users who also liked the same location. Used for social recommendations.';

