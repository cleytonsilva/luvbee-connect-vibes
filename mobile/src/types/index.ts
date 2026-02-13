// Tipos do App Luvbee - Dating App

// ==================== USER / AUTH ====================
export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  identity_verified?: boolean;
  age_verified?: boolean;
  is_banned?: boolean;
  ban_reason?: string;
  // Campos adicionais do Supabase Auth
  aud?: string;
  role?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  birth_date?: string;
  age?: number | null;
  gender?: 'male' | 'female' | 'non_binary' | 'other';
  bio?: string;
  occupation?: string;
  education?: string;
  location?: string;
  country?: string;
  state_province?: string;
  language_preference?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  avatar_url?: string;
  vibes?: VibeType[];
  interests?: string[];
  looking_for?: 'relationship' | 'casual' | 'friendship' | 'unsure';
  preferred_age_min?: number;
  preferred_age_max?: number;
  preferred_distance?: number;
  show_me?: boolean;
  incognito_mode?: boolean;
  last_active?: string;
  created_at?: string;
  updated_at?: string;
}

// ==================== PLACES / LOCATIONS ====================
export type PlaceCategory =
  | 'bar'
  | 'nightclub'
  | 'restaurant'
  | 'cafe'
  | 'museum'
  | 'theater'
  | 'comedy_club'
  | 'art_gallery'
  | 'live_music'
  | 'park'
  | 'shopping'
  | 'library'
  | 'other';

export type VibeType =
  | 'romantic'
  | 'trendy'
  | 'chill'
  | 'lively'
  | 'sophisticated'
  | 'casual'
  | 'alternative'
  | 'family'
  | 'party';

export interface Place {
  id: string;
  place_id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  review_count?: number;
  photos: string[];
  category: PlaceCategory;
  vibes: VibeType[];
  price_level?: 1 | 2 | 3 | 4;
  is_open_now?: boolean;
  website?: string;
  phone?: string;
}

export interface UserPlace {
  id: string;
  user_id: string;
  place_id: string;
  place?: Place;
  is_favorite: boolean;
  check_ins: number;
  last_check_in?: string;
}

// ==================== MATCHES / LIKES ====================
export type MatchStatus = 'pending' | 'matched' | 'declined' | 'blocked';

export interface Match {
  id: string;
  user_id_1: string;
  user_id_2: string;
  user_1?: Profile;
  user_2?: Profile;
  status: MatchStatus;
  common_places: Place[];
  compatibility_score: number;
  initiated_by: string;
  matched_at?: string;
  created_at: string;
}

export interface Like {
  id: string;
  from_user_id: string;
  to_user_id: string;
  is_super_like: boolean;
  created_at: string;
}

// ==================== CHAT / MESSAGES ====================
export interface Chat {
  id: string;
  match_id: string;
  user_id_1: string;
  user_id_2: string;
  last_message?: Message;
  unread_count_1: number;
  unread_count_2: number;
  is_blocked: boolean;
  blocked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'gif';
  media_url?: string;
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
}

// ==================== SAFETY / MODERATION ====================
export interface IdentityVerification {
  id: string;
  user_id: string;
  document_type: 'rg' | 'cnh' | 'passport';
  document_number: string;
  document_front_url: string;
  document_back_url: string;
  selfie_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface PhotoModeration {
  id: string;
  user_id: string;
  photo_url: string;
  is_approved: boolean;
  has_nudity: boolean;
  is_inappropriate: boolean;
  moderation_score: number;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: 'inappropriate_photos' | 'underage' | 'harassment' | 'spam' | 'fake_profile' | 'other';
  description?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  created_at: string;
}

// ==================== NOTIFICATIONS ====================
export interface Notification {
  id: string;
  user_id: string;
  type: 'match' | 'like' | 'message' | 'check_in' | 'system';
  title: string;
  body: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

// ==================== NAVIGATION ====================
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'chat/[id]': { chatId: string; matchId: string };
  'profile/[id]': { userId: string };
  'place/[id]': { placeId: string };
};

export type TabParamList = {
  discover: undefined;
  places: undefined;
  date: undefined;
  matches: undefined;
  profile: undefined;
};
