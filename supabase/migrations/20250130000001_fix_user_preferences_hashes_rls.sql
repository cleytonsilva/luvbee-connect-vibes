-- Fix RLS policies for user_preferences_hashes table
-- The trigger needs to INSERT/UPDATE into this table, so we need policies that allow it

BEGIN;

-- Drop existing policy if it exists (only SELECT)
DROP POLICY IF EXISTS user_preferences_hashes_owner_select ON public.user_preferences_hashes;

-- Create policies for SELECT, INSERT, and UPDATE
-- SELECT: Users can only see their own hashes
CREATE POLICY user_preferences_hashes_owner_select ON public.user_preferences_hashes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Allow inserts when the user_id matches the authenticated user
-- This is needed for the trigger that computes the hash
CREATE POLICY user_preferences_hashes_owner_insert ON public.user_preferences_hashes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow updates when the user_id matches the authenticated user
-- This is needed for the trigger that updates the hash on preference changes
CREATE POLICY user_preferences_hashes_owner_update ON public.user_preferences_hashes 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

