/**
 * Message Service - LuvBee Core Platform
 * 
 * Serviço para gerenciar mensagens em chats
 * Atualizado para usar chat_id ao invés de match_id
 */

import { supabase } from '../integrations/supabase'
import type { ApiResponse } from '../types/app.types'
import type { Message, MessageWithRelations } from '../types/message.types'
import { sanitizeMessageContent } from '../lib/sanitize'

export class MessageService {
  /**
   * Busca mensagens de um chat
   */
  static async getMessages(chatId: string, limit: number = 50): Promise<ApiResponse<MessageWithRelations[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, chat_id, sender_id, content, read_at, created_at,
          sender:users!messages_sender_id_fkey(id,name,email,avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error

      return { data: (data || []) as MessageWithRelations[] }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to get messages' 
      }
    }
  }

  /**
   * Envia uma mensagem em um chat
   */
  static async sendMessage(
    chatId: string, 
    senderId: string, 
    content: string
  ): Promise<ApiResponse<MessageWithRelations>> {
    try {
      // ✅ Sanitizar conteúdo para prevenir XSS
      const sanitizedContent = sanitizeMessageContent(content)
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          content: sanitizedContent,
          read_at: null
        })
        .select(`
          id, chat_id, sender_id, content, read_at, created_at,
          sender:users!messages_sender_id_fkey(id,name,email,avatar_url)
        `)
        .single()

      if (error) throw error

      return { data: data as MessageWithRelations }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      }
    }
  }

  /**
   * Marca uma mensagem como lida
   */
  static async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null)

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to mark message as read' 
      }
    }
  }

  /**
   * Marca todas as mensagens de um chat como lidas
   */
  static async markAllAsRead(chatId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .is('read_at', null)

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to mark messages as read' 
      }
    }
  }

  static async deleteMessage(messageId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete message' }
    }
  }

  /**
   * Busca contador de mensagens não lidas de um chat
   */
  static async getUnreadCount(chatId: string, userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .is('read_at', null)

      if (error) throw error

      return { data: count || 0 }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to get unread count' 
      }
    }
  }

  /**
   * @deprecated Use ChatService.getUserChats() instead
   * Mantido para compatibilidade temporária
   */
  static async getRecentConversations(userId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      // Tentar usar RPC primeiro
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_recent_conversations', {
          p_user_id: userId,
          conversation_limit: limit
        })

      if (!rpcError && rpcData) {
        // Normalizar dados da função RPC para o formato esperado pelo componente
        const normalizedData = Array.isArray(rpcData) ? rpcData.map((conv: any) => ({
          match_id: conv.match_id,
          other_user: {
            id: conv.other_user_id,
            name: conv.other_user_name || 'Unknown User',
            avatar_url: conv.other_user_avatar_url || null,
            email: null // RPC não retorna email
          },
          last_message: conv.last_message_content ? {
            content: conv.last_message_content,
            created_at: conv.last_message_created_at
          } : null,
          unread_count: conv.unread_count || 0,
          created_at: conv.created_at
        })) : []
        return { data: normalizedData }
      }

      // Fallback: buscar conversas diretamente via matches e messages
      // A tabela matches usa user_id_1 e user_id_2, não user_id e matched_user_id
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          user_id_1,
          user_id_2,
          created_at
        `)
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (matchesError) {
        console.warn('Error fetching matches for conversations:', matchesError)
        return { data: [] }
      }

      if (!matches || matches.length === 0) {
        return { data: [] }
      }

      // Buscar última mensagem e contagem de não lidas para cada match
      const conversations = await Promise.all(
        matches.map(async (match) => {
          const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1

          // Buscar dados do outro usuário
          const { data: otherUser } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', otherUserId)
            .single()

          // Buscar última mensagem
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('id, content, created_at, match_id, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Contar mensagens não lidas
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .eq('receiver_id', userId)
            .eq('is_read', false)

          return {
            match_id: match.id,
            other_user: {
              id: otherUserId,
              name: otherUser?.name || 'Unknown',
              avatar_url: null,
              email: otherUser?.email || null
            },
            last_message: lastMessage || null,
            unread_count: unreadCount || 0,
            created_at: match.created_at
          }
        })
      )

      return { data: conversations }
    } catch (error) {
      console.error('Error in getRecentConversations:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to get recent conversations',
        data: [] // Retornar array vazio em caso de erro
      }
    }
  }

  /**
   * Subscribe para novas mensagens em um chat
   * ✅ Valida que o usuário participa do chat antes de inscrever
   */
  static async subscribeToMessages(
    chatId: string, 
    userId: string,
    callback: (message: MessageWithRelations) => void
  ) {
    // ✅ Validar que o usuário participa do chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user1_id, user2_id')
      .eq('id', chatId)
      .single()
    
    if (chatError || !chat) {
      throw new Error('Chat não encontrado')
    }
    
    if (chat.user1_id !== userId && chat.user2_id !== userId) {
      throw new Error('Não autorizado: você não participa deste chat')
    }
    
    return supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          // Buscar dados completos da mensagem com sender
          const { data } = await supabase
            .from('messages')
            .select(`
              id, chat_id, sender_id, content, read_at, created_at,
              sender:users!messages_sender_id_fkey(id,name,email,avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            callback(data as MessageWithRelations)
          }
        }
      )
      .subscribe()
  }

  /**
   * Subscribe para mudanças em contadores de não lidas
   * Usa a tabela chats que já tem os contadores atualizados
   */
  static subscribeToUnreadCount(userId: string, callback: (count: number) => void) {
    return supabase
      .channel(`unread_count:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `user1_id=eq.${userId}`
        },
        (payload) => {
          const chat = payload.new as any
          callback(chat.user1_unread_count || 0)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `user2_id=eq.${userId}`
        },
        (payload) => {
          const chat = payload.new as any
          callback(chat.user2_unread_count || 0)
        }
      )
      .subscribe()
  }

  static unsubscribeFromChannel(channel: any) {
    return supabase.removeChannel(channel)
  }
}
