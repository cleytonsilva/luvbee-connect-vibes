/**
 * Match Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'
import type { User } from './user.types'
import type { Location } from './location.types'

export type PeopleMatch = Database['public']['Tables']['people_matches']['Row']
export type PeopleMatchInsert = Database['public']['Tables']['people_matches']['Insert']
export type PeopleMatchUpdate = Database['public']['Tables']['people_matches']['Update']

export interface PeopleMatchWithUsers extends PeopleMatch {
  user1?: User | null
  user2?: User | null
  common_locations?: Location[] | null
}

export type MatchStatus = 'pending' | 'mutual' | 'unmatched'
export type LocationMatchStatus = 'active' | 'inactive'

