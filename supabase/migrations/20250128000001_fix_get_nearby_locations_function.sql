-- Migration: Fix get_nearby_locations function for current table structure
-- Date: 2025-01-28
-- Description: Updates the function to work with current locations table structure

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_nearby_locations(DECIMAL, DECIMAL, INTEGER);

-- Function: Get nearby locations within a radius
-- Updated to work with current table structure (location POINT instead of lat/lng)
CREATE OR REPLACE FUNCTION get_nearby_locations(
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(200),
  category VARCHAR(50),
  address TEXT,
  location POINT,
  images TEXT[],
  photo_url TEXT,
  description TEXT,
  phone VARCHAR(20),
  website TEXT,
  rating DECIMAL(3, 2),
  price_level INTEGER,
  opening_hours JSONB,
  owner_id UUID,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.category,
    l.address,
    l.location,
    l.images,
    l.photo_url,
    l.description,
    l.phone,
    l.website,
    l.rating,
    l.price_level,
    l.opening_hours,
    l.owner_id,
    l.is_active,
    l.is_verified,
    l.created_at,
    l.updated_at,
    -- Calculate distance using PostGIS (if location is POINT)
    CASE 
      WHEN l.location IS NOT NULL THEN
        (ST_DistanceSphere(
          ST_MakePoint(lng, lat),
          ST_MakePoint(ST_X(l.location::geometry), ST_Y(l.location::geometry))
        ))::DECIMAL(10, 2)
      ELSE 
        0::DECIMAL(10, 2)
    END AS distance_meters
  FROM public.locations l
  WHERE 
    l.is_active = TRUE
    AND l.location IS NOT NULL
    -- Filter by distance using PostGIS
    AND (
      ST_DistanceSphere(
        ST_MakePoint(lng, lat),
        ST_MakePoint(ST_X(l.location::geometry), ST_Y(l.location::geometry))
      )
    ) <= radius_meters
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_nearby_locations IS 'Returns locations within a specified radius (in meters) from a given latitude/longitude point. Uses PostGIS for distance calculation.';