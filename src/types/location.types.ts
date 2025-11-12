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

// Tipo Location estendido com campos do Google Places
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
}

export interface LocationWithMatches extends Location {
  location_matches?: LocationMatch[]
}

