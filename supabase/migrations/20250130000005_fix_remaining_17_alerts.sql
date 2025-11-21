-- Fix Remaining 17 Supabase Linter Alerts
-- These are the final policies that need optimization and consolidation

-- ============================================================================
-- LOGS TABLE - Fix Auth Call Optimization
-- ============================================================================

DROP POLICY IF EXISTS "logs_admin_read" ON public.logs;

CREATE POLICY "logs_admin_read_optimized" ON public.logs
  FOR SELECT USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- NOTIFICATIONS TABLE - Fix Auth Call Optimization
-- ============================================================================

DROP POLICY IF EXISTS "notifications_own_insert" ON public.notifications;

CREATE POLICY "notifications_own_insert_optimized" ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) OR 
    (select auth.jwt()->>'role') = 'service_role'
  );

-- ============================================================================
-- CACHED_PLACE_PHOTOS TABLE - Fix All Remaining Alerts
-- ============================================================================

-- Drop all old policies
DROP POLICY IF EXISTS "cached_photos_public_read" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_place_photos_read" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_photos_admin_insert" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_photos_admin_update" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_photos_admin_delete" ON public.cached_place_photos;

-- Recreate consolidated and optimized policies
CREATE POLICY "cached_photos_public_read_consolidated" ON public.cached_place_photos
  FOR SELECT USING (true);

CREATE POLICY "cached_photos_admin_insert_optimized" ON public.cached_place_photos
  FOR INSERT WITH CHECK ((select auth.jwt()->>'role') = 'service_role');

CREATE POLICY "cached_photos_admin_update_optimized" ON public.cached_place_photos
  FOR UPDATE USING ((select auth.jwt()->>'role') = 'service_role')
  WITH CHECK ((select auth.jwt()->>'role') = 'service_role');

CREATE POLICY "cached_photos_admin_delete_optimized" ON public.cached_place_photos
  FOR DELETE USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- SEARCH_CACHE_LOGS TABLE - Fix Auth Call Optimization
-- ============================================================================

DROP POLICY IF EXISTS "search_cache_logs_admin_read" ON public.search_cache_logs;

CREATE POLICY "search_cache_logs_admin_read_optimized" ON public.search_cache_logs
  FOR SELECT USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- PROFILES TABLE - Fix Multiple Permissive Policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow signup insert via function" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;

CREATE POLICY "profiles_own_insert_consolidated" ON public.profiles
  FOR INSERT WITH CHECK (
    id = (select auth.uid()) OR
    (select auth.jwt()->>'role') = 'service_role'
  );

-- ============================================================================
-- USERS TABLE - Consolidate Multiple SELECT Policies
-- ============================================================================

DROP POLICY IF EXISTS "users_own_select" ON public.users;
DROP POLICY IF EXISTS "users_own_active_select" ON public.users;

-- Consolidate into single SELECT policy with combined logic
CREATE POLICY "users_own_or_active_select" ON public.users
  FOR SELECT USING (
    id = (select auth.uid()) OR 
    (is_active = true AND onboarding_completed = true)
  );

