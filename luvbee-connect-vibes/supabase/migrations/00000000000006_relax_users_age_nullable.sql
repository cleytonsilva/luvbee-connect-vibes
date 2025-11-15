-- Relax users.age NOT NULL constraint if currently enforced

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'age' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN age DROP NOT NULL;
    END IF;
END $$;

-- Verification
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'age';