/**
 * useChat Hook - LuvBee Core Platform
 * 
 * Hook para gerenciar estado do chat
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { ChatService, type ChatListItem } from '@/services/chat.service'
import { MessageService } from '@/services/message.service'
import { useAuth } from '@/hooks/useAuth'
import type { MessageWithRelations } from '@/types/message.types'
import type { ChatWithUsers } from '@/types/chat.types'
import { csrfService } from '@/lib/csrf'

/**
 * Hook para buscar lista de chats do usuário
 */
export function useChats() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const subscriptionRef = useRef<any>(null)

  const query = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await ChatService.getUserChats(user.id)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 segundos
  })

  // Subscribe para mudanças em tempo real
  useEffect(() => {
    if (!user?.id) return

    subscriptionRef.current = ChatService.subscribeToChats(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user.id] })
    })

    return () => {
      if (subscriptionRef.current) {
        ChatService.unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [user?.id, queryClient])

  return query
}

/**
 * Hook para buscar mensagens de um chat específico
 */
export function useChatMessages(chatId: string | null) {
  const { user } = useAuth()
  const subscriptionRef = useRef<any>(null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      if (!chatId) return []
      const result = await MessageService.getMessages(chatId)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!chatId,
    staleTime: 10 * 1000, // 10 segundos
  })

  // Subscribe para novas mensagens em tempo real
  useEffect(() => {
    if (!chatId || !user?.id) return

    // ✅ Passar userId para validação de participação
    MessageService.subscribeToMessages(
      chatId,
      user.id,
      (newMessage) => {
        queryClient.setQueryData<MessageWithRelations[]>(
          ['chat-messages', chatId],
          (old = []) => {
            // Evitar duplicatas
            if (old.some(msg => msg.id === newMessage.id)) {
              return old
            }
            return [...old, newMessage]
          }
        )
      }
    ).then((subscription) => {
      subscriptionRef.current = subscription
    }).catch((error) => {
      console.error('Erro ao inscrever em mensagens:', error)
    })

    return () => {
      if (subscriptionRef.current) {
        MessageService.unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [chatId, user?.id, queryClient])

  return query
}

/**
 * Hook para enviar mensagem
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!user?.id) throw new Error('User not authenticated')
      const csrfToken = csrfService.ensureToken()
      const result = await MessageService.sendMessage(chatId, user.id, content, { csrfToken })
      if (result.error) throw new Error(result.error)
      return result.data!
    },
    onSuccess: (message, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}

/**
 * Hook para marcar chat como lido
 */
export function useMarkChatAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await ChatService.markChatAsRead(chatId, user.id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: (_, chatId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] })
    },
  })
}

/**
 * Hook para buscar um chat específico
 */
export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      if (!chatId) return null
      const result = await ChatService.getChatById(chatId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!chatId,
  })
}

/**
 * Hook para buscar chat entre dois usuários
 */
export function useChatByUsers(userId1: string | null, userId2: string | null) {
  return useQuery({
    queryKey: ['chat-by-users', userId1, userId2],
    queryFn: async () => {
      if (!userId1 || !userId2) return null
      const result = await ChatService.getChatByUsers(userId1, userId2)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!userId1 && !!userId2,
  })
}

/**
 * Hook para buscar contador total de não lidas
 */
export function useUnreadCount() {
  const { user } = useAuth()
  const subscriptionRef = useRef<any>(null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0
      const result = await ChatService.getUnreadCount(user.id)
      if (result.error) throw new Error(result.error)
      return result.data ?? 0
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  })

  // Subscribe para mudanças em tempo real
  useEffect(() => {
    if (!user?.id) return

    subscriptionRef.current = MessageService.subscribeToUnreadCount(user.id, (count) => {
      queryClient.setQueryData(['unread-count', user.id], count)
    })

    return () => {
      if (subscriptionRef.current) {
        MessageService.unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [user?.id, queryClient])

  return query
}

/**
 * Hook helper para invalidar cache de chat
 */
export function useInvalidateChat() {
  const queryClient = useQueryClient()

  return {
    invalidateChats: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
    invalidateMessages: (chatId?: string) => {
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  }
}

