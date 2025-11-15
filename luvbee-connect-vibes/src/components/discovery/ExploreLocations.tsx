/**
 * ExploreLocations Component - LuvBee Core Platform
 * 
 * Componente para exibir grid/lista de locais na tela de exploração
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, Heart, Loader2 } from 'lucide-react'
import { useExploreLocations } from '@/hooks/useExploreLocations'
import { useAuth } from '@/hooks/useAuth'
import { LocationService } from '@/services/location.service'
import { useNavigate } from 'react-router-dom'
import type { LocationFilter } from '@/types/app.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ExploreLocationsProps {
  filter?: LocationFilter
  onLocationClick?: (locationId: string) => void
}

export function ExploreLocations({ filter, onLocationClick }: ExploreLocationsProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [likedLocations, setLikedLocations] = useState<Set<string>>(new Set())
  const limit = 20

  const { data: locations = [], isLoading, error, refetch } = useExploreLocations({
    filter,
    page,
    limit,
  })

  const handleLocationClick = (locationId: string) => {
    if (onLocationClick) {
      onLocationClick(locationId)
    } else {
      navigate(`/explore/location/${locationId}`)
    }
  }

  const handleLike = async (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast.error('Você precisa estar logado para dar like')
      return
    }

    try {
      await LocationService.createLocationMatch(user.id, locationId)
      setLikedLocations(prev => new Set(prev).add(locationId))
      toast.success('Match criado!')
    } catch (error) {
      console.error('Error creating location match:', error)
      toast.error('Erro ao criar match')
    }
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  if (isLoading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Erro ao carregar locais: {error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        <Button onClick={() => refetch()} className="mt-4">
          Tentar novamente
        </Button>
      </Card>
    )
  }

  if (locations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground text-lg font-semibold mb-2">
          Nenhum local encontrado
        </p>
        <p className="text-sm text-muted-foreground">
          Tente ajustar os filtros para ver mais resultados
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grid de Locais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => {
          const isLiked = likedLocations.has(location.id)
          const imageUrl = location.image_url || '/placeholder-location.jpg'
          const rating = location.rating || 0

          return (
            <Card
              key={location.id}
              className="overflow-hidden shadow-hard border-2 border-foreground cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleLocationClick(location.id)}
            >
              {/* Image */}
              <div className="relative h-48 bg-muted">
                <img
                  src={imageUrl}
                  alt={location.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-location.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute top-2 right-2 shadow-hard border-2 border-foreground",
                    isLiked ? "bg-primary text-primary-foreground" : "bg-card/80 hover:bg-card"
                  )}
                  onClick={(e) => handleLike(location.id, e)}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </Button>

                {/* Rating Badge */}
                {rating > 0 && (
                  <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground shadow-hard border-2 border-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {rating.toFixed(1)}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 line-clamp-1">{location.name}</h3>
                
                {location.address && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{location.address}</span>
                  </div>
                )}

                {location.type && (
                  <Badge variant="outline" className="mb-2 shadow-hard border-2 border-foreground">
                    {location.type}
                  </Badge>
                )}

                {location.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {location.description}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Load More Button */}
      {locations.length >= limit && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="shadow-hard border-2 border-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

