/**
 * MessageList Component - LuvBee Core Platform
 * 
 * Componente para exibir lista de mensagens em um chat
 */

import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MessageWithRelations } from '@/types/message.types'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: MessageWithRelations[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-lg font-semibold mb-2">
            Nenhuma mensagem ainda
          </p>
          <p className="text-sm text-muted-foreground">
            Seja o primeiro a enviar uma mensagem!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === user?.id
        const sender = message.sender

        return (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-2",
              isOwnMessage ? "justify-end" : "justify-start"
            )}
          >
            {!isOwnMessage && sender && (
              <Avatar className="h-8 w-8 border-2 border-foreground">
                <AvatarImage src={sender.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {sender.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-hard border-2 border-foreground",
                isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground"
              )}
            >
              {!isOwnMessage && sender && (
                <p className="text-xs font-semibold mb-1 opacity-80">
                  {sender.name}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-1">
                <span className="text-xs opacity-60">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
                {isOwnMessage && message.read_at && (
                  <span className="text-xs opacity-60 ml-1">✓✓</span>
                )}
              </div>
            </div>

            {isOwnMessage && (
              <Avatar className="h-8 w-8 border-2 border-foreground">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}

