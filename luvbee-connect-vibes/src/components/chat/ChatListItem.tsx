/**
 * ChatListItem Component - LuvBee Core Platform
 * 
 * Componente para exibir um item da lista de chats
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatListItem as ChatListItemType } from '@/services/chat.service'
import { cn } from '@/lib/utils'

interface ChatListItemProps {
  chat: ChatListItemType
  isSelected?: boolean
  onClick?: () => void
}

export function ChatListItem({ chat, isSelected = false, onClick }: ChatListItemProps) {
  const otherUser = chat.other_user
  const lastMessage = chat.last_message
  const unreadCount = chat.unread_count

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-colors shadow-hard border-2",
        isSelected 
          ? "bg-primary/10 border-primary" 
          : "hover:bg-muted/50 border-foreground"
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12 border-2 border-foreground">
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {otherUser.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-foreground truncate">
              {otherUser.name || 'Unknown User'}
            </h3>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 shadow-hard border-2 border-foreground"
              >
                {unreadCount}
              </Badge>
            )}
          </div>

          {lastMessage ? (
            <>
              <p className="text-sm text-muted-foreground truncate mb-1">
                {lastMessage.content}
              </p>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(lastMessage.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma mensagem ainda
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

