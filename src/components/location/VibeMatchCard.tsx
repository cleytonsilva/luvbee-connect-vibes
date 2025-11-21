import { useState } from 'react'
import { MapPin, Star, Flame, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { usePlacePhoto } from '@/hooks/usePlacePhoto'
import { normalizeImageUrl } from '@/lib/image-url-utils'

interface VibeMatchCardProps {
  place: {
    place_id: string
    name: string
    rating: number
    user_ratings_total: number
    vicinity: string
    photo_reference?: string
    is_open?: boolean
    types?: string[]
    lat: number
    lng: number
  }
  userLocation?: { lat: number; lng: number } | null
  onLike?: (place: any) => void
  onDislike?: (place: any) => void
  className?: string
}

export function VibeMatchCard({ 
  place, 
  userLocation, 
  onLike, 
  onDislike, 
  className 
}: VibeMatchCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [isDisliking, setIsDisliking] = useState(false)

  // Calcular distância usando Haversine
  const calculateDistance = () => {
    if (!userLocation) return null
    
    const R = 6371 // Raio da Terra em km
    const dLat = (place.lat - userLocation.lat) * Math.PI / 180
    const dLon = (place.lng - userLocation.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(place.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`
  }

  const distance = calculateDistance()

  // Construir URL da foto do Google Places
  const photoUrl = place.photo_reference 
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    : null

  // Normalizar e obter foto
  const normalizedUrl = normalizeImageUrl(photoUrl, place.place_id)
  const imageUrl = usePlacePhoto(place.place_id, normalizedUrl)

  const handleLike = async () => {
    if (isLiking || isDisliking) return
    
    setIsLiking(true)
    try {
      await onLike?.(place)
    } finally {
      setIsLiking(false)
    }
  }

  const handleDislike = async () => {
    if (isLiking || isDisliking) return
    
    setIsDisliking(true)
    try {
      await onDislike?.(place)
    } finally {
      setIsDisliking(false)
    }
  }

  // Mapear tipos para categorias amigáveis
  const getCategoryLabel = (types: string[] = []) => {
    if (types.includes('night_club')) return 'Balada'
    if (types.includes('bar')) return 'Bar'
    if (types.includes('restaurant')) return 'Restaurante'
    if (types.includes('cafe')) return 'Café'
    return 'Local'
  }

  const category = getCategoryLabel(place.types)

  return (
    <div className={cn(
      "relative w-full h-[80vh] max-h-[600px] rounded-lg overflow-hidden",
      "border-4 border-foreground shadow-hard",
      "bg-card",
      "neo-brutalist",
      className
    )}>
      {/* Imagem com fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        <div 
          className={cn(
            "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent",
            imageUrl ? "hidden" : "flex"
          )}
        >
          <div className="text-center text-white">
            <MapPin className="w-16 h-16 mx-auto mb-2 opacity-60" />
            <p className="text-sm opacity-75">{place.name}</p>
          </div>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white space-y-4">
        {/* Header com nome e categoria */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {place.name}
            </h3>
            <Badge 
              variant="secondary" 
              className="bg-accent text-foreground font-bold px-3 py-1 border-2 border-foreground shadow-hard-sm"
            >
              <Star className="w-3 h-3 mr-1 fill-current" />
              {place.rating.toFixed(1)}
            </Badge>
          </div>
          
          <Badge 
            variant="outline" 
            className="bg-background/80 text-foreground border-2 border-foreground"
          >
            {category}
          </Badge>
        </div>

        {/* Informações de localização */}
        <div className="space-y-2">
          {place.vicinity && (
            <p className="text-sm text-white/90 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {place.vicinity}
            </p>
          )}
          
          {distance && (
            <p className="text-sm text-white/80">
              a {distance}
            </p>
          )}

          {place.user_ratings_total > 0 && (
            <p className="text-xs text-white/70">
              {place.user_ratings_total} avaliações
            </p>
          )}
        </div>

        {/* Status de aberto/fechado */}
        {place.is_open !== undefined && (
          <Badge 
            variant={place.is_open ? "default" : "secondary"}
            className={cn(
              "text-xs font-bold",
              place.is_open 
                ? "bg-green-500 text-white border-2 border-foreground" 
                : "bg-red-500 text-white border-2 border-foreground"
            )}
          >
            {place.is_open ? 'Aberto agora' : 'Fechado'}
          </Badge>
        )}
      </div>

      {/* Botões de ação (Neo-Brutalist) */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
        {/* Botão Dislike */}
        <Button
          onClick={handleDislike}
          disabled={isLiking || isDisliking}
          variant="outline"
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 border-4 border-foreground shadow-hard",
            "bg-background hover:bg-red-50 hover:border-red-500 hover:text-red-500",
            "transition-all duration-200 transform hover:scale-110 active:scale-95",
            isDisliking && "animate-pulse bg-red-100"
          )}
        >
          <X className="w-8 h-8" />
        </Button>

        {/* Botão Like/Vibe */}
        <Button
          onClick={handleLike}
          disabled={isLiking || isDisliking}
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 border-4 border-foreground shadow-hard",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "transition-all duration-200 transform hover:scale-110 active:scale-95",
            isLiking && "animate-pulse"
          )}
        >
          <Flame className="w-8 h-8" />
        </Button>
      </div>
    </div>
  )
}