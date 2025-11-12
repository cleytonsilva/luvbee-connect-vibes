/**
 * useExploreLocations Hook - LuvBee Core Platform
 * 
 * Hook para buscar e filtrar locais na tela de exploração
 */

import { useQuery } from '@tanstack/react-query'
import { LocationService } from '@/services/location.service'
import type { LocationFilter } from '@/types/app.types'
import type { Location } from '@/types/location.types'

interface UseExploreLocationsOptions {
  filter?: LocationFilter
  enabled?: boolean
  page?: number
  limit?: number
}

export function useExploreLocations(options: UseExploreLocationsOptions = {}) {
  const { filter, enabled = true, page = 1, limit = 20 } = options

  return useQuery({
    queryKey: ['explore-locations', filter, page, limit],
    queryFn: async () => {
      const result = await LocationService.getLocations(
        filter,
        {
          offset: (page - 1) * limit,
          limit,
        }
      )
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para buscar locais por categoria
 */
export function useLocationsByCategory(category: string | null) {
  return useExploreLocations({
    filter: category ? { category } : undefined,
    enabled: !!category,
  })
}

/**
 * Hook para buscar um local específico por ID
 */
export function useLocationDetail(locationId: string | null) {
  return useQuery({
    queryKey: ['location-detail', locationId],
    queryFn: async () => {
      if (!locationId) return null
      const result = await LocationService.getLocationById(locationId)
      if (result.error) throw new Error(result.error)
      return result.data ?? null
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para buscar categorias disponíveis
 */
export function useLocationCategories() {
  return useQuery({
    queryKey: ['location-categories'],
    queryFn: async () => {
      const result = await LocationService.getCategories()
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

