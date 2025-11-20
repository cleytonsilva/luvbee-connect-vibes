-- Migration: Fix get_places_nearby ambiguous column reference
-- Date: 2025-02-19
-- Description: Renames parameters lat/long to p_lat/p_long to avoid ambiguity with table columns
--              Fixes error: column reference "lat" is ambiguous

DROP FUNCTION IF EXISTS get_places_nearby(double precision, double precision, int, boolean, text[], text[], text[]) CASCADE;
DROP FUNCTION IF EXISTS get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) CASCADE;

CREATE OR REPLACE FUNCTION get_places_nearby(
  p_lat DECIMAL(10, 8),
  p_long DECIMAL(11, 8),
  p_radius_meters INTEGER DEFAULT 5000,
  p_filter_adult BOOLEAN DEFAULT FALSE,
  p_drink_preferences TEXT[] DEFAULT NULL,
  p_food_preferences TEXT[] DEFAULT NULL,
  p_music_preferences TEXT[] DEFAULT NULL
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
    l.type,
    l.address,
    l.latitude,
    l.longitude,
    l.image_url,
    l.description,
    l.rating,
    l.price_level,
    l.google_place_data,
    l.created_at,
    l.updated_at,
    l.last_synced AS last_synced_at,
    (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(p_lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(p_long)) + 
          sin(radians(p_lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    )::DECIMAL(10, 2) AS distance_meters
  FROM public.locations l
  WHERE 
    l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    AND l.latitude BETWEEN p_lat - (p_radius_meters::DECIMAL / 111000.0) AND p_lat + (p_radius_meters::DECIMAL / 111000.0)
    AND l.longitude BETWEEN p_long - (p_radius_meters::DECIMAL / (111000.0 * cos(radians(p_lat)))) AND p_long + (p_radius_meters::DECIMAL / (111000.0 * cos(radians(p_lat))))
    AND (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(p_lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(p_long)) + 
          sin(radians(p_lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    ) <= p_radius_meters
    AND (p_filter_adult IS FALSE OR l.is_adult = p_filter_adult OR l.is_adult IS NULL)
    AND (
      p_drink_preferences IS NULL OR 
      array_length(p_drink_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(p_drink_preferences) AS pref
        WHERE 
          l.type ILIKE '%' || pref || '%' OR
          (l.google_place_data IS NOT NULL AND (
            l.google_place_data::text ILIKE '%' || pref || '%' OR
            (l.google_place_data->'types')::text ILIKE '%' || pref || '%'
          ))
      )
    )
    AND (
      p_food_preferences IS NULL OR 
      array_length(p_food_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(p_food_preferences) AS pref
        WHERE 
          l.type ILIKE '%' || pref || '%' OR
          (l.google_place_data IS NOT NULL AND (
            l.google_place_data::text ILIKE '%' || pref || '%' OR
            (l.google_place_data->'types')::text ILIKE '%' || pref || '%'
          ))
      )
    )
    AND (
      p_music_preferences IS NULL OR 
      array_length(p_music_preferences, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(p_music_preferences) AS pref
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

GRANT EXECUTE ON FUNCTION get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) TO anon;
