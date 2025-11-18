/**
 * Hook useLocations - Gerenciar locais e matches
 * T039: User Story 2 - Core Loop 1: Vibe Local
 * 
 * Busca diretamente do Google Places API para encontrar baladas, restaurantes,
 * botecos e casas de show em todo o Brasil
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocationService } from '@/services/location.service'
import { GooglePlacesService } from '@/services/google-places.service'
import { useAuth } from '@/hooks/useAuth'
import type { Location } from '@/types/location.types'
import type { GooglePlace } from '@/services/google-places.service'
import { toast } from 'sonner'

interface UseLocationsOptions {
  latitude?: number
  longitude?: number
  radius?: number
  enabled?: boolean
}

/**
 * Converte GooglePlace para Location
 */
function convertGooglePlaceToLocation(place: GooglePlace, userLat?: number, userLng?: number): Location {
  const lat = place.geometry.location.lat
  const lng = place.geometry.location.lng
  
  // Determinar categoria baseado nos tipos do Google Places
  // Priorizar tipos mais específicos primeiro
  let category = 'outro'
  if (place.types && place.types.length > 0) {
    const types = place.types.map(t => t.toLowerCase())
    
    // Tipos específicos de entretenimento noturno
    if (types.some(t => ['night_club', 'nightclub'].includes(t))) {
      category = 'balada'
    } 
    // Restaurantes
    else if (types.some(t => ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(t))) {
      category = 'restaurante'
    } 
    // Bares e pubs
    else if (types.some(t => ['bar', 'pub', 'lounge', 'cafe'].includes(t))) {
      category = 'bar'
    }
    // Casas de show e entretenimento (mais específicos)
    else if (types.some(t => ['amusement_center', 'bowling_alley', 'casino', 'movie_theater', 'stadium', 'tourist_attraction'].includes(t))) {
      category = 'casa_de_show'
    }
    // Se não encontrar tipo específico, verificar se tem algum indicador de entretenimento
    else if (types.some(t => ['establishment', 'point_of_interest'].includes(t))) {
      // Só classificar como casa_de_show se o nome sugerir entretenimento
      const nameLower = place.name.toLowerCase()
      const entertainmentKeywords = ['show', 'showcase', 'teatro', 'theater', 'concerto', 'concert', 'evento', 'event', 'festival', 'festa', 'party']
      if (entertainmentKeywords.some(keyword => nameLower.includes(keyword))) {
        category = 'casa_de_show'
      } else {
        // Se não tem indicadores claros, deixar como 'outro'
        category = 'outro'
      }
    }
  }

  // Calcular distância se tiver coordenadas do usuário
  let distance: number | undefined
  if (userLat && userLng) {
    const R = 6371 // Raio da Terra em km
    const dLat = ((lat - userLat) * Math.PI) / 180
    const dLon = ((lng - userLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    distance = R * c * 1000 // Distância em metros
  }

  return {
    id: place.place_id, // Usar place_id como ID temporário
    name: place.name,
    address: place.formatted_address,
    category,
    type: category, // Mapear category para type também
    description: null,
    images: place.photos?.map(p => {
      // Se photo_reference é uma URL completa, usar diretamente
      if (p.photo_reference && p.photo_reference.startsWith('http')) {
        return p.photo_reference
      }
      // Usar Edge Function para proteger a chave da API
      if (p.photo_reference) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (supabaseUrl) {
          const url = new URL(`${supabaseUrl}/functions/v1/get-place-photo`)
          url.searchParams.set('photoreference', p.photo_reference)
          url.searchParams.set('maxwidth', '400')
          if (supabaseAnonKey) {
            url.searchParams.set('apikey', supabaseAnonKey)
          }
          return url.toString()
        }
      }
      return ''
    }).filter(url => url) || null,
    image_url: place.photos?.[0]?.photo_reference 
      ? (place.photos[0].photo_reference.startsWith('http') 
          ? place.photos[0].photo_reference 
          : (() => {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              if (!supabaseUrl) return ''
              const url = new URL(`${supabaseUrl}/functions/v1/get-place-photo`)
              url.searchParams.set('photoreference', place.photos[0].photo_reference)
              url.searchParams.set('maxwidth', '400')
              if (supabaseAnonKey) {
                url.searchParams.set('apikey', supabaseAnonKey)
              }
              return url.toString()
            })())
      : '',
    rating: place.rating || 0,
    price_level: place.price_level || null,
    phone: place.phone_number || null,
    website: place.website || null,
    opening_hours: place.opening_hours || null,
    location: null,
    lat,
    lng,
    owner_id: null,
    is_verified: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Campos adicionais do Google Places
    place_id: place.place_id,
    distance_meters: distance,
    types: place.types,
  } as Location
}

export function useLocations(options: UseLocationsOptions = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { latitude, longitude, radius = 5000, enabled = true } = options

  const [currentIndex, setCurrentIndex] = useState(0)
  const [rejectedPlaceIds, setRejectedPlaceIds] = useState<Set<string>>(new Set())

  // Buscar locais do cache (banco de dados) primeiro
  const {
    data: cachedLocations,
    isLoading: isLoadingCache,
  } = useQuery({
    queryKey: ['cached-locations', latitude, longitude, radius],
    queryFn: async () => {
      if (!latitude || !longitude) {
        return []
      }

      // Buscar locais do banco próximos à localização do usuário
      const result = await LocationService.getNearbyLocations(latitude, longitude, radius)
      if (result.error || !result.data) {
        return []
      }

      // Converter LocationData para GooglePlace format (para compatibilidade)
      return result.data.map(loc => ({
        place_id: loc.place_id || loc.id,
        name: loc.name,
        formatted_address: loc.address,
        geometry: {
          location: {
            lat: loc.location?.lat || loc.lat || loc.latitude || 0,
            lng: loc.location?.lng || loc.lng || loc.longitude || 0,
          },
        },
        rating: loc.rating || 0,
        price_level: loc.price_level || undefined,
        photos: loc.images?.map(img => ({
          photo_reference: img,
        })) || [],
        types: loc.type ? [loc.type] : (loc.category ? [loc.category] : []),
        phone_number: loc.phone,
        website: loc.website,
        opening_hours: loc.opening_hours,
      } as GooglePlace))
    },
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 24 * 60 * 60 * 1000, // 24 horas - cache mais longo para locais do banco
  })

  // Buscar locais da API do Google Places apenas se necessário
  const {
    data: googlePlaces,
    isLoading: isLoadingPlaces,
    error: placesError,
    refetch: refetchPlaces,
  } = useQuery({
    queryKey: ['google-places', latitude, longitude, radius],
    queryFn: async () => {
      if (!latitude || !longitude) {
        throw new Error('Localização não disponível')
      }

      // Buscar múltiplos tipos de estabelecimentos em paralelo
      const types = ['night_club', 'restaurant', 'bar', 'establishment']
      const searchPromises = types.map(type =>
        GooglePlacesService.searchNearby({
          latitude,
          longitude,
          radius,
          type,
        })
      )

      const results = await Promise.all(searchPromises)

      // Validar respostas e propagar erros do Google Places para o React Query
      const errorMessages = results
        .map((result, index) =>
          result.error ? `Erro ao buscar locais do tipo ${types[index]}: ${result.error}` : null
        )
        .filter((message): message is string => Boolean(message))

      if (errorMessages.length) {
        const combinedMessage = errorMessages.join(' | ')
        console.error('Falha ao buscar locais no Google Places:', combinedMessage)
        throw new Error(combinedMessage)
      }

      // Combinar todos os resultados e remover duplicatas por place_id
      const allPlaces: GooglePlace[] = []
      const seenPlaceIds = new Set<string>()

      results.forEach(result => {
        if (result.data) {
          result.data.forEach(place => {
            if (!seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id)
              allPlaces.push(place)
            }
          })
        }
      })

      // Ordenar por rating (maior primeiro) e depois por distância
      allPlaces.sort((a, b) => {
        // Primeiro por rating
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingB !== ratingA) {
          return ratingB - ratingA
        }
        // Depois por distância (se disponível)
        return 0
      })

      return allPlaces
    },
    enabled: enabled && !!latitude && !!longitude && (cachedLocations?.length || 0) < 10, // Buscar da API apenas se tiver menos de 10 locais no cache
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Combinar locais do cache e da API, removendo duplicatas robustamente
  const allGooglePlaces = useMemo(() => {
    const cachedPlaceIds = new Set(cachedLocations?.map(loc => loc.place_id) || [])
    const apiPlaces = googlePlaces || []
    
    // Adicionar locais da API que não estão no cache
    const newPlaces = apiPlaces.filter(place => !cachedPlaceIds.has(place.place_id))
    
    // Combinar cache + novos locais da API
    const combined = [...(cachedLocations || []), ...newPlaces]
    
    // Remover duplicatas por place_id (caso algum escape do filtro anterior)
    const seenPlaceIds = new Set<string>()
    const uniquePlaces: GooglePlace[] = []
    
    combined.forEach(place => {
      const placeId = place.place_id
      if (placeId && !seenPlaceIds.has(placeId)) {
        seenPlaceIds.add(placeId)
        uniquePlaces.push(place)
      }
    })
    
    return uniquePlaces
  }, [cachedLocations, googlePlaces])

  // Converter GooglePlaces para Locations e filtrar categorias inválidas
  // Remover duplicatas por place_id após conversão também
  const allLocations: Location[] = useMemo(() => {
    const locations = (allGooglePlaces || [])
      .map(place => convertGooglePlaceToLocation(place, latitude, longitude))
      .filter(loc => loc.category !== 'outro') // Remover locais classificados como "outro"
    
    // Remover duplicatas finais por place_id (garantia extra)
    const seenPlaceIds = new Set<string>()
    const uniqueLocations: Location[] = []
    
    locations.forEach(loc => {
      const placeId = loc.place_id
      if (placeId && !seenPlaceIds.has(placeId)) {
        seenPlaceIds.add(placeId)
        uniqueLocations.push(loc)
      } else if (!placeId) {
        // Se não tem place_id, usar id como fallback
        const id = loc.id
        if (id && !seenPlaceIds.has(id)) {
          seenPlaceIds.add(id)
          uniqueLocations.push(loc)
        }
      }
    })
    
    return uniqueLocations
  }, [allGooglePlaces, latitude, longitude])

  // Filtrar locais já curtidos usando função RPC no backend
  const {
    data: unmatchedPlaceIds,
    isLoading: isLoadingFilter,
  } = useQuery({
    queryKey: ['filter-unmatched-locations', user?.id, allLocations.map(l => l.place_id).join(',')],
    queryFn: async () => {
      if (!user || !allLocations.length) return []
      
      const placeIds = allLocations
        .map(loc => loc.place_id)
        .filter(Boolean) as string[]
      
      if (placeIds.length === 0) return []
      
      const result = await LocationService.filterUnmatchedLocations(user.id, placeIds)
      if (result.error) {
        // Se erro, retornar todos os place_ids (fallback)
        return placeIds
      }
      return result.data || []
    },
    enabled: !!user && allLocations.length > 0,
  })

  // Filtrar locais baseado no resultado da função RPC e rejeições locais
  const unmatchedLocations = useMemo(() => {
    // Primeiro, remover locais rejeitados localmente (feedback imediato)
    const withoutRejected = allLocations.filter(loc => 
      !loc.place_id || !rejectedPlaceIds.has(loc.place_id)
    )
    
    if (!unmatchedPlaceIds || unmatchedPlaceIds.length === 0) {
      // Se ainda não carregou, mostrar todos (será filtrado quando carregar)
      // Mas se já carregou e está vazio, não mostrar nada
      if (isLoadingFilter) {
        return withoutRejected
      }
      // Se não está carregando e não há place_ids, significa que todos foram filtrados
      return []
    }
    return withoutRejected.filter(loc => loc.place_id && unmatchedPlaceIds.includes(loc.place_id))
  }, [allLocations, unmatchedPlaceIds, isLoadingFilter, rejectedPlaceIds])

  // Mutation para criar match com local
  const createMatchMutation = useMutation({
    mutationFn: async (location: Location) => {
      if (!user) throw new Error('Usuário não autenticado')
      
      // Primeiro, verificar se o local existe no banco
      // Se não existir, criar usando o place_id
      let locationId: string = location.id
      
      // Se o ID é um place_id (não UUID), precisamos criar ou buscar no banco
      if (location.place_id && (!location.id || !location.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        // Buscar local no banco por place_id
        const existingResult = await LocationService.getLocationByPlaceId(location.place_id)
        
        if (existingResult.data) {
          locationId = existingResult.data.id
        } else {
          // Criar local no banco
          const createResult = await LocationService.createLocationFromGooglePlace(location)
          if (createResult.error) {
            throw new Error(createResult.error)
          }
          if (!createResult.data) {
            throw new Error('Failed to create location from Google Place')
          }
          locationId = createResult.data.id
        }
      }
      
      const result = await LocationService.createLocationMatch(user.id, locationId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: async () => {
      // Invalidar queries para forçar recálculo da filtragem no backend
      await queryClient.invalidateQueries({ queryKey: ['filter-unmatched-locations', user?.id] })
      await queryClient.invalidateQueries({ queryKey: ['location-matches', user?.id] })
      toast.success('Local curtido!', { description: 'Você deu match com este local' })
    },
    onError: (error: Error) => {
      toast.error('Erro ao curtir local', { description: error.message })
    },
  })

  // Mutation para remover match com local
  const removeMatchMutation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!user) throw new Error('Usuário não autenticado')
      const result = await LocationService.removeLocationMatch(user.id, locationId)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      // Invalidar queries para forçar recálculo da filtragem no backend
      await queryClient.invalidateQueries({ queryKey: ['filter-unmatched-locations', user?.id] })
      await queryClient.invalidateQueries({ queryKey: ['location-matches', user?.id] })
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover match', { description: error.message })
    },
  })

  // Função para dar like em um local
  const likeLocation = useCallback(
    async (locationId: string) => {
      const location = unmatchedLocations.find(loc => loc.id === locationId)
      if (!location) return
      
      // Avançar para o próximo local imediatamente (antes de salvar)
      setCurrentIndex(prev => {
        const nextIndex = prev + 1
        // Se não há mais locais, manter o índice atual
        if (nextIndex >= unmatchedLocations.length) {
          return prev
        }
        return nextIndex
      })
      
      // Salvar o match em background (não bloquear a UI)
      try {
        await createMatchMutation.mutateAsync(location)
      } catch (error) {
        // Erro já é tratado pelo onError da mutation
      }
    },
    [createMatchMutation, unmatchedLocations]
  )

  // Função para dar dislike em um local
  const dislikeLocation = useCallback(
    async (locationId: string) => {
      const location = unmatchedLocations.find(loc => loc.id === locationId)
      if (!location) return
      
      // Avançar para o próximo local imediatamente
      setCurrentIndex(prev => {
        const nextIndex = prev + 1
        // Se não há mais locais, manter o índice atual
        if (nextIndex >= unmatchedLocations.length) {
          return prev
        }
        return nextIndex
      })
      
      // Salvar rejeição em background (não bloquear a UI)
      if (user && location.place_id) {
        // Remover imediatamente da lista local (feedback visual imediato)
        setRejectedPlaceIds(prev => new Set(prev).add(location.place_id!))
        
        try {
          // Criar registro de rejeição para cálculo de taxa
          await LocationService.createLocationRejection(user.id, location.place_id)
          
          // Invalidar todas as queries relacionadas usando prefixo
          await queryClient.invalidateQueries({ 
            queryKey: ['filter-unmatched-locations', user.id],
            exact: false // Invalidar todas as queries que começam com essa key
          })
          
          // Forçar refetch da query atual
          await queryClient.refetchQueries({ 
            queryKey: ['filter-unmatched-locations', user.id],
            exact: false
          })
          
          // Se o usuário tinha dado like antes, remover o match
          // Buscar o ID real do local no banco primeiro para evitar erro 406
          const locationResult = await LocationService.getLocationByPlaceId(location.place_id)
          const realLocationId = locationResult.data?.id || location.place_id
          
          // Verificar se existe match usando o UUID do location (evita erro 406)
          if (locationResult.data?.id) {
            const existingMatch = await LocationService.hasLocationMatch(user.id, locationResult.data.id)
            if (existingMatch) {
              await removeMatchMutation.mutateAsync(locationResult.data.id)
            }
          } else {
            // Se não encontrou location no banco, tentar verificar diretamente por place_id
            const existingMatch = await LocationService.hasLocationMatch(user.id, location.place_id)
            if (existingMatch) {
              await removeMatchMutation.mutateAsync(location.place_id)
            }
          }
        } catch (error) {
          // Se erro ao salvar, reverter a remoção local
          setRejectedPlaceIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(location.place_id!)
            return newSet
          })
        }
      }
    },
    [removeMatchMutation, unmatchedLocations, user, queryClient]
  )

  // Obter local atual para exibição
  const currentLocation = unmatchedLocations[currentIndex] || null

  // Verificar se há mais locais disponíveis
  const hasMoreLocations = unmatchedLocations && currentIndex < unmatchedLocations.length - 1
  
  // Verificar se não há locais encontrados (busca inicial sem resultados)
  const isLoading = isLoadingPlaces || isLoadingFilter
  const hasNoLocations = !isLoading && unmatchedLocations && unmatchedLocations.length === 0 && currentIndex === 0

  // Resetar índice apenas quando os locais mudarem completamente (nova busca)
  // Não resetar quando apenas o array é atualizado após filtrar matches
  useEffect(() => {
    // Resetar apenas se o índice está fora do range dos locais disponíveis
    if (unmatchedLocations && unmatchedLocations.length > 0) {
      if (currentIndex >= unmatchedLocations.length) {
        // Se o índice está fora do range, resetar para o último disponível
        setCurrentIndex(Math.max(0, unmatchedLocations.length - 1))
      }
    } else if (unmatchedLocations && unmatchedLocations.length === 0 && currentIndex > 0) {
      // Se não há mais locais, resetar índice
      setCurrentIndex(0)
    }
  }, [unmatchedLocations.length, currentIndex]) // Resetar apenas quando o tamanho do array mudar

  return {
    // Locais
    locations: unmatchedLocations,
    currentLocation,
    currentIndex,
    hasMoreLocations,
    hasNoLocations,
    isLoading,
    error: placesError,

    // Ações
    likeLocation,
    dislikeLocation,
    refetch: refetchPlaces,

    // Estado das mutations
    isLiking: createMatchMutation.isPending,
    isDisliking: removeMatchMutation.isPending,
  }
}

