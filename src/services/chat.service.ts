/**
 * Chat Service - LuvBee Core Platform
 * 
 * Serviço para gerenciar chats entre usuários
 * Chats são criados automaticamente quando há match mútuo
 */

import { supabase } from '@/integrations/supabase'
import type { ApiResponse } from '@/types/app.types'
import type { Chat, ChatWithUsers } from '@/types/chat.types'
import type { User } from '@/types/user.types'

export interface ChatListItem {
  id: string
  user1_id: string
  user2_id: string
  people_match_id: string | null
  last_message_at: string | null
  user1_unread_count: number
  user2_unread_count: number
  created_at: string
  updated_at: string
  other_user: User
  last_message?: {
    id: string
    content: string
    created_at: string
  } | null
  unread_count: number
}

export class ChatService {
  /**
   * Busca todos os chats do usuário com informações do outro usuário e última mensagem
   */
  static async getUserChats(userId: string): Promise<ApiResponse<ChatListItem[]>> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:users!chats_user1_id_fkey(*),
          user2:users!chats_user2_id_fkey(*),
          messages:messages(
            id,
            content,
            created_at,
            sender_id
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error

      // Transformar dados para formato ChatListItem
      const chats: ChatListItem[] = (data || []).map((chat: any) => {
        const otherUser = chat.user1_id === userId ? chat.user2 : chat.user1
        const unreadCount = chat.user1_id === userId 
          ? chat.user1_unread_count 
          : chat.user2_unread_count

        // Pegar última mensagem
        const messages = chat.messages || []
        const lastMessage = messages.length > 0 
          ? messages.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
          : null

        return {
          id: chat.id,
          user1_id: chat.user1_id,
          user2_id: chat.user2_id,
          people_match_id: chat.people_match_id,
          last_message_at: chat.last_message_at,
          user1_unread_count: chat.user1_unread_count,
          user2_unread_count: chat.user2_unread_count,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          other_user: otherUser,
          last_message: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            created_at: lastMessage.created_at
          } : null,
          unread_count: unreadCount
        }
      })

      return { data: chats }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get user chats'
      }
    }
  }

  /**
   * Busca um chat específico por ID
   */
  static async getChatById(chatId: string): Promise<ApiResponse<ChatWithUsers>> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:users!chats_user1_id_fkey(*),
          user2:users!chats_user2_id_fkey(*)
        `)
        .eq('id', chatId)
        .single()

      if (error) throw error

      return { data: data as ChatWithUsers }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get chat'
      }
    }
  }

  /**
   * Busca chat entre dois usuários
   */
  static async getChatByUsers(userId1: string, userId2: string): Promise<ApiResponse<ChatWithUsers | null>> {
    try {
      // Normalizar IDs (user1_id < user2_id)
      const normalizedUser1 = userId1 < userId2 ? userId1 : userId2
      const normalizedUser2 = userId1 < userId2 ? userId2 : userId1

      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:users!chats_user1_id_fkey(*),
          user2:users!chats_user2_id_fkey(*)
        `)
        .eq('user1_id', normalizedUser1)
        .eq('user2_id', normalizedUser2)
        .maybeSingle()

      if (error) throw error

      return { data: data as ChatWithUsers | null }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get chat by users'
      }
    }
  }

  /**
   * Marca todas as mensagens de um chat como lidas
   */
  static async markChatAsRead(chatId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Buscar chat para determinar qual contador atualizar
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('user1_id, user2_id')
        .eq('id', chatId)
        .single()

      if (chatError) throw chatError

      const isUser1 = chat.user1_id === userId
      const updateField = isUser1 ? 'user1_unread_count' : 'user2_unread_count'

      // Atualizar contador de não lidas
      const { error } = await supabase
        .from('chats')
        .update({ [updateField]: 0, updated_at: new Date().toISOString() })
        .eq('id', chatId)

      if (error) throw error

      // Marcar mensagens como lidas
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('receiver_id', userId)
        .is('read_at', null)

      return { data: undefined }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to mark chat as read'
      }
    }
  }

  /**
   * Busca contador total de mensagens não lidas do usuário
   */
  static async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('user1_unread_count, user2_unread_count')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (error) throw error

      const totalUnread = (data || []).reduce((sum, chat) => {
        if (chat.user1_id === userId) {
          return sum + chat.user1_unread_count
        } else {
          return sum + chat.user2_unread_count
        }
      }, 0)

      return { data: totalUnread }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get unread count'
      }
    }
  }

  /**
   * Subscribe para mudanças em chats do usuário
   */
  static subscribeToChats(userId: string, callback: (chat: ChatListItem) => void) {
    return supabase
      .channel(`chats:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user1_id=eq.${userId}`
        },
        async (payload) => {
          // Buscar dados completos do chat
          const result = await this.getChatById(payload.new.id)
          if (result.data) {
            // Transformar para ChatListItem
            const chat = result.data as any
            const otherUser = chat.user1_id === userId ? chat.user2 : chat.user1
            const unreadCount = chat.user1_id === userId 
              ? chat.user1_unread_count 
              : chat.user2_unread_count

            callback({
              id: chat.id,
              user1_id: chat.user1_id,
              user2_id: chat.user2_id,
              people_match_id: chat.people_match_id,
              last_message_at: chat.last_message_at,
              user1_unread_count: chat.user1_unread_count,
              user2_unread_count: chat.user2_unread_count,
              created_at: chat.created_at,
              updated_at: chat.updated_at,
              other_user: otherUser,
              last_message: null,
              unread_count: unreadCount
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user2_id=eq.${userId}`
        },
        async (payload) => {
          // Similar ao acima
          const result = await this.getChatById(payload.new.id)
          if (result.data) {
            const chat = result.data as any
            const otherUser = chat.user1_id === userId ? chat.user2 : chat.user1
            const unreadCount = chat.user1_id === userId 
              ? chat.user1_unread_count 
              : chat.user2_unread_count

            callback({
              id: chat.id,
              user1_id: chat.user1_id,
              user2_id: chat.user2_id,
              people_match_id: chat.people_match_id,
              last_message_at: chat.last_message_at,
              user1_unread_count: chat.user1_unread_count,
              user2_unread_count: chat.user2_unread_count,
              created_at: chat.created_at,
              updated_at: chat.updated_at,
              other_user: otherUser,
              last_message: null,
              unread_count: unreadCount
            })
          }
        }
      )
      .subscribe()
  }

  /**
   * Unsubscribe de um canal
   */
  static unsubscribeFromChannel(channel: any) {
    return supabase.removeChannel(channel)
  }
}

