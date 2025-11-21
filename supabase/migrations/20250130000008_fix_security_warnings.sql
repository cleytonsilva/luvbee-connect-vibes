-- Fix Security Warnings - Function Search Path Mutable
-- Set search_path to empty for all functions to prevent SQL injection

-- ============================================================================
-- Drop functions with signature conflicts
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_excluded_locations(UUID);
DROP FUNCTION IF EXISTS public.get_cached_photo_url(TEXT);
DROP FUNCTION IF EXISTS public.check_search_cache(TEXT, POINT);
DROP FUNCTION IF EXISTS public.find_location_based_matches(UUID, INT);
DROP FUNCTION IF EXISTS public.set_default_venue_preferences(UUID) CASCADE;

-- ============================================================================
-- TRIGGER FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_location_sync_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.last_synced = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cached_place_photos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- UTILITY FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_coordinates(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN lat IS NOT NULL 
    AND lng IS NOT NULL 
    AND lat BETWEEN -90 AND 90 
    AND lng BETWEEN -180 AND 180;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_location_point(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS POINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lat IS NULL OR lng IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN POINT(lng, lat);
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_location_hash(location_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN encode(digest(location_data, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_user_preferences_hash(preferences_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN encode(digest(preferences_data, 'sha256'), 'hex');
END;
$$;

-- ============================================================================
-- DATA MANIPULATION FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_user_photo(
  p_user_id UUID,
  p_photo_url TEXT,
  p_order INT DEFAULT 0
)
RETURNS TABLE (id UUID, user_id UUID, photo_url TEXT, photo_order INT, is_primary BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.user_photos(user_id, photo_url, photo_order)
  VALUES (p_user_id, p_photo_url, p_order)
  RETURNING public.user_photos.id, public.user_photos.user_id, public.user_photos.photo_url, public.user_photos.photo_order, public.user_photos.is_primary;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_old_profile_photos(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.user_photos
  WHERE user_id = p_user_id AND created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- QUERY FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_nearby_locations(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.name, l.lat, l.lng,
    ROUND((6371 * ACOS(COS(RADIANS(90 - p_lat)) * COS(RADIANS(90 - l.lat)) +
    SIN(RADIANS(90 - p_lat)) * SIN(RADIANS(90 - l.lat)) *
    COS(RADIANS(p_lng - l.lng))))::NUMERIC, 2)::DOUBLE PRECISION
  FROM public.locations l
  WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL
    AND ROUND((6371 * ACOS(COS(RADIANS(90 - p_lat)) * COS(RADIANS(90 - l.lat)) +
    SIN(RADIANS(90 - p_lat)) * SIN(RADIANS(90 - l.lat)) *
    COS(RADIANS(p_lng - l.lng))))::NUMERIC, 2) <= p_radius_km
  ORDER BY distance_km;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_places_nearby(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  place_id TEXT,
  name TEXT,
  type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.place_id, l.name, l.type
  FROM public.locations l
  WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL
    AND (6371 * ACOS(COS(RADIANS(90 - p_lat)) * COS(RADIANS(90 - l.lat)) +
    SIN(RADIANS(90 - p_lat)) * SIN(RADIANS(90 - l.lat)) *
    COS(RADIANS(p_lng - l.lng)))) <= p_radius_km
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_places_by_city_state(p_city TEXT, p_state TEXT)
RETURNS TABLE (id UUID, name TEXT, address TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.name, l.address
  FROM public.locations l
  WHERE LOWER(l.city) = LOWER(p_city)
    AND LOWER(l.state) = LOWER(p_state)
  LIMIT 50;
END;
$$;

-- ============================================================================
-- HASH & VALIDATION FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_user_preferences(p_user_id UUID, p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT content_hash INTO v_stored_hash
  FROM public.user_preferences_hashes
  WHERE user_id = p_user_id;
  RETURN v_stored_hash = p_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_preferences(p_preferences JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN p_preferences IS NOT NULL
    AND p_preferences @> '{"drinks": []}'
    AND p_preferences @> '{"foods": []}';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_location_rejection_rate(p_location_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total INT;
  v_rejected INT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.location_views
  WHERE location_id = p_location_id;
  
  IF v_total = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO v_rejected
  FROM public.location_rejections
  WHERE location_id = p_location_id;
  
  RETURN ROUND((v_rejected::NUMERIC / v_total) * 100, 2);
END;
$$;

-- ============================================================================
-- LOGGING FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_preference_save(
  p_user_id UUID,
  p_preferences JSONB,
  p_action TEXT
)
RETURNS TABLE (id UUID, user_id UUID, action TEXT, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.preference_save_logs(user_id, preferences, action)
  VALUES (p_user_id, p_preferences, p_action)
  RETURNING public.preference_save_logs.id, public.preference_save_logs.user_id,
    public.preference_save_logs.action, public.preference_save_logs.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_location_view(
  p_user_id UUID,
  p_location_id UUID,
  p_action TEXT
)
RETURNS TABLE (id UUID, user_id UUID, location_id UUID, action_taken TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.location_views(user_id, location_id, action_taken)
  VALUES (p_user_id, p_location_id, p_action)
  RETURNING public.location_views.id, public.location_views.user_id,
    public.location_views.location_id, public.location_views.action_taken;
END;
$$;

-- ============================================================================
-- MATCH FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_compatibility_score(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN ROUND(RANDOM() * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_people_match(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS TABLE (id UUID, user1_id UUID, user2_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.people_matches(user1_id, user2_id, status)
  VALUES (p_user1_id, p_user2_id, 'pending')
  RETURNING public.people_matches.id, public.people_matches.user1_id,
    public.people_matches.user2_id, public.people_matches.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_people_match_compatibility(
  p_match_id UUID,
  p_score NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.people_matches
  SET compatibility_score = p_score
  WHERE id = p_match_id;
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- NOTIFICATION FUNCTIONS - Update Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_match_mutual(
  p_match_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT user1_id, 'match_mutual', 'Novo Match!', 'Vocês se combinam!'
  FROM public.people_matches WHERE id = p_match_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message(
  p_receiver_id UUID,
  p_sender_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, message)
  VALUES (p_receiver_id, 'new_message', 'Nova Mensagem', 'Você tem uma nova mensagem');
  RETURN FOUND;
END;
$$;
