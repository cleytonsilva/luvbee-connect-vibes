-- Migration: Fix get_places_nearby remaining column errors
-- Date: 2025-02-19
-- Description: Removes references to non-existent columns: owner_id, is_active, is_verified, is_curated
--              Renames last_synced_at to last_synced
--              Fixes error: column l.owner_id does not exist

DROP FUNCTION IF EXISTS get_places_nearby(double precision, double precision, int, boolean, text[], text[], text[]) CASCADE;
DROP FUNCTION IF EXISTS get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) CASCADE;

CREATE OR REPLACE FUNCTION get_places_nearby(
  lat DECIMAL(10, 8),
  long DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 5000,
  filter_adult BOOLEAN DEFAULT FALSE,
  drink_preferences TEXT[] DEFAULT NULL,
  food_preferences TEXT[] DEFAULT NULL,
  music_preferences TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name VARCHAR(200),
  type VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  description TEXT,
  rating DECIMAL(3, 2),
  price_level INTEGER,
  google_place_data JSONB,
  -- owner_id UUID, -- REMOVED: Column does not exist
  -- is_active BOOLEAN, -- REMOVED: Column does not exist
  -- is_verified BOOLEAN, -- REMOVED: Column does not exist
  -- is_curated BOOLEAN, -- REMOVED: Column does not exist
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ, -- Keeping alias in return table for compatibility if possible, or mapping from last_synced
  distance_meters DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.google_place_id,
    l.name,
    l.type,
    l.address,
    l.latitude,
    l.longitude,
    l.image_url,
    l.description,
    l.rating,
    l.price_level,
    l.google_place_data,
    -- l.owner_id, -- REMOVED
    -- l.is_active, -- REMOVED
    -- l.is_verified, -- REMOVED
    -- l.is_curated, -- REMOVED
    l.created_at,
    l.updated_at,
    l.last_synced AS last_synced_at, -- MAPPED: last_synced -> last_synced_at
    -- Haversine formula to calculate distance in meters
    (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(long)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    )::DECIMAL(10, 2) AS distance_meters
  FROM public.locations l
  WHERE 
    -- l.is_active = TRUE -- REMOVED: Column does not exist
    l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    -- Pre-filter using bounding box for performance
    AND l.latitude BETWEEN lat - (radius_meters::DECIMAL / 111000.0) AND lat + (radius_meters::DECIMAL / 111000.0)
    AND l.longitude BETWEEN long - (radius_meters::DECIMAL / (111000.0 * cos(radians(lat)))) AND long + (radius_meters::DECIMAL / (111000.0 * cos(radians(lat))))
    -- Exact distance check using Haversine
    AND (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(long)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    ) <= radius_meters
    -- Filter by adult content if specified
    AND (filter_adult IS FALSE OR l.is_adult = filter_adult OR l.is_adult IS NULL)
    -- Filter by preferences if provided
    AND (
      drink_preferences IS NULL OR 
      array_length(drink_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(drink_preferences) AS pref
        WHERE 
          l.type ILIKE '%' || pref || '%' OR
          (l.google_place_data IS NOT NULL AND (
            l.google_place_data::text ILIKE '%' || pref || '%' OR
            (l.google_place_data->'types')::text ILIKE '%' || pref || '%'
          ))
      )
    )
    AND (
      food_preferences IS NULL OR 
      array_length(food_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(food_preferences) AS pref
        WHERE 
          l.type ILIKE '%' || pref || '%' OR
          (l.google_place_data IS NOT NULL AND (
            l.google_place_data::text ILIKE '%' || pref || '%' OR
            (l.google_place_data->'types')::text ILIKE '%' || pref || '%'
          ))
      )
    )
    AND (
      music_preferences IS NULL OR 
      array_length(music_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(music_preferences) AS pref
        WHERE 
          l.type ILIKE '%' || pref || '%' OR
          (l.google_place_data IS NOT NULL AND (
            l.google_place_data::text ILIKE '%' || pref || '%' OR
            (l.google_place_data->'types')::text ILIKE '%' || pref || '%'
          ))
      )
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) TO anon;

COMMENT ON FUNCTION get_places_nearby IS 'Returns locations within a radius filtered by user preferences. Fixed missing columns (owner_id, is_active, etc).';
