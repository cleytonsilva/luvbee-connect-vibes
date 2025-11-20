import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ROUTES } from '@/lib/constants'
import { 
  MapPin, 
  Users, 
  MessageCircle, 
  Heart, 
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { LocationService } from '@/services/location.service'
import { MatchService } from '@/services/match.service'
import { MessageService } from '@/services/message.service'
import { useAuth } from '@/hooks/useAuth'
import { Location, Match, MessageData } from '@/types/app.types'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([])
  const [recentMatches, setRecentMatches] = useState<UserProfile[]>([])
  const [recentMessages, setRecentMessages] = useState<MessageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCheckins: 0,
    totalMatches: 0,
    unreadMessages: 0,
    favoriteLocations: 0
  })

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [locations, matches, messages, favorites] = await Promise.all([
        LocationService.getLocations({ limit: 6 }),
        MatchService.getUserMatches(user.id, { limit: 6 }),
        MessageService.getRecentConversations(user.id),
        LocationService.getUserFavorites(user.id)
      ])

      setRecentLocations(locations.data)
      setRecentMatches(matches.map(m => m.target_user))
      setRecentMessages(messages.slice(0, 5))
      
      setStats({
        totalCheckins: profile?.checkins_count || 0,
        totalMatches: matches.length,
        unreadMessages: messages.reduce((total, conv) => total + conv.unread_count, 0),
        favoriteLocations: favorites.length
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationClick = (locationId: string) => {
    navigate(`${ROUTES.LOCATIONS}/${locationId}`)
  }

  const handlePersonClick = (userId: string) => {
    navigate(ROUTES.PEOPLE)
  }

  const handleMessageClick = (matchId: string) => {
    navigate(ROUTES.MESSAGES)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {profile?.name || user?.email}!
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover amazing locations and connect with like-minded people
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCheckins}</div>
          <div className="text-sm text-gray-600">Total Check-ins</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalMatches}</div>
          <div className="text-sm text-gray-600">Connections</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.unreadMessages}</div>
          <div className="text-sm text-gray-600">Unread Messages</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.favoriteLocations}</div>
          <div className="text-sm text-gray-600">Favorites</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Trending Locations</h2>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LOCATIONS)}>
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentLocations.map((location) => (
              <Card 
                key={location.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleLocationClick(location.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{location.address}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{location.checkins_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Trending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {recentLocations.length === 0 && (
              <Card className="p-6 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No trending locations found</p>
                <Button onClick={() => navigate(ROUTES.LOCATIONS)} className="mt-3" size="sm">
                  Explore Locations
                </Button>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Connections</h2>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.PEOPLE)}>
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentMatches.map((person) => (
              <Card 
                key={person.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePersonClick(person.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {person.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{person.bio}</p>
                    {person.location && (
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {person.location}
                      </p>
                    )}
                  </div>
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
              </Card>
            ))}
            
            {recentMatches.length === 0 && (
              <Card className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No connections yet</p>
                <Button onClick={() => navigate(ROUTES.PEOPLE)} className="mt-3" size="sm">
                  Find People
                </Button>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Messages</h2>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.MESSAGES)}>
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentMessages.map((message) => (
              <Card 
                key={message.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMessageClick(message.match_id)}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.sender?.avatar_url} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {message.sender?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{message.sender?.name}</h3>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{message.content}</p>
                  </div>
                  {!message.is_read && (
                    <Badge variant="destructive" className="ml-2">
                      New
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
            
            {recentMessages.length === 0 && (
              <Card className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No messages yet</p>
                <Button onClick={() => navigate(ROUTES.MESSAGES)} className="mt-3" size="sm">
                  Start Chatting
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}