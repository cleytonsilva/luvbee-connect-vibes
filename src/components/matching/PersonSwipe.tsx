/**
 * PersonSwipe Component - Interface de swipe para pessoas
 * T060: User Story 3 - Core Loop 2: Vibe People
 */

import { useState, useRef } from 'react'
import { PersonCard } from './PersonCard'
import { PersonProfileModal } from './PersonProfileModal'
import { Button } from '@/components/ui/button'
import { Heart, X, AlertCircle } from 'lucide-react'
import { usePotentialMatches, useCreateMatch, useHasLocationMatches } from '@/hooks/useMatches'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import type { PotentialMatch } from '@/services/match.service'
import { useNavigate } from 'react-router-dom'

interface PersonSwipeProps {
  limit?: number
}

export function PersonSwipe({ limit = 10 }: PersonSwipeProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: potentialMatches = [], isLoading, error, refetch } = usePotentialMatches({ limit })
  const { data: hasLocationMatches = false } = useHasLocationMatches()
  const createMatch = useCreateMatch()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Verificar se usuário tem matches com locais (pré-requisito)
  if (!hasLocationMatches && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center p-8">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-2xl font-bold mb-4">Você precisa dar match com locais primeiro!</h3>
        <p className="text-muted-foreground mb-6">
          Para ver pessoas, você precisa dar like em pelo menos um local primeiro.
          Isso garante que você só veja pessoas que compartilham seus interesses em locais.
        </p>
        <Button onClick={() => navigate('/vibe-local')}>
          Ir para Vibe Local
        </Button>
      </div>
    )
  }

  // Handlers de swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    setSwipeOffset({ x: deltaX, y: deltaY })

    // Se arrastou muito para a direita (like)
    if (deltaX > 100) {
      handleLike()
    }
    // Se arrastou muito para a esquerda (dislike)
    else if (deltaX < -100) {
      handleDislike()
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setSwipeOffset({ x: 0, y: 0 })
  }

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setStartPos({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - startPos.x
    const deltaY = touch.clientY - startPos.y
    setSwipeOffset({ x: deltaX, y: deltaY })

    if (deltaX > 100) {
      handleLike()
    } else if (deltaX < -100) {
      handleDislike()
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setSwipeOffset({ x: 0, y: 0 })
  }

  const handleLike = async () => {
    const currentPerson = potentialMatches[currentIndex]
    if (!currentPerson || createMatch.isPending) return

    try {
      await createMatch.mutateAsync(currentPerson.id)
      nextPerson()
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  const handleDislike = () => {
    nextPerson()
  }

  const nextPerson = () => {
    if (currentIndex < potentialMatches.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSwipeOffset({ x: 0, y: 0 })
    } else {
      // Carregar mais matches
      refetch()
      setCurrentIndex(0)
    }
  }

  // Calcular rotação baseada no offset
  const rotation = swipeOffset.x * 0.1
  const opacity = 1 - Math.abs(swipeOffset.x) / 300

  if (!user) {
    return (
      <Alert>
        <AlertDescription>Você precisa estar logado para ver pessoas</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'Erro ao carregar pessoas'}
        </AlertDescription>
      </Alert>
    )
  }

  if (potentialMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
        <h3 className="text-2xl font-bold mb-4">Não há pessoas disponíveis</h3>
        <p className="text-muted-foreground mb-6">
          Não encontramos pessoas com locais em comum no momento.
          Tente dar match com mais locais para aumentar suas chances!
        </p>
        <Button onClick={() => navigate('/vibe-local')}>
          Explorar Mais Locais
        </Button>
      </div>
    )
  }

  const currentPerson = potentialMatches[currentIndex]

  if (!currentPerson) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
        <h3 className="text-2xl font-bold mb-4">Você viu todas as pessoas disponíveis</h3>
        <p className="text-muted-foreground">
          Volte mais tarde ou dê match com mais locais para ver novas pessoas!
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        ref={cardRef}
        className="relative transition-transform duration-200 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${swipeOffset.x}px) translateY(${swipeOffset.y}px) rotate(${rotation}deg)`,
          opacity: Math.max(opacity, 0.5),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <PersonCard
          user={currentPerson}
          onClick={() => setIsProfileModalOpen(true)}
        />
      </div>

      {/* Botões de ação */}
      <div className="flex justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={handleDislike}
          disabled={createMatch.isPending}
          className="rounded-full w-16 h-16 shadow-hard border-2"
        >
          <X className="w-6 h-6" />
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={handleLike}
          disabled={createMatch.isPending}
          className="rounded-full w-16 h-16 shadow-hard border-2 bg-primary"
        >
          <Heart className="w-6 h-6" />
        </Button>
      </div>

      {/* Indicador de swipe */}
      {Math.abs(swipeOffset.x) > 50 && (
        <div
          className={`absolute top-4 z-20 ${swipeOffset.x > 0 ? 'right-4' : 'left-4'
            } text-2xl font-bold`}
        >
          {swipeOffset.x > 0 ? '❤️' : '👎'}
        </div>
      )}

      {/* Contador */}
      <div className="text-center mt-4 text-sm text-muted-foreground">
        {currentIndex + 1} de {potentialMatches.length}
      </div>

      {/* Modal de Perfil */}
      <PersonProfileModal
        user={currentPerson}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onLike={handleLike}
        onDislike={handleDislike}
      />
    </div>
  )
}

