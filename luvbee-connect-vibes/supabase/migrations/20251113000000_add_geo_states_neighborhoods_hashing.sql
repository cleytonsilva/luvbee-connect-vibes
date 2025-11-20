-- Migration: Add Brazilian states, neighborhoods and hashing for deduplication
-- Date: 2025-11-13

-- Extensions are expected to be present from previous migrations: uuid-ossp, postgis, pgcrypto

-- =============================================
-- 1. NEW TABLES: br_states, neighborhoods
-- =============================================

CREATE TABLE IF NOT EXISTS public.br_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('Norte','Nordeste','Centro-Oeste','Sudeste','Sul')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_br_states_ibge ON public.br_states(ibge_code);
CREATE INDEX IF NOT EXISTS idx_br_states_region ON public.br_states(region);

CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.br_states(id) ON DELETE CASCADE,
  ibge_code TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_state_name ON public.neighborhoods(state_id, name);

-- =============================================
-- 2. HASH TABLES FOR DEDUPLICATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.location_hashes (
  location_id UUID UNIQUE NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  content_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_preferences_hashes (
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 3. FUNCTIONS: Coordinate validation and hashing
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_coordinates(lat DECIMAL, lng DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  IF lat IS NULL OR lng IS NULL THEN
    RETURN FALSE;
  END IF;
  IF lat < -90 OR lat > 90 THEN
    RETURN FALSE;
  END IF;
  IF lng < -180 OR lng > 180 THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.compute_location_hash()
RETURNS TRIGGER AS $$
DECLARE
  normalized_name TEXT;
  normalized_address TEXT;
  norm_lat DECIMAL(10,6);
  norm_lng DECIMAL(11,6);
  normalized_type TEXT;
  normalized_category TEXT;
  raw TEXT;
  h TEXT;
BEGIN
  normalized_name := lower(coalesce(NEW.name, ''));
  normalized_address := lower(coalesce(NEW.address, ''));
  norm_lat := ROUND(coalesce(NEW.latitude, NEW.lat)::DECIMAL, 6);
  norm_lng := ROUND(coalesce(NEW.longitude, NEW.lng)::DECIMAL, 6);
  normalized_type := lower(coalesce(NEW.type, ''));
  normalized_category := lower(coalesce(NEW.category, ''));
  raw := concat_ws('|', normalized_name, normalized_address, norm_lat::TEXT, norm_lng::TEXT, normalized_type, normalized_category);
  h := encode(digest(raw, 'sha256'), 'hex');

  INSERT INTO public.location_hashes(location_id, content_hash)
  VALUES (NEW.id, h)
  ON CONFLICT (location_id) DO UPDATE SET content_hash = EXCLUDED.content_hash;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.compute_user_preferences_hash()
RETURNS TRIGGER AS $$
DECLARE
  drinks TEXT;
  food TEXT;
  music TEXT;
  raw TEXT;
  h TEXT;
BEGIN
  SELECT string_agg(d, ',' ORDER BY d) INTO drinks FROM unnest(coalesce(NEW.drink_preferences, '{}')) AS d;
  SELECT string_agg(f, ',' ORDER BY f) INTO food   FROM unnest(coalesce(NEW.food_preferences, '{}'))  AS f;
  SELECT string_agg(m, ',' ORDER BY m) INTO music  FROM unnest(coalesce(NEW.music_preferences, '{}')) AS m;
  raw := concat_ws('|', coalesce(drinks,''), coalesce(food,''), coalesce(music,''), coalesce(NEW.vibe_preferences::TEXT,''));
  h := encode(digest(raw, 'sha256'), 'hex');

  INSERT INTO public.user_preferences_hashes(user_id, content_hash)
  VALUES (NEW.user_id, h)
  ON CONFLICT (user_id) DO UPDATE SET content_hash = EXCLUDED.content_hash;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.normalize_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF validate_coordinates(coalesce(NEW.latitude, NEW.lat), coalesce(NEW.longitude, NEW.lng)) THEN
    NEW.location := point(coalesce(NEW.longitude, NEW.lng), coalesce(NEW.latitude, NEW.lat));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS trg_locations_normalize_point ON public.locations;
CREATE TRIGGER trg_locations_normalize_point
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_point();

DROP TRIGGER IF EXISTS trg_locations_hash ON public.locations;
CREATE TRIGGER trg_locations_hash
AFTER INSERT OR UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.compute_location_hash();

DROP TRIGGER IF EXISTS trg_user_preferences_hash ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_hash
AFTER INSERT OR UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.compute_user_preferences_hash();

-- =============================================
-- 5. VIEW: locations_view (compat layer)
-- =============================================

CREATE OR REPLACE VIEW public.locations_view AS
SELECT 
  l.id,
  l.google_place_id AS place_id,
  l.name,
  l.category,
  l.type,
  l.address,
  l.latitude AS lat,
  l.longitude AS lng,
  l.images,
  l.photo_url AS image_url,
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
  l.updated_at
FROM public.locations l;

-- =============================================
-- 6. RLS Policies
-- =============================================

ALTER TABLE public.br_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY br_states_public_select ON public.br_states FOR SELECT USING (true);
CREATE POLICY neighborhoods_public_select ON public.neighborhoods FOR SELECT USING (true);
CREATE POLICY location_hashes_owner_select ON public.location_hashes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.locations WHERE locations.id = location_hashes.location_id)
);
CREATE POLICY user_preferences_hashes_owner_select ON public.user_preferences_hashes FOR SELECT USING (
  auth.uid() = user_id
);

-- =============================================
-- 7. Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_location_hashes_hash ON public.location_hashes(content_hash);
CREATE INDEX IF NOT EXISTS idx_user_preferences_hashes_hash ON public.user_preferences_hashes(content_hash);

-- =============================================
-- 8. Grants
-- =============================================

GRANT SELECT ON public.br_states TO anon;
GRANT SELECT ON public.neighborhoods TO anon;
GRANT SELECT, INSERT, UPDATE ON public.location_hashes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences_hashes TO authenticated;

