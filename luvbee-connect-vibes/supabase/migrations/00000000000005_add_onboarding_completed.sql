-- Add onboarding_completed column to public.users if missing
-- Ensures compatibility with app code expecting this field

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'onboarding_completed'
        ) THEN
            ALTER TABLE public.users 
            ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

            -- Initialize existing rows
            UPDATE public.users 
            SET onboarding_completed = COALESCE(onboarding_completed, FALSE);
        END IF;
    END IF;
END $$;

-- Verification: show users columns and sample value
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Optional check of one row (will return 0 rows if empty table)
SELECT id, email, onboarding_completed
FROM public.users
LIMIT 5;