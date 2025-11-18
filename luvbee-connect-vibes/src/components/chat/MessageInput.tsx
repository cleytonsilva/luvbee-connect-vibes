/**
 * MessageInput Component - LuvBee Core Platform
 * 
 * Componente para input de mensagens
 */

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (content: string) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Digite sua mensagem..."
}: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isLoading || disabled) return

    onSend(trimmedMessage)
    setMessage('')
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 border-t-2 border-foreground bg-background">
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 shadow-hard border-2 border-foreground rounded-none font-mono"
          disabled={isLoading || disabled}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || disabled || !message.trim()}
          className="shadow-hard border-2 border-foreground rounded-none"
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

