-- Performance Improvements - Optional INFO Recommendations
-- These are improvements (INFO level) not critical issues (WARN level)
-- Applied selectively based on impact assessment

-- ============================================================================
-- 1. UNINDEXED FOREIGN KEY (Critical - 1 item)
-- ============================================================================
-- messages.messages_sender_id_fkey needs an index for performance

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON public.messages(sender_id);

-- ============================================================================
-- 2. PRIMARY KEYS (Critical for production tables - 2 items)
-- ============================================================================

-- user_preferences_hashes - Add composite primary key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_preferences_hashes' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.user_preferences_hashes 
      ADD PRIMARY KEY (user_id, content_hash);
  END IF;
END $$;

-- location_hashes - Add composite primary key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'location_hashes' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.location_hashes
      ADD PRIMARY KEY (location_id, content_hash);
  END IF;
END $$;

-- ============================================================================
-- 3. REMOVE UNUSED INDEXES (Performance gain - selective removal)
-- ============================================================================
-- Only removing unused indexes that are clearly redundant
-- Keeping indexes used in queries

-- From profiles
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_onboarding_step;

-- From users
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_onboarding_completed;
DROP INDEX IF EXISTS idx_users_is_active;

-- From locations (keep critical ones for search)
DROP INDEX IF EXISTS idx_locations_location;
DROP INDEX IF EXISTS idx_locations_rating;
DROP INDEX IF EXISTS idx_locations_last_synced;
DROP INDEX IF EXISTS idx_locations_is_active;
DROP INDEX IF EXISTS idx_locations_event_date;
DROP INDEX IF EXISTS idx_locations_source_id;

-- From logs
DROP INDEX IF EXISTS logs_timestamp_idx;
DROP INDEX IF EXISTS logs_level_idx;
DROP INDEX IF EXISTS logs_action_idx;

-- From messages
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;

-- From notifications  
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_notifications_created_at;

-- From matches
DROP INDEX IF EXISTS idx_matches_venue;

-- From venues
DROP INDEX IF EXISTS idx_venues_location;
DROP INDEX IF EXISTS idx_venues_category;

-- From user_preferences
DROP INDEX IF EXISTS idx_user_preferences_identity;
DROP INDEX IF EXISTS idx_user_preferences_who_to_see;
DROP INDEX IF EXISTS idx_user_preferences_drink_preferences;
DROP INDEX IF EXISTS idx_user_preferences_food_preferences;
DROP INDEX IF EXISTS idx_user_preferences_music_preferences;

-- From cached_place_photos
DROP INDEX IF EXISTS idx_cached_photos_place_id;
DROP INDEX IF EXISTS idx_cached_photos_created_at;

-- From user_matches
DROP INDEX IF EXISTS idx_user_matches_matched_at;

-- From br_states
DROP INDEX IF EXISTS idx_br_states_ibge;
DROP INDEX IF EXISTS idx_br_states_region;

-- From neighborhoods
DROP INDEX IF EXISTS idx_neighborhoods_state_name;

-- From search_cache_logs
DROP INDEX IF EXISTS search_cache_logs_location_index;

-- From user_onboarding_preferences
DROP INDEX IF EXISTS idx_user_onboarding_preferences_user_id;

-- From preference_save_logs
DROP INDEX IF EXISTS idx_preference_save_logs_created_at;

-- From location_views
DROP INDEX IF EXISTS idx_location_views_user_id;
DROP INDEX IF EXISTS idx_location_views_location_id;
DROP INDEX IF EXISTS idx_location_views_place_id;
DROP INDEX IF EXISTS idx_location_views_action_taken;
DROP INDEX IF EXISTS idx_location_views_user_location;

-- From location_hashes
DROP INDEX IF EXISTS idx_location_hashes_hash;

-- From user_preferences_hashes
DROP INDEX IF EXISTS idx_user_preferences_hashes_hash;

-- From people_matches
DROP INDEX IF EXISTS idx_people_matches_users;
DROP INDEX IF EXISTS idx_people_matches_status;
DROP INDEX IF EXISTS idx_people_matches_compatibility;
DROP INDEX IF EXISTS idx_people_matches_matched_at;

-- From chats
DROP INDEX IF EXISTS idx_chats_users;
DROP INDEX IF EXISTS idx_chats_last_message;
DROP INDEX IF EXISTS idx_chats_people_match;

-- From location_categories
DROP INDEX IF EXISTS idx_location_categories_is_active;

-- From locations (additional cleanup)
DROP INDEX IF EXISTS locations_google_place_id_index;
DROP INDEX IF EXISTS locations_city_state_index;
DROP INDEX IF EXISTS locations_is_adult_index;

-- ============================================================================
-- SKIP: Backup Schema Tables
-- ============================================================================
-- NOT MODIFYING:
-- - backup_20251120.backup_info (no primary key)
-- - backup_20251120.locations (no primary key)
-- - backup_20251120.user_preferences (no primary key)
-- - backup_20251120.functions_backup (no primary key)
-- Reason: These are backup tables, not production tables

