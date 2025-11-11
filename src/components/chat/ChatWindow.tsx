/**
 * ChatWindow Component - LuvBee Core Platform
 * 
 * Componente principal para exibir e gerenciar um chat
 * Atualizado para usar chat_id e novos hooks/components
 */

import { useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useChatMessages, useSendMessage, useMarkChatAsRead, useChat } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { Loader2 } from 'lucide-react'

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth()
  const { data: chat, isLoading: isLoadingChat } = useChat(chatId)
  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages(chatId)
  const sendMessage = useSendMessage()
  const markAsRead = useMarkChatAsRead()

  // Determinar o outro usuário
  const otherUser = chat?.user1_id === user?.id ? chat.user2 : chat?.user1

  // Marcar como lido quando o chat é aberto
  useEffect(() => {
    if (chatId && user?.id) {
      markAsRead.mutate(chatId)
    }
  }, [chatId, user?.id])

  if (isLoadingChat) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!chat || !otherUser) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-muted-foreground text-lg font-semibold mb-2">
            Chat não encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            Este chat pode ter sido removido ou você não tem permissão para acessá-lo.
          </p>
        </div>
      </div>
    )
  }

  const handleSendMessage = (content: string) => {
    sendMessage.mutate({ chatId, content })
  }

  return (
    <div className="flex flex-col h-[600px] bg-background border-2 border-foreground shadow-hard rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b-2 border-foreground bg-card">
        <Avatar className="h-10 w-10 border-2 border-foreground">
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {otherUser.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-bold text-foreground">{otherUser.name || 'Unknown User'}</h3>
          <Badge variant="outline" className="text-xs border-foreground">
            Online
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoadingMessages} />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        isLoading={sendMessage.isPending}
        disabled={!user}
      />
    </div>
  )
}
