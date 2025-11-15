import { useState, useEffect } from 'react'
import { LocationCard } from './LocationCard'
import { LocationService } from '../../services/location.service'
import type { LocationData, LocationFilter } from '../../types/app.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useVibeModeStore, isSoloPlace } from '@/store/useVibeMode'

interface LocationListProps {
  filter?: LocationFilter
  className?: string
  onLocationSelect?: (locationId: string) => void
}

export function LocationList({ filter, className = '', onLocationSelect }: LocationListProps) {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { soloMode } = useVibeModeStore()

  useEffect(() => {
    loadLocations()
  }, [filter, soloMode])

  const loadLocations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await LocationService.getLocations(filter)
      if (result.error) {
        setError(result.error)
      } else {
        const data = result.data || []
        const processed = soloMode
          ? data.filter((loc: any) => isSoloPlace(loc.name, (loc as any).types || (loc as any).google_place_data?.types || [], (loc as any).type))
          : data.filter((loc: any) => !isSoloPlace(loc.name, (loc as any).types || (loc as any).google_place_data?.types || [], (loc as any).type))
        setLocations(processed)
      }
    } catch (error) {
      setError('Failed to load locations')
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

  if (locations.length === 0) {
    return (
      <Alert className={className}>
        <AlertDescription>
          {soloMode ? 'Nenhum local adulto encontrado' : 'Nenhum local encontrado'}
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