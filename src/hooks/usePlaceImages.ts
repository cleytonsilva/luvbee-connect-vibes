/**
 * Hook usePlaceImages - LuvBee
 * 
 * Hook para buscar e gerenciar imagens de locais do bucket 'places'
 */

import { useState, useEffect, useCallback } from 'react'
import { ImageCacheService } from '@/services/imageCache'

interface UsePlaceImagesOptions {
  limit?: number
  enabled?: boolean
}

interface UsePlaceImagesReturn {
  images: string[]
  mainImage: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook para buscar imagens de um local do bucket 'places'
 */
export function usePlaceImages(
  placeId: string | null | undefined,
  options: UsePlaceImagesOptions = {}
): UsePlaceImagesReturn {
  const { limit = 5, enabled = true } = options
  
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    if (!placeId || !enabled) {
      setImages([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const urls = await ImageCacheService.getImageUrls(placeId, limit)
      setImages(urls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagens')
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }, [placeId, limit, enabled])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  return {
    images,
    mainImage: images[0] || null,
    isLoading,
    error,
    refetch: fetchImages,
  }
}

/**
 * Hook para buscar uma única imagem principal de um local
 */
export function usePlaceMainImage(
  placeId: string | null | undefined,
  enabled: boolean = true
): {
  imageUrl: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchImage = useCallback(async () => {
    if (!placeId || !enabled) {
      setImageUrl(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = await ImageCacheService.getImageUrl(placeId)
      setImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem')
      setImageUrl(null)
    } finally {
      setIsLoading(false)
    }
  }, [placeId, enabled])

  useEffect(() => {
    fetchImage()
  }, [fetchImage])

  return {
    imageUrl,
    isLoading,
    error,
    refetch: fetchImage,
  }
}
