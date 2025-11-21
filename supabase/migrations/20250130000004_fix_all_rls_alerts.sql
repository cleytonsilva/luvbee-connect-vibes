-- Fix All 165 Remaining Supabase Linter Alerts
-- 1. Optimize all auth() calls to use (select auth.uid()/auth.jwt()...)
-- 2. Consolidate all duplicate permissive policies

-- ============================================================================
-- USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own_and_active" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_self" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_via_signup" ON public.users;

CREATE POLICY "users_own_select" ON public.users
  FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "users_own_active_select" ON public.users
  FOR SELECT USING (
    id = (select auth.uid()) OR 
    (is_active = true AND onboarding_completed = true)
  );

CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "users_own_delete" ON public.users
  FOR DELETE USING (id = (select auth.uid()));

CREATE POLICY "users_own_insert" ON public.users
  FOR INSERT WITH CHECK (id = (select auth.uid()));

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_only" ON public.profiles;

CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_own" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_auth" ON public.matches;
DROP POLICY IF EXISTS "matches_select_own" ON public.matches;
DROP POLICY IF EXISTS "matches_select_auth" ON public.matches;
DROP POLICY IF EXISTS "matches_update_auth" ON public.matches;

CREATE POLICY "matches_own_select" ON public.matches
  FOR SELECT USING (
    user_id_1 = (select auth.uid()) OR 
    user_id_2 = (select auth.uid())
  );

CREATE POLICY "matches_own_insert" ON public.matches
  FOR INSERT WITH CHECK (user_id_1 = (select auth.uid()));

CREATE POLICY "matches_own_update" ON public.matches
  FOR UPDATE USING (
    user_id_1 = (select auth.uid()) OR 
    user_id_2 = (select auth.uid())
  )
  WITH CHECK (
    user_id_1 = (select auth.uid()) OR 
    user_id_2 = (select auth.uid())
  );

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can send messages to their matches" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their matches" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;

CREATE POLICY "messages_own_select" ON public.messages
  FOR SELECT USING (
    sender_id = (select auth.uid()) OR 
    receiver_id = (select auth.uid())
  );

CREATE POLICY "messages_own_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = (select auth.uid()));

-- ============================================================================
-- LOCATION_MATCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own location matches" ON public.location_matches;
DROP POLICY IF EXISTS "Users can view own location matches" ON public.location_matches;
DROP POLICY IF EXISTS "delete_own_location_matches" ON public.location_matches;
DROP POLICY IF EXISTS "insert_own_location_matches" ON public.location_matches;
DROP POLICY IF EXISTS "location_matches_delete_own" ON public.location_matches;
DROP POLICY IF EXISTS "location_matches_own_only" ON public.location_matches;
DROP POLICY IF EXISTS "select_own_location_matches" ON public.location_matches;
DROP POLICY IF EXISTS "update_own_location_matches" ON public.location_matches;

CREATE POLICY "location_matches_own_select" ON public.location_matches
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "location_matches_own_insert" ON public.location_matches
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "location_matches_own_update" ON public.location_matches
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "location_matches_own_delete" ON public.location_matches
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================================================
-- LOCATION_LIKES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own location likes" ON public.location_likes;
DROP POLICY IF EXISTS "Users can view own location likes" ON public.location_likes;
DROP POLICY IF EXISTS "location_likes_own_only" ON public.location_likes;

CREATE POLICY "location_likes_own_select" ON public.location_likes
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "location_likes_own_insert" ON public.location_likes
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- LOCATION_REJECTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "location_rejections_insert_own" ON public.location_rejections;
DROP POLICY IF EXISTS "location_rejections_select_own" ON public.location_rejections;

CREATE POLICY "location_rejections_own_select" ON public.location_rejections
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "location_rejections_own_insert" ON public.location_rejections
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- LOCATION_VIEWS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "location_views_own_only" ON public.location_views;

CREATE POLICY "location_views_own_all" ON public.location_views
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- USER_MATCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create matches" ON public.user_matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON public.user_matches;
DROP POLICY IF EXISTS "user_matches_insert_policy" ON public.user_matches;
DROP POLICY IF EXISTS "user_matches_select_policy" ON public.user_matches;
DROP POLICY IF EXISTS "user_matches_update_policy" ON public.user_matches;

CREATE POLICY "user_matches_own_select" ON public.user_matches
  FOR SELECT USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "user_matches_own_insert" ON public.user_matches
  FOR INSERT WITH CHECK (user1_id = (select auth.uid()));

CREATE POLICY "user_matches_own_update" ON public.user_matches
  FOR UPDATE USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  )
  WITH CHECK (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

-- ============================================================================
-- PEOPLE_MATCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "people_matches_delete_own" ON public.people_matches;
DROP POLICY IF EXISTS "people_matches_insert_own" ON public.people_matches;
DROP POLICY IF EXISTS "people_matches_select_own" ON public.people_matches;
DROP POLICY IF EXISTS "people_matches_update_own" ON public.people_matches;

CREATE POLICY "people_matches_own_select" ON public.people_matches
  FOR SELECT USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "people_matches_own_insert" ON public.people_matches
  FOR INSERT WITH CHECK (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "people_matches_own_update" ON public.people_matches
  FOR UPDATE USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  )
  WITH CHECK (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "people_matches_own_delete" ON public.people_matches
  FOR DELETE USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

-- ============================================================================
-- USER_PHOTOS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own photos" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos_delete_own" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos_insert_own" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos_select_own" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos_update_own" ON public.user_photos;

CREATE POLICY "user_photos_own_select" ON public.user_photos
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "user_photos_own_insert" ON public.user_photos
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_photos_own_update" ON public.user_photos
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_photos_own_delete" ON public.user_photos
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view other users' preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;

CREATE POLICY "user_preferences_own_select" ON public.user_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "user_preferences_own_insert" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_preferences_own_update" ON public.user_preferences
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_own_select" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "notifications_own_insert" ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) OR 
    (select auth.jwt()->>'role') = 'service_role'
  );

CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- CHATS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "chats_insert_own" ON public.chats;
DROP POLICY IF EXISTS "chats_select_own" ON public.chats;
DROP POLICY IF EXISTS "chats_update_own" ON public.chats;

CREATE POLICY "chats_own_select" ON public.chats
  FOR SELECT USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "chats_own_insert" ON public.chats
  FOR INSERT WITH CHECK (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

CREATE POLICY "chats_own_update" ON public.chats
  FOR UPDATE USING (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  )
  WITH CHECK (
    user1_id = (select auth.uid()) OR 
    user2_id = (select auth.uid())
  );

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for development" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated users to read locations" ON public.locations;
DROP POLICY IF EXISTS "locations_public_read" ON public.locations;

CREATE POLICY "locations_public_read" ON public.locations
  FOR SELECT USING (true);

-- ============================================================================
-- VENUES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
DROP POLICY IF EXISTS "venues_select_all" ON public.venues;

CREATE POLICY "venues_public_read" ON public.venues
  FOR SELECT USING (true);

-- ============================================================================
-- OTHER TABLES - Optimize auth calls only
-- ============================================================================

-- user_onboarding_preferences
DROP POLICY IF EXISTS "Users can only see their own onboarding preferences" ON public.user_onboarding_preferences;
CREATE POLICY "user_onboarding_prefs_own" ON public.user_onboarding_preferences
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- venue_preferences
DROP POLICY IF EXISTS "Users can manage their own venue preferences" ON public.venue_preferences;
CREATE POLICY "venue_prefs_own" ON public.venue_preferences
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- preference_save_logs
DROP POLICY IF EXISTS "Users can see their own preference logs" ON public.preference_save_logs;
CREATE POLICY "pref_logs_own_select" ON public.preference_save_logs
  FOR SELECT USING (user_id = (select auth.uid()));

-- cached_place_photos
DROP POLICY IF EXISTS "cached_place_photos_delete_admin" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_place_photos_insert" ON public.cached_place_photos;
DROP POLICY IF EXISTS "cached_place_photos_update_admin" ON public.cached_place_photos;

CREATE POLICY "cached_photos_public_read" ON public.cached_place_photos
  FOR SELECT USING (true);

CREATE POLICY "cached_photos_admin_insert" ON public.cached_place_photos
  FOR INSERT WITH CHECK ((select auth.jwt()->>'role') = 'service_role');

CREATE POLICY "cached_photos_admin_update" ON public.cached_place_photos
  FOR UPDATE USING ((select auth.jwt()->>'role') = 'service_role')
  WITH CHECK ((select auth.jwt()->>'role') = 'service_role');

CREATE POLICY "cached_photos_admin_delete" ON public.cached_place_photos
  FOR DELETE USING ((select auth.jwt()->>'role') = 'service_role');

-- logs
DROP POLICY IF EXISTS "logs_read_policy" ON public.logs;
CREATE POLICY "logs_admin_read" ON public.logs
  FOR SELECT USING ((select auth.jwt()->>'role') = 'service_role');

-- search_cache_logs
DROP POLICY IF EXISTS "search_cache_logs_read_admin" ON public.search_cache_logs;
CREATE POLICY "search_cache_logs_admin_read" ON public.search_cache_logs
  FOR SELECT USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- USER_PREFERENCES_HASHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "user_preferences_hashes_owner_select" ON public.user_preferences_hashes;
DROP POLICY IF EXISTS "user_preferences_hashes_owner_insert" ON public.user_preferences_hashes;
DROP POLICY IF EXISTS "user_preferences_hashes_owner_update" ON public.user_preferences_hashes;

CREATE POLICY "pref_hashes_own_select" ON public.user_preferences_hashes
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "pref_hashes_own_insert" ON public.user_preferences_hashes
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "pref_hashes_own_update" ON public.user_preferences_hashes
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

