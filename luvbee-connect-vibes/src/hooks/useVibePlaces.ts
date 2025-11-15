import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase'
import type { Database } from '@/integrations/database.types'
import { LocationService } from '@/services/location.service'
import { safeLog } from '@/lib/safe-log'

type Location = Database['public']['Tables']['locations']['Row']

interface UseVibePlacesProps {
  userLocation?: { lat: number; lng: number } | null
  manualCity?: string | null
  manualState?: string | null
  mode?: 'normal' | 'solo'
  radius?: number // em metros
  maxCacheAge?: number // em dias
}

interface UseVibePlacesReturn {
  places: Location[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  cacheStatus: 'valid' | 'expired' | 'none'
}

export function useVibePlaces({
  userLocation,
  manualCity,
  manualState,
  mode = 'normal',
  radius = 5000, // 5km padrão
  maxCacheAge = 30
}: UseVibePlacesProps): UseVibePlacesReturn {
  const { user } = useAuth()
  const [places, setPlaces] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [cacheStatus, setCacheStatus] = useState<'valid' | 'expired' | 'none'>('none')
  const [currentOffset, setCurrentOffset] = useState(0)
  const limit = 20 // Limite de resultados por página
  const lastLocationRef = useRef<string | null>(null)
  const lastManualCityRef = useRef<string | null>(null)
  const lastManualStateRef = useRef<string | null>(null)
  const lastModeRef = useRef<string>('normal')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPlaces = useCallback(async (offset = 0, isLoadMore = false) => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // CASO 1: Sem GPS (Usa cidade/estado manual)
      if (!userLocation) {
        if (!manualCity || !manualState) {
          setError('Cidade e estado são necessários quando GPS está desligado')
          setLoading(false)
          return
        }

        // Busca simples no banco por cidade/estado
        const { data, error: dbError } = await supabase
          .rpc('get_places_by_city_state', {
            city_name: manualCity,
            state_name: manualState,
            filter_adult: mode === 'solo'
          })
          .range(offset, offset + limit - 1)

        if (dbError) throw dbError

        let resultData = data || []
        if (user?.id) {
          const matchesRes = await LocationService.getUserLocationMatches(user.id)
          const matchedSet = new Set(
            (matchesRes.data || []).map((m: any) => m.location_id || m.location?.id || m.location?.place_id).filter(Boolean)
          )
          resultData = resultData.filter((loc: any) => !matchedSet.has(loc.id) && !matchedSet.has(loc.place_id))
        }
        if (isLoadMore) {
          setPlaces(prev => [...prev, ...resultData])
        } else {
          setPlaces(resultData)
        }

        setHasMore((data?.length || 0) >= limit)
        setCacheStatus('none') // Sem cache para busca por cidade
        
      } else {
        // CASO 2: Com GPS (Otimizado)
        
        // Primeiro, verificar se tem cache válido
        const { data: cacheData, error: cacheError } = await supabase
          .rpc('check_search_cache', {
            lat: userLocation.lat,
            long: userLocation.lng,
            radius_meters: radius,
            search_type: mode,
            max_age_days: maxCacheAge
          })

        if (cacheError) {
          safeLog('warn', 'Erro ao verificar cache:', cacheError)
        }

        setCacheStatus(cacheData ? 'valid' : 'expired')

        // Se não tem cache válido, disparar Edge Function em background (com proteção)
        if (!cacheData) {
          safeLog('info', 'Cache expirado, buscando novos lugares...')
          
          // Adicionar flag para prevenir múltiplas chamadas (incluir raio e modo)
          const cacheKey = `fetching_${userLocation.lat}_${userLocation.lng}_${radius}_${mode}`
          if (!sessionStorage.getItem(cacheKey)) {
            sessionStorage.setItem(cacheKey, 'true')
            
            // Buscar novos lugares do Google (não bloqueante)
            if (navigator.onLine) {
              supabase.functions.invoke('fetch-places-google', {
                body: { 
                  lat: userLocation.lat, 
                  lng: userLocation.lng, 
                  radius: radius,
                  type: mode === 'solo' ? 'night_club|bar' : 'bar|night_club|restaurant'
                }
            }).then(({ error }) => {
                if (error) {
                  safeLog('warn', 'Função de cache indisponível (provável CORS/Edge):', error?.message || error)
                } else {
                  safeLog('info', 'Novos lugares cacheados com sucesso')
                }
                // Remover flag após 5 minutos
                setTimeout(() => sessionStorage.removeItem(cacheKey), 300000)
              }).catch(err => {
                safeLog('warn', 'Erro ao invocar função de cache (não bloqueante):', err?.message || err)
                sessionStorage.removeItem(cacheKey)
              })
            } else {
              // Offline: apenas remover flag rapidamente
              setTimeout(() => sessionStorage.removeItem(cacheKey), 5000)
            }
          } else {
            safeLog('info', 'Busca de lugares já em andamento, ignorando...')
          }
        }

        // Buscar lugares do banco local (sempre priorizar local)
        const { data, error: dbError } = await supabase
          .rpc('get_places_nearby', {
            lat: userLocation.lat,
            long: userLocation.lng,
            radius_meters: radius,
            filter_adult: mode === 'solo'
          })
          .range(offset, offset + limit - 1)

        if (dbError) {
          safeLog('error', '[useVibePlaces] Erro RPC get_places_nearby:', dbError)
          throw dbError
        }

        let resultData = data || []
        if (user?.id) {
          const matchesRes = await LocationService.getUserLocationMatches(user.id)
          const matchedSet = new Set(
            (matchesRes.data || []).map((m: any) => m.location_id || m.location?.id || m.location?.place_id).filter(Boolean)
          )
          resultData = resultData.filter((loc: any) => !matchedSet.has(loc.id) && !matchedSet.has(loc.place_id))
        }
        if (isLoadMore) {
          setPlaces(prev => [...prev, ...resultData])
        } else {
          setPlaces(resultData)
        }

        setHasMore((data?.length || 0) >= limit)
      }

    } catch (err) {
      safeLog('error', '[useVibePlaces] Erro ao buscar lugares:', err)
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao buscar lugares'
      
      if (err instanceof Error) {
        if (err.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Tempo esgotado. Tente novamente em alguns segundos.'
        } else if (err.message.includes('permission')) {
          errorMessage = 'Permissão negada. Verifique suas configurações.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, userLocation, manualCity, manualState, mode, radius, maxCacheAge])

  const refresh = useCallback(async () => {
    setCurrentOffset(0)
    await fetchPlaces(0, false)
  }, [fetchPlaces])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    const newOffset = currentOffset + limit
    setCurrentOffset(newOffset)
    await fetchPlaces(newOffset, true)
  }, [loading, hasMore, currentOffset, fetchPlaces])

  // Buscar lugares quando houver mudanças nos parâmetros (com proteção contra loop)
  useEffect(() => {
    // Criar chave única para os parâmetros atuais
    const locationKey = userLocation ? `${userLocation.lat},${userLocation.lng}` : null
    const hasLocationChanged = locationKey !== lastLocationRef.current
    const hasCityChanged = manualCity !== lastManualCityRef.current
    const hasStateChanged = manualState !== lastManualStateRef.current
    const hasModeChanged = mode !== lastModeRef.current

    // Verificar se realmente houve mudança significativa
    const shouldFetch = hasLocationChanged || hasCityChanged || hasStateChanged || hasModeChanged

    if (shouldFetch) {
      // Limpar timeout anterior se existir
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Adicionar debounce de 500ms para evitar múltiplas chamadas rápidas
      debounceTimeoutRef.current = setTimeout(() => {
        setCurrentOffset(0)
        fetchPlaces(0, false)
        
        // Atualizar refs com os novos valores
        lastLocationRef.current = locationKey
        lastManualCityRef.current = manualCity
        lastManualStateRef.current = manualState
        lastModeRef.current = mode
      }, 500)
    }

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [userLocation, manualCity, manualState, mode, fetchPlaces])

  return {
    places,
    loading,
    error,
    refresh,
    hasMore,
    loadMore,
    cacheStatus
  }
}
