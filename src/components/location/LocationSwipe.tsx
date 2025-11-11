/**
 * LocationSwipe Component - Interface de swipe para locais
 * T041: User Story 2 - Core Loop 1: Vibe Local
 */

import { useState, useRef, useEffect } from 'react'
import { LocationCard } from './LocationCard'
import { Button } from '@/components/ui/button'
import { Heart, X, MapPin } from 'lucide-react'
import { useLocations } from '@/hooks/useLocations'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import type { Location } from '@/types/location.types'

interface LocationSwipeProps {
  latitude?: number
  longitude?: number
  radius?: number
}

export function LocationSwipe({ latitude, longitude, radius = 5000 }: LocationSwipeProps) {
  const { user } = useAuth()
  const {
    currentLocation,
    hasMoreLocations,
    hasNoLocations,
    isLoading,
    error,
    likeLocation,
    dislikeLocation,
    isLiking,
    isDisliking,
    currentIndex,
  } = useLocations({
    latitude,
    longitude,
    radius,
    enabled: !!latitude && !!longitude && !!user,
  })

  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const prevIndexRef = useRef(currentIndex || 0)

  // Detectar mudança de índice para resetar estado de swipe
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex && currentLocation) {
      // Resetar offset quando mudar de card
      setSwipeOffset({ x: 0, y: 0 })
      setIsDragging(false)
      prevIndexRef.current = currentIndex || 0
    }
  }, [currentIndex, currentLocation])

  // Calcular distância (simplificado - em produção usar biblioteca de geolocalização)
  const calculateDistance = (loc: Location | any): string => {
    // Suportar tanto Location (do database) quanto LocationData
    const locLat = loc.latitude || loc.lat || (loc.location?.lat)
    const locLng = loc.longitude || loc.lng || (loc.location?.lng)
    
    if (!latitude || !longitude || !locLat || !locLng) {
      return 'Distância não disponível'
    }

    const R = 6371 // Raio da Terra em km
    const dLat = ((locLat - latitude) * Math.PI) / 180
    const dLon = ((locLng - longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((locLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
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
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    const deltaX = swipeOffset.x
    
    // Se arrastou muito para a direita (like)
    if (deltaX > 100 && currentLocation && !isLiking) {
      likeLocation(currentLocation.id)
    }
    // Se arrastou muito para a esquerda (dislike)
    else if (deltaX < -100 && currentLocation && !isDisliking) {
      dislikeLocation(currentLocation.id)
    }
    
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
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const deltaX = swipeOffset.x
    
    // Se arrastou muito para a direita (like)
    if (deltaX > 100 && currentLocation && !isLiking) {
      likeLocation(currentLocation.id)
    }
    // Se arrastou muito para a esquerda (dislike)
    else if (deltaX < -100 && currentLocation && !isDisliking) {
      dislikeLocation(currentLocation.id)
    }
    
    setIsDragging(false)
    setSwipeOffset({ x: 0, y: 0 })
  }

  // Calcular rotação baseada no offset
  const rotation = swipeOffset.x * 0.1
  const opacity = 1 - Math.abs(swipeOffset.x) / 300

  if (!user) {
    return (
      <Alert>
        <AlertDescription>Você precisa estar logado para ver locais</AlertDescription>
      </Alert>
    )
  }

  if (!latitude || !longitude) {
    return (
      <Alert>
        <AlertDescription>
          Localização não disponível. Por favor, permita o acesso à localização.
        </AlertDescription>
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
        <AlertDescription>{error.message || 'Erro ao carregar locais'}</AlertDescription>
      </Alert>
    )
  }

  if (!currentLocation) {
    // Verificar se não há locais encontrados (busca inicial sem resultados)
    // vs. já viu todos os locais disponíveis
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
        {hasNoLocations ? (
          <>
            <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-4">Nenhum local encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Não encontramos locais próximos a você nesta área.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold">Você pode:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Aumentar o raio de busca (Cidade ou Região)</li>
                <li>Mudar sua localização de busca</li>
                <li>Tentar novamente mais tarde</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold mb-4">Não há mais locais disponíveis</h3>
            <p className="text-muted-foreground">
              {hasMoreLocations
                ? 'Carregando mais locais...'
                : 'Você já viu todos os locais próximos. Tente aumentar o raio de busca!'}
            </p>
          </>
        )}
      </div>
    )
  }

  const distance = calculateDistance(currentLocation)

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        ref={cardRef}
        className="relative transition-all duration-300 ease-out"
        style={{
          transform: `translateX(${swipeOffset.x}px) translateY(${swipeOffset.y}px) rotate(${rotation}deg)`,
          opacity: isDragging ? Math.max(opacity, 0.5) : 1,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <LocationCard location={currentLocation} distance={distance} />
      </div>

      {/* Botões de ação */}
      <div className="flex justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={() => currentLocation && dislikeLocation(currentLocation.id)}
          disabled={isDisliking || !currentLocation}
          className="rounded-full w-16 h-16 shadow-hard border-2"
        >
          <X className="w-6 h-6" />
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={() => currentLocation && likeLocation(currentLocation.id)}
          disabled={isLiking || !currentLocation}
          className="rounded-full w-16 h-16 shadow-hard border-2 bg-primary"
        >
          <Heart className="w-6 h-6" />
        </Button>
      </div>

      {/* Indicador de swipe */}
      {Math.abs(swipeOffset.x) > 50 && (
        <div
          className={`absolute top-4 ${
            swipeOffset.x > 0 ? 'right-4' : 'left-4'
          } text-2xl font-bold`}
        >
          {swipeOffset.x > 0 ? '❤️' : '👎'}
        </div>
      )}
    </div>
  )
}

