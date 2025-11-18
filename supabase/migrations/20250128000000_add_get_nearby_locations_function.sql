-- Migration: Add get_nearby_locations RPC function
-- Date: 2025-01-28
-- Description: Creates RPC function to find locations within a radius using latitude/longitude

-- Function: Get nearby locations within a radius
-- Uses Haversine formula to calculate distance between two points on Earth
CREATE OR REPLACE FUNCTION get_nearby_locations(
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name VARCHAR(200),
  category VARCHAR(50),
  type VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  images TEXT[],
  photo_url TEXT,
  description TEXT,
  phone VARCHAR(20),
  website TEXT,
  rating DECIMAL(3, 2),
  price_level INTEGER,
  opening_hours JSONB,
  google_places_data JSONB,
  owner_id UUID,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  is_curated BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  distance_meters DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.google_place_id,
    l.name,
    l.category,
    l.type,
    l.address,
    l.latitude,
    l.longitude,
    l.images,
    l.photo_url,
    l.description,
    l.phone,
    l.website,
    l.rating,
    l.price_level,
    l.opening_hours,
    l.google_places_data,
    l.owner_id,
    l.is_active,
    l.is_verified,
    l.is_curated,
    l.created_at,
    l.updated_at,
    l.last_synced_at,
    -- Haversine formula to calculate distance in meters
    (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(lng)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    )::DECIMAL(10, 2) AS distance_meters
  FROM public.locations l
  WHERE 
    l.is_active = TRUE
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    -- Pre-filter using bounding box for performance
    AND l.latitude BETWEEN lat - (radius_meters::DECIMAL / 111000.0) AND lat + (radius_meters::DECIMAL / 111000.0)
    AND l.longitude BETWEEN lng - (radius_meters::DECIMAL / (111000.0 * cos(radians(lat)))) AND lng + (radius_meters::DECIMAL / (111000.0 * cos(radians(lat))))
    -- Exact distance check using Haversine
    AND (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(lng)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    ) <= radius_meters
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_nearby_locations IS 'Returns locations within a specified radius (in meters) from a given latitude/longitude point. Uses Haversine formula for accurate distance calculation.';

