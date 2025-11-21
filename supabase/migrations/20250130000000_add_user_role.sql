-- Migration: Add role column to users table
-- Date: 2025-01-30
-- Description: Adds role column to users table with default 'user' and sets admin role for cleyton7silva@gmail.com

-- Add role column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' 
        CHECK (role IN ('user', 'admin'));
        
        -- Create index for faster role lookups
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
        
        -- Set admin role for cleyton7silva@gmail.com
        UPDATE public.users 
        SET role = 'admin' 
        WHERE email = 'cleyton7silva@gmail.com';
        
        RAISE NOTICE 'Role column added successfully. Admin role set for cleyton7silva@gmail.com';
    ELSE
        RAISE NOTICE 'Role column already exists';
    END IF;
END $$;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'role';

-- Show admin users
SELECT id, email, name, role, created_at
FROM public.users
WHERE role = 'admin';

