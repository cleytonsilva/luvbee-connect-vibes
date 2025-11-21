-- Migration: Fix user preferences columns conflict between NOT NULL and validation trigger
-- Date: 2025-11-20
-- Description: Resolves conflict between NOT NULL constraint and validation trigger that prevents empty arrays
--              Makes columns nullable and normalizes existing empty arrays to NULL

BEGIN;

-- Step 1: Make columns nullable to allow NULL values (which are valid per trigger)
ALTER TABLE public.user_preferences
  ALTER COLUMN drink_preferences DROP NOT NULL;

ALTER TABLE public.user_preferences
  ALTER COLUMN food_preferences DROP NOT NULL;

ALTER TABLE public.user_preferences
  ALTER COLUMN music_preferences DROP NOT NULL;

-- Step 2: Normalize existing empty arrays to NULL to comply with trigger validation
UPDATE public.user_preferences
SET drink_preferences = NULL
WHERE drink_preferences IS NOT NULL AND array_length(drink_preferences, 1) IS NULL;

UPDATE public.user_preferences
SET food_preferences = NULL
WHERE food_preferences IS NOT NULL AND array_length(food_preferences, 1) IS NULL;

UPDATE public.user_preferences
SET music_preferences = NULL
WHERE music_preferences IS NOT NULL AND array_length(music_preferences, 1) IS NULL;

-- Step 3: Backfill from legacy JSONB columns if they exist and have data
-- Only convert non-empty arrays to comply with trigger validation
DO $$
BEGIN
  -- Check if legacy columns exist and backfill accordingly
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_preferences' AND column_name = 'drinks') THEN
    UPDATE public.user_preferences up
    SET drink_preferences = (
      CASE 
        WHEN up.drinks IS NOT NULL AND jsonb_array_length(up.drinks) > 0 THEN
          (SELECT ARRAY(SELECT jsonb_array_elements_text(up.drinks)))
        ELSE NULL
      END
    )
    WHERE up.drinks IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_preferences' AND column_name = 'foods') THEN
    UPDATE public.user_preferences up
    SET food_preferences = (
      CASE 
        WHEN up.foods IS NOT NULL AND jsonb_array_length(up.foods) > 0 THEN
          (SELECT ARRAY(SELECT jsonb_array_elements_text(up.foods)))
        ELSE NULL
      END
    )
    WHERE up.foods IS NOT NULL;
  END IF;
END $$;

-- Step 4: Add vibe_preferences column if it doesn't exist
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS vibe_preferences JSONB;

-- Step 5: Create or replace indexes to optimize array containment queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_drink_preferences
  ON public.user_preferences USING GIN (drink_preferences);

CREATE INDEX IF NOT EXISTS idx_user_preferences_food_preferences
  ON public.user_preferences USING GIN (food_preferences);

CREATE INDEX IF NOT EXISTS idx_user_preferences_music_preferences
  ON public.user_preferences USING GIN (music_preferences);

-- Step 6: Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT SELECT ON public.user_preferences TO anon;

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