import { useState, useEffect, useRef } from 'react'
import { LocationCard } from './LocationCard'
import { LocationService } from '../../services/location.service'
import type { LocationData } from '../../types/app.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase'

interface LocationListProps {
  className?: string
  onLocationSelect?: (locationId: string) => void
}

export function LocationList({ className = '', onLocationSelect }: LocationListProps) {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [mutualLikesMap, setMutualLikesMap] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const lastLoadedUserRef = useRef<string | null>(null)

  useEffect(() => {
    const userId = user?.id || null
    const shouldLoad = userId && userId !== lastLoadedUserRef.current
    if (shouldLoad) {
      lastLoadedUserRef.current = userId
      loadLocations()
    }
  }, [user])

  const loadLocations = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Buscar matches do usuário
      const matchesResult = await LocationService.getUserLocationMatches(user.id)
      if (matchesResult.error) {
        setError(matchesResult.error)
        setIsLoading(false)
        return
      }

      const matches = matchesResult.data || []
      if (matches.length === 0) {
        setLocations([])
        setIsLoading(false)
        return
      }

      // Extrair IDs dos locais
      const locationIds = matches.map((match: any) => match.location_id)

      // Buscar dados completos dos locais
      const locationsResult = await LocationService.getLocationsByIds(locationIds)
      if (locationsResult.error) {
        setError(locationsResult.error)
      } else {
        setLocations(locationsResult.data || [])
        
        // Buscar mutual likes para cada local
        if (user?.id) {
          try {
            const { data: mutualLikes, error: mutualError } = await supabase
              .rpc('get_locations_with_mutual_likes', {
                p_user_id: user.id
              })
            
            if (!mutualError && mutualLikes) {
              const map = new Map<string, number>()
              mutualLikes.forEach((item: any) => {
                map.set(item.location_id, item.mutual_count)
              })
              setMutualLikesMap(map)
            }
          } catch (err) {
            console.warn('Error loading mutual likes:', err)
            // Não bloquear a exibição se houver erro
          }
        }
      }
    } catch (error) {
      setError('Erro ao carregar locais favoritos')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[...Array(6)].map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (locations.length === 0 && !isLoading) {
    return (
      <Alert className={className}>
        <AlertDescription className="flex flex-col items-center gap-4 py-6">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">
              Você ainda não deu match com nenhum local.
            </p>
            <p className="text-muted-foreground mb-4">
              Explore a Vibe Local para descobrir lugares incríveis!
            </p>
            <Button onClick={() => navigate('/dashboard/vibe-local')} className="gap-2">
              <MapPin className="h-4 w-4" />
              Explorar Vibe Local
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {locations.map((location) => (
        <LocationCard
          key={location.id}
          location={location}
          onLocationClick={onLocationSelect}
          mutualLikesCount={mutualLikesMap.get(location.id)}
          onDislike={async () => {
            if (!user) return
            try {
              const res = await LocationService.removeLocationMatch(user.id, location.id)
              if (res.error) {
                toast.error('Erro ao desfazer match', { description: res.error })
                return
              }
              setLocations(prev => prev.filter(l => l.id !== location.id))
              toast.success('Match removido')
            } catch (e: any) {
              toast.error('Erro ao desfazer match', { description: e?.message })
            }
          }}
        />
      ))}
    </div>
  )
}