/**
 * Hook para Google Places Autocomplete
 * Usa Google Maps JavaScript API Autocomplete (API legada mas com melhor controle de estilo)
 * A nova API PlaceAutocompleteElement cria elementos customizados que não seguem o design system
 */

import { useEffect, useRef, useState } from 'react'
import { GoogleMapsLoader } from '@/services/google-maps-loader.service'

interface UsePlacesAutocompleteOptions {
  inputId: string
  onPlaceSelect?: (place: {
    formatted_address: string
    place_id?: string
    geometry?: {
      lat: number
      lng: number
    }
  }) => void
  types?: string[]
  componentRestrictions?: {
    country?: string | string[]
  }
}

export function usePlacesAutocomplete({
  inputId,
  onPlaceSelect,
  types = ['geocode'],
  componentRestrictions,
}: UsePlacesAutocompleteOptions) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeAutocomplete = async () => {
      try {
        // Carregar Google Maps API
        await GoogleMapsLoader.load()

        if (!mounted) return

        // Verificar se o input existe - aguardar um pouco mais se necessário
        let input = document.getElementById(inputId) as HTMLInputElement
        if (!input) {
          // Tentar novamente após um delay
          await new Promise(resolve => setTimeout(resolve, 200))
          input = document.getElementById(inputId) as HTMLInputElement
        }

        if (!input) {
          console.warn(`[usePlacesAutocomplete] Input com id "${inputId}" não encontrado`)
          return
        }

        // Criar instância do Autocomplete (API legada mas com melhor controle)
        const autocomplete = new google.maps.places.Autocomplete(input, {
          types,
          componentRestrictions,
          fields: ['formatted_address', 'place_id', 'geometry'],
        })

        autocompleteRef.current = autocomplete

        // Listener para quando um lugar é selecionado
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()

          if (place.formatted_address && onPlaceSelect) {
            const location = {
              formatted_address: place.formatted_address,
              place_id: place.place_id,
              geometry: place.geometry?.location
                ? {
                    lat: typeof place.geometry.location.lat === 'function' 
                      ? place.geometry.location.lat() 
                      : (place.geometry.location as any).lat,
                    lng: typeof place.geometry.location.lng === 'function' 
                      ? place.geometry.location.lng() 
                      : (place.geometry.location as any).lng,
                  }
                : undefined,
            }

            onPlaceSelect(location)
          }
        })

        setIsLoaded(true)
        setError(null)
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar autocomplete'
          console.error('[usePlacesAutocomplete] Erro:', errorMessage)
          setError(errorMessage)
        }
      }
    }

    // Aguardar um pouco para garantir que o input está renderizado
    const timeoutId = setTimeout(() => {
      initializeAutocomplete()
    }, 300)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [inputId, onPlaceSelect, types, componentRestrictions])

  return {
    isLoaded,
    error,
    autocomplete: autocompleteRef.current,
  }
}
