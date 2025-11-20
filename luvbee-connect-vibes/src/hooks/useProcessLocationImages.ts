/**
 * Hook para processar imagens de locais
 * 
 * Hook React para processar imagens de locais em background
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LocationImageScraper } from '@/services/location-image-scraper.service'

/**
 * Hook para processar imagens de um local específico
 */
export function useProcessLocationImages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (locationId: string) => {
      const result = await LocationImageScraper.processAndSaveLocationImages(locationId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    onSuccess: (_, locationId) => {
      // Invalidar cache de locais para atualizar imagem
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['location-detail', locationId] })
      queryClient.invalidateQueries({ queryKey: ['explore-locations'] })
    },
  })
}

/**
 * Hook para processar imagens de todos os locais sem foto
 */
export function useProcessAllLocationImages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const result = await LocationImageScraper.processAllLocationsWithoutImages()
      if (result.error) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => {
      // Invalidar cache de todos os locais
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['explore-locations'] })
    },
  })
}

