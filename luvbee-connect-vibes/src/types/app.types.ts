export interface UserProfile {
  id: string
  email: string
  name: string
  age?: number | null
  avatar_url?: string
  bio?: string
  location?: Record<string, any> | null
  preferences?: Record<string, any>
  interests?: string[]
  compatibility_score?: number
  distance?: number
  onboarding_completed?: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LocationData {
  id: string
  name: string
  address: string
  category: string
  type?: string
  description?: string
  images?: string[]
  image_url?: string
  rating: number
  phone?: string
  website?: string
  opening_hours?: Record<string, any>
  location?: { lat: number; lng: number }
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  place_id?: string
  price_level?: number
  owner_id?: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  distance_meters?: number
}

export interface MatchData {
  id: string
  user_id: string
  matched_user_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  created_at: string
  updated_at: string
  matched_user?: UserProfile
}

export interface MessageData {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  read_at?: string
  created_at: string
  sender?: UserProfile
  receiver?: UserProfile
}

export interface CheckInData {
  id: string
  user_id: string
  location_id: string
  checked_in_at: string
  checked_out_at?: string
  is_active: boolean
  created_at: string
  location?: LocationData
  user?: UserProfile
}

export interface LocationCategory {
  id: string
  name: string
  icon?: string
  color: string
  is_active: boolean
  created_at: string
}

export interface FavoriteData {
  id: string
  user_id: string
  location_id: string
  created_at: string
  location?: LocationData
}

export interface ReviewData {
  id: string
  user_id: string
  location_id: string
  rating: number
  comment?: string
  images?: string[]
  is_verified: boolean
  created_at: string
  updated_at: string
  user?: UserProfile
}

export interface AuthFormData {
  email: string
  password: string
  name?: string
}

export interface LocationFilter {
  category?: string
  search?: string
  rating?: number
  verified?: boolean
  limit?: number
  offset?: number
}

export interface MatchFilter {
  status?: 'pending' | 'accepted' | 'rejected' | 'blocked'
  limit?: number
  offset?: number
}

export interface MessageFilter {
  sender_id?: string
  receiver_id?: string
  is_read?: boolean
  limit?: number
  offset?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface RealtimeSubscription {
  channel: string
  event: string
  callback: (payload: any) => void
}

export type NotificationType = 'match' | 'message' | 'check_in' | 'review'

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  user_id: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}