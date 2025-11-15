/**
 * LocationDetail Component - LuvBee Core Platform
 * 
 * Componente para exibir detalhes completos de um local
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Star, Heart, Clock, Phone, Globe } from 'lucide-react'
import { useLocationDetail } from '@/hooks/useExploreLocations'
import { useAuth } from '@/hooks/useAuth'
import { LocationService } from '@/services/location.service'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function LocationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: location, isLoading, error } = useLocationDetail(id || null)
  const [isLiked, setIsLiked] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para dar like')
      navigate('/auth')
      return
    }

    if (!location) return

    setIsLiking(true)
    try {
      await LocationService.createLocationMatch(user.id, location.id)
      setIsLiked(true)
      toast.success('Match criado! Você pode ver este local em seus matches')
    } catch (error) {
      console.error('Error creating location match:', error)
      toast.error('Erro ao criar match')
    } finally {
      setIsLiking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !location) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-8 text-center">
          <p className="text-destructive text-lg font-semibold mb-2">
            Local não encontrado
          </p>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Este local pode ter sido removido'}
          </p>
          <Button onClick={() => navigate('/explore')}>
            Voltar para Explorar
          </Button>
        </Card>
      </div>
    )
  }

  const imageUrl = location.image_url || '/placeholder-location.jpg'
  const rating = location.rating || 0
  const priceLevel = location.price_level || 0
  const priceSymbols = ['$', '$$', '$$$', '$$$$']
  const price = priceSymbols[priceLevel - 1] || 'N/A'

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="shadow-hard border-2 border-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold flex-1">{location.name}</h1>
      </div>

      {/* Main Image */}
      <Card className="overflow-hidden shadow-hard border-2 border-foreground">
        <div className="relative h-96 bg-muted">
          <img
            src={imageUrl}
            alt={location.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-location.jpg'
            }}
          />
        </div>
      </Card>

      {/* Details */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6 shadow-hard border-2 border-foreground">
            <h2 className="text-2xl font-bold mb-4">Sobre</h2>
            {location.description && (
              <p className="text-muted-foreground mb-4">{location.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2">
              {location.type && (
                <Badge variant="outline" className="shadow-hard border-2 border-foreground">
                  {location.type}
                </Badge>
              )}
              {rating > 0 && (
                <Badge variant="outline" className="shadow-hard border-2 border-foreground">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {rating.toFixed(1)}
                </Badge>
              )}
              {priceLevel > 0 && (
                <Badge variant="outline" className="shadow-hard border-2 border-foreground">
                  {price}
                </Badge>
              )}
            </div>
          </Card>

          {/* Additional Info */}
          {(location.address || location.phone || location.website) && (
            <Card className="p-6 shadow-hard border-2 border-foreground">
              <h3 className="text-xl font-bold mb-4">Informações</h3>
              <div className="space-y-3">
                {location.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{location.address}</span>
                  </div>
                )}
                {location.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <a href={`tel:${location.phone}`} className="text-primary hover:underline">
                      {location.phone}
                    </a>
                  </div>
                )}
                {location.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <a
                      href={location.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {location.website}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-6 shadow-hard border-2 border-foreground">
            <Button
              onClick={handleLike}
              disabled={isLiking || isLiked}
              className="w-full shadow-hard border-2 border-foreground"
              size="lg"
            >
              <Heart className={cn("w-5 h-5 mr-2", isLiked && "fill-current")} />
              {isLiked ? 'Match Criado!' : 'Dar Match'}
            </Button>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6 shadow-hard border-2 border-foreground">
            <h3 className="font-bold mb-4">Estatísticas</h3>
            <div className="space-y-2 text-sm">
              {rating > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avaliação</span>
                  <span className="font-semibold">{rating.toFixed(1)} / 5.0</span>
                </div>
              )}
              {priceLevel > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-semibold">{price}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

