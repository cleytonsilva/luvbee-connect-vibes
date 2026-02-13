-- Migration: Add fields for comments sentiment and profile completeness

-- 1. Add sentiment to place_comments
-- Sentimentos: 'positive' (Gostei/Positivo), 'negative' (Não gostei/Negativo), 'neutral' (Neutro/Comentário)
ALTER TABLE public.place_comments 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));

-- 2. Ensure users table has occupation column (User reported profile save errors)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS occupation TEXT;

-- 3. Ensure users table has location column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS location JSONB;

-- 4. Ensure preferences column exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
