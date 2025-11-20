import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/ui/star-rating'
import { 
  MapPin, 
  Clock, 
  Users, 
  Camera, 
  X,
  Check,
  Heart
} from 'lucide-react'
import { LocationService } from '@/services/location.service'
import { useAuth } from '@/hooks/useAuth'
import { CheckIn, Review } from '@/types/app.types'
import { formatDistanceToNow } from 'date-fns'

interface CheckInModalProps {
  location: LocationData
  isOpen: boolean
  onClose: () => void
  onCheckIn?: (checkInData: any) => void
}

export function CheckInModal({ location, isOpen, onClose, onCheckIn }: CheckInModalProps) {
  const { user, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const handleCheckIn = async () => {
    if (!user || !location) return

    setIsSubmitting(true)
    try {
      const checkInData = await LocationService.checkIn(location.id, user.id, {
        rating,
        review,
        is_public: isPublic
      })

      onCheckIn?.(checkInData)
      onClose()
    } catch (error) {
      console.error('Error checking in:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Check In</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-600">{location.address}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate your experience
              </label>
              <StarRating rating={rating} onRatingChange={setRating} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write a review (optional)
              </label>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience at this location..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Make this check-in public</span>
              </div>
              <Button
                variant={isPublic ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPublic(!isPublic)}
              >
                {isPublic ? 'Public' : 'Private'}
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckIn}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface CheckInCardProps {
  checkIn: any
  onLike?: (checkInId: string) => void
  onComment?: (checkInId: string) => void
}

export function CheckInCard({ checkIn, onLike, onComment }: CheckInCardProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(checkIn.is_liked || false)
  const [likeCount, setLikeCount] = useState(checkIn.likes_count || 0)

  const handleLike = async () => {
    if (!user) return

    try {
      if (isLiked) {
        await LocationService.unlikeCheckIn(checkIn.id, user.id)
        setIsLiked(false)
        setLikeCount(prev => prev - 1)
      } else {
        await LocationService.likeCheckIn(checkIn.id, user.id)
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
      onLike?.(checkIn.id)
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={checkIn.user?.avatar_url} />
              <AvatarFallback className="bg-purple-100 text-purple-600">
                {checkIn.user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-gray-900">{checkIn.user?.name}</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{checkIn.location?.name}</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary">Check-in</Badge>
        </div>

        {checkIn.rating > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < checkIn.rating ? 'text-yellow-400' : 'text-gray-300'}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-600">{checkIn.rating}/5</span>
          </div>
        )}

        {checkIn.review && (
          <p className="text-gray-700">{checkIn.review}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={isLiked ? 'text-red-600' : 'text-gray-500'}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment?.(checkIn.id)}
              className="text-gray-500"
            >
              <Camera className="h-4 w-4 mr-1" />
              Comment
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            {checkIn.is_public ? 'Public' : 'Private'}
          </div>
        </div>
      </div>
    </Card>
  )
}