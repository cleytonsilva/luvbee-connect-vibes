-- Add missing location and language columns to users table
-- These columns are required by the EditProfileModal component

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS country text DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS state_province text,
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'pt';
