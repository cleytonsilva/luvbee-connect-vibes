import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MapPin,
  Clock,
  Star,
  Heart,
  Share2,
  Navigation,
  Users,
  Calendar
} from 'lucide-react'
import { LocationService } from '@/services/location.service'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase'
import { LocationData } from '@/types/app.types'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { usePlacePhoto } from '@/hooks/usePlacePhoto'
import { normalizeImageUrl } from '@/lib/image-url-utils'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PeopleForLocation } from '@/components/people/PeopleForLocation'

interface ReviewData {
  id: string
  location_id: string
  user_id: string
  rating: number
  comment?: string
  created_at: string
  user?: {
    id: string
    name?: string
    avatar_url?: string
  }
}

interface LocationDetailProps {
  locationId?: string
}

export function LocationDetail({ locationId }: LocationDetailProps) {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [location, setLocation] = useState<LocationData | null>(null)
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [newReview, setNewReview] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [staticMapError, setStaticMapError] = useState(false)

  // Hook calls must be at the top level, before any conditional returns
  // Usar o mesmo hook que LocationCard usa para buscar imagem
  // Priorizar imagem salva no Supabase Storage
  const rawImageUrl = location ?
    (location.image_url ||
      location.photo_url ||
      (Array.isArray(location.images) && location.images.length > 0 ? location.images[0] : null) ||
      null) : null

  // Normalizar URL para converter URLs antigas do Google Maps para Edge Function
  const normalizedUrl = location ? normalizeImageUrl(rawImageUrl, location.place_id) : null

  // Usar hook usePlacePhoto que busca do cache ou chama Edge Function
  const imageUrl = usePlacePhoto(location?.place_id || null, normalizedUrl)

  const targetLocationId = locationId || id

  useEffect(() => {
    if (targetLocationId) {
      loadLocation()
      loadReviews()
      checkFavoriteStatus()
    }
  }, [targetLocationId])

  const loadLocation = async () => {
    try {
      const result = await LocationService.getLocationById(targetLocationId!)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setLocation(result.data || null)
    } catch (error) {
      console.error('Error loading location:', error)
      toast.error('Failed to load location')
    } finally {
      setIsLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      // Tabela reviews não existe, retornar array vazio
      setReviews([])
    } catch (error) {
      console.error('Error loading reviews:', error)
      setReviews([])
    }
  }

  const checkFavoriteStatus = async () => {
    if (!user) return

    try {
      const result = await LocationService.getUserFavorites(user.id)
      if (result.error) return

      const favorites = result.data || []
      const isFav = favorites.some(fav => fav.id === targetLocationId)
      setIsFavorited(isFav)
    } catch (error) {
      console.error('Error checking favorite status:', error)
    }
  }

  const handleFavorite = async () => {
    if (!user || !location) return

    try {
      if (isFavorited) {
        const result = await LocationService.removeFromFavorites(location.id, user.id)
        if (result.error) {
          toast.error(result.error)
          return
        }
        setIsFavorited(false)
        toast.info('Removed from favorites')
      } else {
        const result = await LocationService.addToFavorites(location.id, user.id)
        if (result.error) {
          toast.error(result.error)
          return
        }
        setIsFavorited(true)
        toast.success('Added to favorites!')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  const handleCheckIn = async () => {
    if (!user || !location) return

    try {
      const result = await LocationService.checkIn(location.id, user.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Checked in successfully!')
      loadLocation()
    } catch (error) {
      console.error('Error checking in:', error)
      toast.error('Failed to check in')
    }
  }

  const handleUndoMatch = async () => {
    if (!user || !location) return
    const result = await LocationService.removeLocationMatch(user.id, location.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Match removido')
    loadLocation()
  }

  const handleAddReview = async () => {
    if (!user || !location || !newReview.trim()) return

    try {
      const result = await LocationService.addReview(location.id, user.id, newRating, newReview.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }

      setNewReview('')
      setNewRating(5)
      loadReviews()
      loadLocation()
      toast.success('Review added successfully!')
    } catch (error) {
      console.error('Error adding review:', error)
      toast.error('Failed to add review')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Location not found</h3>
        <p className="text-gray-600">The location you're looking for doesn't exist.</p>
      </div>
    )
  }

  // imageUrl is already computed at the top level to avoid hook order issues

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="relative">
        <div className="relative h-64 rounded-lg overflow-hidden shadow-hard border-2 border-foreground">
          <img
            src={imageUrl}
            alt={location.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-location.jpg'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold">{location.name}</h2>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleFavorite}
            className={isFavorited ? 'text-red-600' : ''}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{location.name}</h1>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{location.address}</span>
                </div>
              </div>
              <Badge variant="secondary">{location.category}</Badge>
            </div>

            <p className="text-gray-700 mb-4">{location.description}</p>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{location.average_rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{location.checkins_count || 0} check-ins</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{location.hours || 'Hours not specified'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Tabs defaultValue="reviews" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="people">Pessoas</TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="mt-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h3>

                {user && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Write a Review</h4>
                    <div className="flex items-center space-x-1 mb-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`h-5 w-5 cursor-pointer ${rating <= newRating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          onClick={() => setNewRating(rating)}
                        />
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <textarea
                        value={newReview}
                        onChange={(e) => setNewReview(e.target.value)}
                        placeholder="Share your experience..."
                        className="flex-1 p-2 border rounded-md resize-none"
                        rows={3}
                      />
                      <Button onClick={handleAddReview} disabled={!newReview.trim()}>
                        Post
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.user?.avatar_url} />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {review.user?.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-gray-900">{review.user?.name}</h5>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {reviews.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No reviews yet. Be the first to review!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="people" className="mt-4">
                <PeopleForLocation locationId={location.id} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Button onClick={handleCheckIn} className="w-full">
                <Navigation className="h-4 w-4 mr-2" />
                Check In
              </Button>
              {location.instagram && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const handle = location.instagram?.replace('@', '');
                    window.open(`https://instagram.com/${handle}`, '_blank');
                  }}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">Desfazer Match</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar desfazer</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação remove o match deste local.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUndoMatch}>Desfazer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>

          {location.amenities && location.amenities.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="space-y-2">
                {location.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            {(() => {
              // Obter coordenadas do local
              const lat = location.coordinates?.lat || location.lat || location.latitude;
              const lng = location.coordinates?.lng || location.lng || location.longitude;
              const hasCoords = lat != null && lng != null && lat !== 0 && lng !== 0;
              const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

              // URL do mapa estático
              const staticMapUrl = hasCoords && apiKey
                ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&markers=color:red%7C${lat},${lng}&key=${apiKey}`
                : null;

              // URL para abrir no Google Maps
              const googleMapsUrl = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                : location.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
                  : null;

              return staticMapUrl && !staticMapError ? (
                <a
                  href={googleMapsUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer group mb-4"
                >
                  <div className="h-40 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-primary transition-all relative shadow-md">
                    <img
                      src={staticMapUrl}
                      alt={`Mapa de ${location.name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={() => setStaticMapError(true)}
                    />
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700 shadow">
                      Abrir no Google Maps
                    </div>
                  </div>
                </a>
              ) : (
                <div className="bg-gray-100 h-40 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-500">
                      {staticMapError ? 'Mapa indisponível' : 'Coordenadas não disponíveis'}
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-sm text-gray-600">{location.address}</p>
            {(() => {
              const lat = location.coordinates?.lat || location.lat || location.latitude;
              const lng = location.coordinates?.lng || location.lng || location.longitude;
              const hasCoords = lat != null && lng != null && lat !== 0 && lng !== 0;
              return hasCoords ? (
                <p className="text-xs text-gray-500 mt-1">
                  {lat}, {lng}
                </p>
              ) : null;
            })()}
            {/* Botão Ver no Mapa */}
            {(() => {
              const lat = location.coordinates?.lat || location.lat || location.latitude;
              const lng = location.coordinates?.lng || location.lng || location.longitude;
              const hasCoords = lat != null && lng != null && lat !== 0 && lng !== 0;
              const googleMapsUrl = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                : location.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
                  : null;

              return googleMapsUrl ? (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.open(googleMapsUrl, '_blank')}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Ver no Google Maps
                </Button>
              ) : null;
            })()}
          </Card>
        </div>
      </div>
    </div>
  )
}
