/**
 * Location Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'

export type Location = Database['public']['Tables']['locations']['Row']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type LocationUpdate = Database['public']['Tables']['locations']['Update']

export type LocationMatch = Database['public']['Tables']['location_matches']['Row']
export type LocationMatchInsert = Database['public']['Tables']['location_matches']['Insert']

export interface LocationWithMatches extends Location {
  location_matches?: LocationMatch[]
}

