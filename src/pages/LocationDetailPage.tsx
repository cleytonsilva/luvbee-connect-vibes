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
  Phone,
  Globe,
  Users,
  Calendar
} from 'lucide-react'
import { LocationService } from '@/services/location.service'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase'
import { LocationData } from '@/types/app.types'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

  // Priorizar imagem salva no Supabase Storage
  const hasSupabaseImage = location.image_url && location.image_url.includes('supabase.co/storage')
  const imageUrl = 
    (hasSupabaseImage ? location.image_url : null) ||
    location.photo_url || 
    (Array.isArray(location.images) && location.images.length > 0 ? location.images[0] : null) ||
    location.image_url ||
    '/placeholder-location.jpg'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="relative">
        <div className="h-64 rounded-lg overflow-hidden shadow-hard border-2 border-foreground">
          <img
            src={imageUrl}
            alt={location.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-location.jpg'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
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
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h3>
            
            {user && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Write a Review</h4>
                <div className="flex items-center space-x-1 mb-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star
                      key={rating}
                      className={`h-5 w-5 cursor-pointer ${
                        rating <= newRating ? 'text-yellow-500 fill-current' : 'text-gray-300'
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
                            className={`h-4 w-4 ${
                              star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
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
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" className="w-full">
                <Globe className="h-4 w-4 mr-2" />
                Website
              </Button>
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
            <div className="bg-gray-200 h-32 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">{location.address}</p>
            {location.coordinates && (
              <p className="text-xs text-gray-500 mt-1">
                {location.coordinates.lat}, {location.coordinates.lng}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}