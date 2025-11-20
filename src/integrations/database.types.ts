export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cached_place_photos: {
        Row: {
          created_at: string
          id: string
          photo_reference: string | null
          place_id: string
          public_url: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_reference?: string | null
          place_id: string
          public_url: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_reference?: string | null
          place_id?: string
          public_url?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          people_match_id: string | null
          updated_at: string
          user1_id: string
          user1_unread_count: number
          user2_id: string
          user2_unread_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          people_match_id?: string | null
          updated_at?: string
          user1_id: string
          user1_unread_count?: number
          user2_id: string
          user2_unread_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          people_match_id?: string | null
          updated_at?: string
          user1_id?: string
          user1_unread_count?: number
          user2_id?: string
          user2_unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chats_people_match_id_fkey"
            columns: ["people_match_id"]
            isOneToOne: false
            referencedRelation: "people_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      location_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_likes: {
        Row: {
          id: string
          liked_at: string
          location_id: string
          user_id: string
        }
        Insert: {
          id?: string
          liked_at?: string
          location_id: string
          user_id: string
        }
        Update: {
          id?: string
          liked_at?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_likes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_matches: {
        Row: {
          id: string
          location_id: string
          matched_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          location_id: string
          matched_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          location_id?: string
          matched_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      location_rejections: {
        Row: {
          created_at: string
          id: string
          location_id: string
          rejected_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          rejected_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          rejected_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_rejections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      location_views: {
        Row: {
          action_taken: string | null
          created_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          location_id: string
          place_id: string
          updated_at: string | null
          user_id: string
          view_count: number | null
          view_type: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          location_id: string
          place_id: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          view_type?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          location_id?: string
          place_id?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          view_type?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string
          city: string | null
          created_at: string
          description: string | null
          google_place_data: Json | null
          google_place_id: string | null
          google_rating: number | null
          google_user_ratings_total: number | null
          id: string
          image_url: string
          instagram: string | null
          instagram_handle: string | null
          is_adult: boolean | null
          last_synced: string | null
          lat: number
          latitude: number | null
          lng: number
          longitude: number | null
          name: string
          peak_hours: number[]
          peak_hours_calculated: boolean | null
          place_id: string | null
          price_level: number
          rating: number
          source: string | null
          state: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          description?: string | null
          google_place_data?: Json | null
          google_place_id?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          id?: string
          image_url: string
          instagram?: string | null
          instagram_handle?: string | null
          is_adult?: boolean | null
          last_synced?: string | null
          lat: number
          latitude?: number | null
          lng: number
          longitude?: number | null
          name: string
          peak_hours: number[]
          peak_hours_calculated?: boolean | null
          place_id?: string | null
          price_level: number
          rating?: number
          source?: string | null
          state?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          description?: string | null
          google_place_data?: Json | null
          google_place_id?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          id?: string
          image_url?: string
          instagram?: string | null
          instagram_handle?: string | null
          is_adult?: boolean | null
          last_synced?: string | null
          lat?: number
          latitude?: number | null
          lng?: number
          longitude?: number | null
          name?: string
          peak_hours?: number[]
          peak_hours_calculated?: boolean | null
          place_id?: string | null
          price_level?: number
          rating?: number
          source?: string | null
          state?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          level: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          compatibility_score: number | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id_1: string
          user_id_2: string
          venue_id: string | null
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id_1: string
          user_id_2: string
          venue_id?: string | null
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id_1?: string
          user_id_2?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_user1_id_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user2_id_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      people_matches: {
        Row: {
          common_locations_count: number
          compatibility_score: number | null
          created_at: string
          id: string
          matched_at: string | null
          status: string
          updated_at: string
          user1_id: string
          user1_liked_at: string | null
          user2_id: string
          user2_liked_at: string | null
        }
        Insert: {
          common_locations_count?: number
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_at?: string | null
          status?: string
          updated_at?: string
          user1_id: string
          user1_liked_at?: string | null
          user2_id: string
          user2_liked_at?: string | null
        }
        Update: {
          common_locations_count?: number
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_at?: string | null
          status?: string
          updated_at?: string
          user1_id?: string
          user1_liked_at?: string | null
          user2_id?: string
          user2_liked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_matches_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_matches_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean
          match_id: string | null
          message_type: string | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          match_id?: string | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          match_id?: string | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      people_matches: {
        Row: {
          common_locations_count: number
          compatibility_score: number | null
          created_at: string
          id: string
          matched_at: string | null
          status: string
          updated_at: string
          user1_id: string
          user1_liked_at: string | null
          user2_id: string
          user2_liked_at: string | null
        }
        Insert: {
          common_locations_count?: number
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_at?: string | null
          status?: string
          updated_at?: string
          user1_id: string
          user1_liked_at?: string | null
          user2_id: string
          user2_liked_at?: string | null
        }
        Update: {
          common_locations_count?: number
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_at?: string | null
          status?: string
          updated_at?: string
          user1_id?: string
          user1_liked_at?: string | null
          user2_id?: string
          user2_liked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_matches_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_matches_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      preference_save_logs: {
        Row: {
          action: string
          client_info: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          preference_type: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          action: string
          client_info?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          preference_type: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          action?: string
          client_info?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          preference_type?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          additional_photos: string[] | null
          avatar_url: string | null
          bio: string | null
          biography: string | null
          birth_date: string | null
          created_at: string
          drinks_preferences: string[] | null
          email: string
          first_name: string | null
          food_preferences: string[] | null
          full_name: string | null
          id: string
          initial_preferences_saved: boolean | null
          last_name: string | null
          location: Json | null
          location_enabled: boolean | null
          location_preferences: string[] | null
          onboarding_complete: boolean | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_step: string | null
          preferences_verified_at: string | null
          profile_photo_url: string | null
          profile_photos_uploaded: number | null
          updated_at: string
        }
        Insert: {
          additional_photos?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          biography?: string | null
          birth_date?: string | null
          created_at?: string
          drinks_preferences?: string[] | null
          email: string
          first_name?: string | null
          food_preferences?: string[] | null
          full_name?: string | null
          id: string
          initial_preferences_saved?: boolean | null
          last_name?: string | null
          location?: Json | null
          location_enabled?: boolean | null
          location_preferences?: string[] | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          preferences_verified_at?: string | null
          profile_photo_url?: string | null
          profile_photos_uploaded?: number | null
          updated_at?: string
        }
        Update: {
          additional_photos?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          biography?: string | null
          birth_date?: string | null
          created_at?: string
          drinks_preferences?: string[] | null
          email?: string
          first_name?: string | null
          food_preferences?: string[] | null
          full_name?: string | null
          id?: string
          initial_preferences_saved?: boolean | null
          last_name?: string | null
          location?: Json | null
          location_enabled?: boolean | null
          location_preferences?: string[] | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          preferences_verified_at?: string | null
          profile_photo_url?: string | null
          profile_photos_uploaded?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      search_cache_logs: {
        Row: {
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          radius_meters: number
          search_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          radius_meters: number
          search_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          radius_meters?: number
          search_type?: string | null
        }
        Relationships: []
      }
      user_matches: {
        Row: {
          id: string
          is_mutual: boolean | null
          matched_at: string
          matched_locations: string[] | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          id?: string
          is_mutual?: boolean | null
          matched_at?: string
          matched_locations?: string[] | null
          user1_id: string
          user2_id: string
        }
        Update: {
          id?: string
          is_mutual?: boolean | null
          matched_at?: string
          matched_locations?: string[] | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_matches_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_matches_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_preferences: {
        Row: {
          created_at: string | null
          id: string
          preference_type: string
          preferences: Json
          source: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_type: string
          preferences?: Json
          source?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_type?: string
          preferences?: Json
          source?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          created_at: string | null
          file_format: string | null
          file_size: number | null
          id: string
          is_primary: boolean | null
          photo_order: number | null
          photo_url: string
          updated_at: string | null
          upload_source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_format?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          photo_order?: number | null
          photo_url: string
          updated_at?: string | null
          upload_source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_format?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          photo_order?: number | null
          photo_url?: string
          updated_at?: string | null
          upload_source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          drink_preferences: string[]
          drinks: Json | null
          food_preferences: string[]
          foods: Json | null
          id: string
          identity: string | null
          interests: Json | null
          music_preferences: string[]
          updated_at: string | null
          user_id: string
          vibe_preferences: Json | null
          who_to_see: string[] | null
        }
        Insert: {
          created_at?: string | null
          drink_preferences?: string[]
          drinks?: Json | null
          food_preferences?: string[]
          foods?: Json | null
          id?: string
          identity?: string | null
          interests?: Json | null
          music_preferences?: string[]
          updated_at?: string | null
          user_id: string
          vibe_preferences?: Json | null
          who_to_see?: string[] | null
        }
        Update: {
          created_at?: string | null
          drink_preferences?: string[]
          drinks?: Json | null
          food_preferences?: string[]
          foods?: Json | null
          id?: string
          identity?: string | null
          interests?: Json | null
          music_preferences?: string[]
          updated_at?: string | null
          user_id?: string
          vibe_preferences?: Json | null
          who_to_see?: string[] | null
        }
        Relationships: []
      }
      users: {
        Row: {
          age: number | null
          bio: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          location: Json | null
          name: string
          onboarding_completed: boolean
          photos: string[] | null
          preferences: Json
          role: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean
          location?: Json | null
          name: string
          onboarding_completed?: boolean
          photos?: string[] | null
          preferences?: Json
          role?: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          location?: Json | null
          name?: string
          onboarding_completed?: boolean
          photos?: string[] | null
          preferences?: Json
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      venue_preferences: {
        Row: {
          created_at: string | null
          id: string
          preference_level: number | null
          updated_at: string | null
          user_id: string
          venue_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_level?: number | null
          updated_at?: string | null
          user_id: string
          venue_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_level?: number | null
          updated_at?: string | null
          user_id?: string
          venue_type?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          amenities: string[] | null
          category: string
          created_at: string | null
          description: string
          id: string
          location: Json
          name: string
          opening_hours: Json | null
          photos: string[] | null
          price_range: number | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          location: Json
          name: string
          opening_hours?: Json | null
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          location?: Json
          name?: string
          opening_hours?: Json | null
          photos?: string[] | null
          price_range?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_compatibility_score: {
        Args: { user1_id: string; user2_id: string }
        Returns: number
      }
      check_search_cache: {
        Args: {
          lat: number
          long: number
          max_age_days?: number
          radius_meters: number
          search_type: string
        }
        Returns: boolean
      }
      create_people_match: {
        Args: { p_liker_id: string; p_user1_id: string; p_user2_id: string }
        Returns: {
          common_locations_count: number
          compatibility_score: number | null
          created_at: string
          id: string
          matched_at: string | null
          status: string
          updated_at: string
          user1_id: string
          user1_liked_at: string | null
          user2_id: string
          user2_liked_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "people_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_old_profile_photos: {
        Args: { new_photo_path: string; user_id_param: string }
        Returns: undefined
      }
      filter_unmatched_locations: {
        Args: { p_place_ids: string[]; p_user_id: string }
        Returns: {
          place_id: string
        }[]
      }
      find_location_based_matches: {
        Args: { min_common_locations?: number; target_user_id: string }
        Returns: {
          common_location_ids: string[]
          match_score: number
          user_id: string
        }[]
      }
      get_cached_photo_url: {
        Args: { place_id_param: string }
        Returns: string
      }
      get_common_locations: {
        Args: { user1_uuid: string; user2_uuid: string }
        Returns: string[]
      }
      get_excluded_locations: {
        Args: { p_user_id: string }
        Returns: {
          location_id: string
          place_id: string
          reason: string
        }[]
      }
      get_location_rejection_rate: {
        Args: { p_location_id: string }
        Returns: number
      }
      get_locations_with_mutual_likes: {
        Args: { p_user_id: string }
        Returns: {
          location_id: string
          mutual_count: number
        }[]
      }
      get_nearby_locations: {
        Args: { radius_meters?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          created_at: string
          description: string
          distance_meters: number
          google_rating: number
          google_user_ratings_total: number
          id: string
          image_url: string
          instagram: string
          lat: number
          lng: number
          name: string
          peak_hours: number[]
          peak_hours_calculated: boolean
          place_id: string
          price_level: number
          rating: number
          type: string
          updated_at: string
        }[]
      }
      get_places_by_city_state: {
        Args: { city_name: string; filter_adult?: boolean; state_name: string }
        Returns: {
          address: string
          city: string | null
          created_at: string
          description: string | null
          google_place_data: Json | null
          google_place_id: string | null
          google_rating: number | null
          google_user_ratings_total: number | null
          id: string
          image_url: string
          instagram: string | null
          instagram_handle: string | null
          is_adult: boolean | null
          last_synced: string | null
          lat: number
          latitude: number | null
          lng: number
          longitude: number | null
          name: string
          peak_hours: number[]
          peak_hours_calculated: boolean | null
          place_id: string | null
          price_level: number
          rating: number
          source: string | null
          state: string | null
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "locations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_places_nearby: {
        Args: {
          drink_preferences?: string[]
          filter_adult?: boolean
          food_preferences?: string[]
          lat: number
          long: number
          music_preferences?: string[]
          radius_meters?: number
        }
        Returns: {
          address: string
          category: string
          created_at: string
          description: string
          distance_meters: number
          google_place_id: string
          google_places_data: Json
          id: string
          images: string[]
          is_active: boolean
          is_curated: boolean
          is_verified: boolean
          last_synced_at: string
          latitude: number
          longitude: number
          name: string
          opening_hours: Json
          owner_id: string
          phone: string
          photo_url: string
          price_level: number
          rating: number
          type: string
          updated_at: string
          website: string
        }[]
      }
      get_potential_matches: {
        Args: { match_limit?: number; p_user_id: string }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          common_locations_count: number
          compatibility_score: number
          created_at: string
          drink_preferences: string[]
          email: string
          food_preferences: string[]
          id: string
          identity: string
          is_active: boolean
          location: string
          location_latitude: number
          location_longitude: number
          music_preferences: string[]
          name: string
          onboarding_completed: boolean
          updated_at: string
        }[]
      }
      get_recent_conversations: {
        Args: { conversation_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          last_message_content: string
          last_message_created_at: string
          match_id: string
          other_user_avatar_url: string
          other_user_id: string
          other_user_name: string
          unread_count: number
        }[]
      }
      insert_user_photo: {
        Args: {
          p_file_format?: string
          p_file_size?: number
          p_photo_url: string
          p_upload_source?: string
        }
        Returns: string
      }
      log_preference_save: {
        Args: {
          p_action: string
          p_client_info?: Json
          p_error_message?: string
          p_new_values?: Json
          p_old_values?: Json
          p_preference_type: string
          p_success?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      record_location_view: {
        Args: {
          p_action_taken?: string
          p_location_id: string
          p_place_id: string
          p_user_id: string
          p_view_type?: string
        }
        Returns: undefined
      }
      verify_user_preferences: {
        Args: { p_user_id: string }
        Returns: {
          preference_type: string
          verified: boolean
          verified_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
