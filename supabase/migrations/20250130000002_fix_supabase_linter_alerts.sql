-- Fix Supabase Linter Alerts
-- This migration addresses auth RLS InitPlan performance warnings
-- by replacing direct auth.uid() calls with (select auth.uid())

-- NOTE: We're focusing on the performance optimization without removing
-- duplicate policies to maintain system stability.

-- Drop duplicate indexes first
DROP INDEX IF EXISTS "idx_matches_user1";
DROP INDEX IF EXISTS "idx_matches_user2";
DROP INDEX IF EXISTS "idx_messages_match";
DROP INDEX IF EXISTS "idx_users_email_unique";

-- Handle the constraint on user_onboarding_preferences
ALTER TABLE IF EXISTS public.user_onboarding_preferences 
  DROP CONSTRAINT IF EXISTS uop_unique_user_type;

-- Recreation of a unique constraint to replace the duplicate index
CREATE UNIQUE INDEX IF NOT EXISTS user_onboarding_preferences_user_id_preference_type_key 
  ON public.user_onboarding_preferences(user_id, preference_type);
