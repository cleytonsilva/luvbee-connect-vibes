-- Migration: Add identity and discovery preferences to user_preferences
-- Date: 2025-01-31
-- Description: Adds identity and who_to_see fields to user_preferences table
--              Required for RF-01.1: Preferências de Identidade e Descoberta

-- Add identity column (how the user identifies)
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS identity VARCHAR(50) CHECK (identity IN ('woman_cis', 'man_cis', 'non_binary', 'other'));

-- Add who_to_see column (array of preferences for who they want to see)
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS who_to_see TEXT[] DEFAULT '{}' CHECK (
  array_length(who_to_see, 1) IS NULL OR 
  array_length(who_to_see, 1) >= 1
);

-- Add CHECK constraint to validate who_to_see values
ALTER TABLE public.user_preferences
ADD CONSTRAINT who_to_see_valid_values CHECK (
  array_length(who_to_see, 1) IS NULL OR
  (who_to_see <@ ARRAY['women_cis', 'men_cis', 'lgbtqiapn+', 'all']::TEXT[])
);

-- Create index for faster queries filtering by identity
CREATE INDEX IF NOT EXISTS idx_user_preferences_identity ON public.user_preferences(identity);

-- Create GIN index for faster array queries on who_to_see
CREATE INDEX IF NOT EXISTS idx_user_preferences_who_to_see ON public.user_preferences USING GIN(who_to_see);

-- Add comment
COMMENT ON COLUMN public.user_preferences.identity IS 'How the user identifies: woman_cis, man_cis, non_binary, other';
COMMENT ON COLUMN public.user_preferences.who_to_see IS 'Array of preferences for who the user wants to see: women_cis, men_cis, lgbtqiapn+, all';

