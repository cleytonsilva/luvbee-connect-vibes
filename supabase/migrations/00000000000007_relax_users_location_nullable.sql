-- Relax users.location NOT NULL constraint if present
-- Purpose: Allow creating user profiles without location data
-- Safe/idempotent: Checks current column nullability before altering

DO $$
BEGIN
  -- Ensure column exists and is currently NOT NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'location'
      AND is_nullable = 'NO'
  ) THEN
    -- Drop NOT NULL to make location optional
    ALTER TABLE public.users
      ALTER COLUMN location DROP NOT NULL;
  END IF;
END $$;

-- Optional: confirm current definition
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='users' AND column_name='location';