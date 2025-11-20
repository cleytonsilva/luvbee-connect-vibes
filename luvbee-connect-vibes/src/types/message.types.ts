/**
 * Message Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'
import type { User } from './user.types'
import type { Chat } from './chat.types'

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export interface MessageWithRelations extends Message {
  sender?: User | null
  chat?: Chat | null
}

