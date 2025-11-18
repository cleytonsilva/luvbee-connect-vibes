/**
 * PlaceSearch Component - Busca lugares próximos usando Google Places API
 * Integra Places UI Kit quando disponível, com fallback para API direta
 * Baseado em: https://developers.google.com/maps/documentation/javascript/places-ui-kit/place-details?hl=pt-br
 */

import { useEffect, useState } from 'react'
import { GoogleMapsLoader } from '@/services/google-maps-loader.service'
import { GooglePlacesService } from '@/services/google-places.service'
import { Card } from '@/components/ui/card'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PlaceSearchProps {
  latitude: number
  longitude: number
  radius?: number
  onPlaceSelect?: (place: {
    place_id: string
    name?: string
    formatted_address?: string
    geometry?: {
      lat: number
      lng: number
    }
  }) => void
}

export function PlaceSearch({ latitude, longitude, radius = 5000, onPlaceSelect }: PlaceSearchProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [places, setPlaces] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        await GoogleMapsLoader.load()
        setIsLoaded(true)
      } catch (error) {
        console.error('[PlaceSearch] Erro ao carregar Google Maps:', error)
      }
    }

    initialize()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !isLoaded) return

    setIsSearching(true)
    setPlaces([])

    try {
      // Usar Google Places Nearby Search API diretamente
      const result = await GooglePlacesService.searchNearby({
        latitude,
        longitude,
        radius,
        keyword: searchQuery,
      })

      if (result.error) {
        console.error('[PlaceSearch] Erro na busca:', result.error)
        return
      }

      if (result.data) {
        // Converter resultados do Google Places para formato esperado
        const formattedPlaces = result.data.map((place) => ({
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.vicinity || place.formatted_address,
          geometry: place.geometry
            ? {
                lat: place.geometry.location?.lat || place.geometry.location?.latitude,
                lng: place.geometry.location?.lng || place.geometry.location?.longitude,
              }
            : undefined,
          rating: place.rating,
          price_level: place.price_level,
          types: place.types,
          photos: place.photos,
        }))

        setPlaces(formattedPlaces)
      }
    } catch (error) {
      console.error('[PlaceSearch] Erro ao buscar lugares:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Buscar Lugares</h3>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ex: bares, restaurantes, baladas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
            disabled={!isLoaded || isSearching}
          />
          <Button onClick={handleSearch} disabled={!searchQuery || !isLoaded || isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Buscar'
            )}
          </Button>
        </div>

        {/* Lista de resultados */}
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Buscando lugares...</span>
          </div>
        )}

        {!isSearching && places.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-semibold text-sm">
              {places.length} {places.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {places.map((place) => (
                <Card
                  key={place.place_id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-2"
                  onClick={() => {
                    if (onPlaceSelect) {
                      onPlaceSelect({
                        place_id: place.place_id,
                        name: place.name,
                        formatted_address: place.formatted_address,
                        geometry: place.geometry,
                      })
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm truncate">{place.name || 'Sem nome'}</h5>
                      <p className="text-xs text-muted-foreground truncate">
                        {place.formatted_address || 'Endereço não disponível'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {place.rating && (
                          <p className="text-xs text-muted-foreground">
                            ⭐ {place.rating.toFixed(1)}
                          </p>
                        )}
                        {place.price_level && (
                          <p className="text-xs text-muted-foreground">
                            {'$'.repeat(place.price_level)}
                          </p>
                        )}
                        {place.types && place.types.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {place.types[0].replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isSearching && places.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum lugar encontrado. Tente uma busca diferente.
          </p>
        )}

        {!isSearching && places.length === 0 && !searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Digite uma busca para encontrar lugares próximos
          </p>
        )}
      </div>
    </Card>
  )
}

