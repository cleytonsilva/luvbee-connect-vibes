-- Align user_preferences table columns with application expectations
-- Adds drink_preferences, food_preferences, music_preferences (TEXT[]), vibe_preferences (JSONB)
-- Backfills data from legacy JSONB columns (drinks, foods) when present

BEGIN;

-- Ensure required columns exist with correct types and defaults
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS drink_preferences TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS food_preferences TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS music_preferences TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS vibe_preferences JSONB;

-- Backfill from legacy JSONB arrays if present
-- Convert JSONB array -> TEXT[] using jsonb_array_elements_text
UPDATE public.user_preferences up
SET drink_preferences = (
  CASE WHEN up.drinks IS NOT NULL THEN
    (SELECT ARRAY(SELECT jsonb_array_elements_text(up.drinks)))
  ELSE up.drink_preferences
  END
)
WHERE up.drinks IS NOT NULL;

UPDATE public.user_preferences up
SET food_preferences = (
  CASE WHEN up.foods IS NOT NULL THEN
    (SELECT ARRAY(SELECT jsonb_array_elements_text(up.foods)))
  ELSE up.food_preferences
  END
)
WHERE up.foods IS NOT NULL;

-- We do NOT auto-map legacy `interests` to `music_preferences` to avoid semantic mismatch.
-- If a migration path is desired later, handle explicitly.

-- Create indexes to optimize array containment queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_drink_preferences
  ON public.user_preferences USING GIN (drink_preferences);

CREATE INDEX IF NOT EXISTS idx_user_preferences_food_preferences
  ON public.user_preferences USING GIN (food_preferences);

CREATE INDEX IF NOT EXISTS idx_user_preferences_music_preferences
  ON public.user_preferences USING GIN (music_preferences);

COMMIT;

-- Try to trigger PostgREST schema cache reload safely (ignore errors if not permitted)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- Fallback: best-effort config reload
  PERFORM pg_reload_conf();
END;
$$;