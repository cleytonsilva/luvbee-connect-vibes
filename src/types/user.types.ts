/**
 * User Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

export interface UserWithPreferences extends User {
  user_preferences?: UserPreferences | null
}

// Tipos para filtro de preferências
export type GenderPreference = 'homem' | 'mulher' | 'trans' | 'nao-binario' | 'outros' | 'todos';

export interface UserFilterPreferences {
  looking_for: GenderPreference[];
  age_min?: number;
  age_max?: number;
  distance_max?: number;
}

// Perfil público (visível para outros usuários)
export interface PublicProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  interests: string[] | null;
  photos: string[] | null;
  compatibility_score?: number;
  common_locations_count?: number;
  common_interests_count?: number;
}
