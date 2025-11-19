export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          user1_id: string
          user1_unread_count?: number
          user2_id: string
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
      check_ins: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      location_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      location_matches: {
        Row: {
          created_at: string
          id: string
          location_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_matches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          city: string | null
          created_at: string
          description: string | null
          event_end_date: string | null
          event_start_date: string | null
          google_place_data: Json | null
          google_place_id: string | null
          google_rating: number | null
          google_user_ratings_total: number | null
          id: string
          image_url: string
          instagram: string | null
          instagram_handle: string | null
          is_active: boolean | null
          is_adult: boolean | null
          is_curated: boolean | null
          is_verified: boolean | null
          last_synced: string | null
          last_synced_at: string | null
          lat: number
          latitude: number | null
          lng: number
          longitude: number | null
          metadata: Json | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          peak_hours: number[]
          peak_hours_calculated: boolean | null
          place_id: string | null
          price_level: number
          rating: number
          source: string | null
          source_id: string | null
          state: string | null
          ticket_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          description?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          google_place_data?: Json | null
          google_place_id?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          id?: string
          image_url: string
          instagram?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_adult?: boolean | null
          is_curated?: boolean | null
          is_verified?: boolean | null
          last_synced?: string | null
          last_synced_at?: string | null
          lat: number
          latitude?: number | null
          lng: number
          longitude?: number | null
          metadata?: Json | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          peak_hours?: number[]
          peak_hours_calculated?: boolean | null
          place_id?: string | null
          price_level?: number
          rating?: number
          source?: string | null
          source_id?: string | null
          state?: string | null
          ticket_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          description?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          google_place_data?: Json | null
          google_place_id?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          id?: string
          image_url?: string
          instagram?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_adult?: boolean | null
          is_curated?: boolean | null
          is_verified?: boolean | null
          last_synced?: string | null
          last_synced_at?: string | null
          lat?: number
          latitude?: number | null
          lng?: number
          longitude?: number | null
          metadata?: Json | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          peak_hours?: number[]
          peak_hours_calculated?: boolean | null
          place_id?: string | null
          price_level?: number
          rating?: number
          source?: string | null
          source_id?: string | null
          state?: string | null
          ticket_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          match_id: string | null
          message_type: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          chat_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message_type?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          chat_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message_type?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "people_matches"
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
      people_matches: {
        Row: {
          created_at: string
          id: string
          is_super_like: boolean | null
          status: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_super_like?: boolean | null
          status?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super_like?: boolean | null
          status?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          instagram_username: string | null
          interests: string[] | null
          is_onboarded: boolean | null
          location: string | null
          photos: string[] | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          instagram_username?: string | null
          interests?: string[] | null
          is_onboarded?: boolean | null
          location?: string | null
          photos?: string[] | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          instagram_username?: string | null
          interests?: string[] | null
          is_onboarded?: boolean | null
          location?: string | null
          photos?: string[] | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          location_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          location_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          location_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          email: string
          full_name: string | null
          gender: string | null
          id: string
          instagram_username: string | null
          interests: string[] | null
          is_onboarded: boolean | null
          location: string | null
          photos: string[] | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          gender?: string | null
          id: string
          instagram_username?: string | null
          interests?: string[] | null
          is_onboarded?: boolean | null
          location?: string | null
          photos?: string[] | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          instagram_username?: string | null
          interests?: string[] | null
          is_onboarded?: boolean | null
          location?: string | null
          photos?: string[] | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_people_match: {
        Args: {
          user_id: string
          target_user_id: string
          status: string
        }
        Returns: Json
      }
      get_places_nearby: {
        Args: {
          lat: number
          long: number
          radius_meters?: number
          filter_adult?: boolean
          drink_preferences?: string[]
          food_preferences?: string[]
          music_preferences?: string[]
        }
        Returns: {
          id: string
          google_place_id: string
          name: string
          type: string
          address: string
          latitude: number
          longitude: number
          image_url: string
          description: string
          rating: number
          price_level: number
          opening_hours: Json
          google_places_data: Json
          owner_id: string
          is_active: boolean
          is_verified: boolean
          is_curated: boolean
          created_at: string
          updated_at: string
          last_synced_at: string
          distance_meters: number
        }[]
      }
      get_potential_matches: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          full_name: string
          avatar_url: string
          bio: string
          interests: string[]
          common_locations: string[]
        }[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
