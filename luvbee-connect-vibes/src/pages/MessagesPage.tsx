/**
 * MessagesPage - Chat Interface
 * User Story 4: Chat
 * 
 * Página para listar e gerenciar chats com matches mútuos
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatListItem } from '@/components/chat/ChatListItem'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useChats } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { ChatListItem as ChatListItemType } from '@/services/chat.service'

export function MessagesPage() {
  const { user } = useAuth()
  const { data: chats = [], isLoading } = useChats()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  const selectedChat = chats.find(chat => chat.id === selectedChatId)

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
  }

  const handleBackToList = () => {
    setSelectedChatId(null)
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <Card className="p-8">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Você precisa estar logado
          </h3>
          <p className="text-muted-foreground">
            Faça login para ver seus chats
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Mensagens
        </h1>
        <p className="text-muted-foreground">
          Conecte-se e converse com pessoas que você deu match
        </p>
      </div>

      <Card className="overflow-hidden shadow-hard border-2 border-foreground">
        {selectedChatId && selectedChat ? (
          <div className="flex flex-col h-[600px]">
            {/* Mobile Header */}
            <div className="flex items-center space-x-3 p-4 border-b-2 border-foreground bg-card md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToList}
                className="border-2 border-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h2 className="font-bold text-foreground">
                  {selectedChat.other_user.name}
                </h2>
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow chatId={selectedChatId} />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0">
            {/* Chat List */}
            <div className="md:border-r-2 border-foreground">
              <div className="p-4 border-b-2 border-foreground bg-card">
                <h2 className="font-bold text-foreground">Conversas</h2>
              </div>
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhuma conversa ainda
                    </h3>
                    <p className="text-muted-foreground">
                      Comece a conectar com pessoas para iniciar conversas!
                    </p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChatId === chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Empty State */}
            <div className="hidden md:flex items-center justify-center p-8 bg-muted/30">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-foreground">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa da lista para começar a conversar
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
