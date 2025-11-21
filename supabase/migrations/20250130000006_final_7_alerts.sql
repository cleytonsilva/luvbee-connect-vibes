-- Fix Final 7 Remaining Alerts
-- The issue: USING clauses with auth.jwt() need to be wrapped in (select ...)
-- But some WITH CHECK clauses still had direct auth calls

-- ============================================================================
-- PROFILES TABLE - Fix consolidated policy
-- ============================================================================

DROP POLICY IF EXISTS "profiles_own_insert_consolidated" ON public.profiles;

CREATE POLICY "profiles_own_insert_consolidated" ON public.profiles
  FOR INSERT WITH CHECK (
    id = (select auth.uid()) OR
    (select auth.jwt()->>'role') = 'service_role'
  );

-- ============================================================================
-- LOGS TABLE - Fix consolidated policy
-- ============================================================================

DROP POLICY IF EXISTS "logs_admin_read_optimized" ON public.logs;

CREATE POLICY "logs_admin_read_optimized" ON public.logs
  FOR SELECT USING ((select (auth.jwt()->>'role')) = 'service_role');

-- ============================================================================
-- NOTIFICATIONS TABLE - Fix consolidated policy
-- ============================================================================

DROP POLICY IF EXISTS "notifications_own_insert_optimized" ON public.notifications;

CREATE POLICY "notifications_own_insert_optimized" ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) OR 
    (select (auth.jwt()->>'role')) = 'service_role'
  );

-- ============================================================================
-- CACHED_PLACE_PHOTOS TABLE - Fix all 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "cached_photos_admin_insert_optimized" ON public.cached_place_photos;

CREATE POLICY "cached_photos_admin_insert_optimized" ON public.cached_place_photos
  FOR INSERT WITH CHECK ((select (auth.jwt()->>'role')) = 'service_role');

DROP POLICY IF EXISTS "cached_photos_admin_update_optimized" ON public.cached_place_photos;

CREATE POLICY "cached_photos_admin_update_optimized" ON public.cached_place_photos
  FOR UPDATE USING ((select (auth.jwt()->>'role')) = 'service_role')
  WITH CHECK ((select (auth.jwt()->>'role')) = 'service_role');

DROP POLICY IF EXISTS "cached_photos_admin_delete_optimized" ON public.cached_place_photos;

CREATE POLICY "cached_photos_admin_delete_optimized" ON public.cached_place_photos
  FOR DELETE USING ((select (auth.jwt()->>'role')) = 'service_role');

-- ============================================================================
-- SEARCH_CACHE_LOGS TABLE - Fix consolidated policy
-- ============================================================================

DROP POLICY IF EXISTS "search_cache_logs_admin_read_optimized" ON public.search_cache_logs;

CREATE POLICY "search_cache_logs_admin_read_optimized" ON public.search_cache_logs
  FOR SELECT USING ((select (auth.jwt()->>'role')) = 'service_role');

