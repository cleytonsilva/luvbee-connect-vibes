/**
 * Chat Types - LuvBee Core Platform
 */

import type { Database } from '@/integrations/database.types'
import type { User } from './user.types'
import type { Message } from './message.types'

export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']

export interface ChatWithUsers extends Chat {
  user1?: User | null
  user2?: User | null
  last_message?: Message | null
}

