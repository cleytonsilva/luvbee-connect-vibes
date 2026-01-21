/**
 * Location Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'

export type LocationBase = Database['public']['Tables']['locations']['Row']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type LocationUpdate = Database['public']['Tables']['locations']['Update']

// Tipos para location_matches (pode não estar no database.types gerado)
export interface LocationMatch {
  id: string
  user_id: string
  location_id: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface LocationMatchInsert {
  user_id: string
  location_id: string
  status?: 'active' | 'inactive'
}

// Tipo Location estendido com campos do Google Places e compatibilidade
export interface Location extends Omit<LocationBase, 'price_level' | 'location'> {
  place_id?: string | null
  distance_meters?: number
  types?: string[]
  price_level?: number | null | undefined
  // Campos de compatibilidade com Google Places
  location?: {
    lat: number
    lng: number
  } | null
  
  // Campos opcionais que podem vir de joins ou dados da API
  photos?: string[] | null
  image_storage_path?: string | null
  vicinity?: string | null
  category?: string | null // Alias para type
  editorial_summary?: string | null
  generative_summary?: string | null
  google_user_ratings_total?: number | null
  google_rating?: number | null
  features?: {
    serves_beer?: boolean
    serves_wine?: boolean
    serves_cocktails?: boolean
    good_for_groups?: boolean
    good_for_children?: boolean
    live_music?: boolean
  } | null
}

export interface LocationWithMatches extends Location {
  location_matches?: LocationMatch[]
}
