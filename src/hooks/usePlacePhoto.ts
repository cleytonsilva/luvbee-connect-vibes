/**
 * Hook para buscar foto do Google Places quando necessário
 * Usa cache para evitar múltiplas requisições
 */

import { useState, useEffect } from 'react'
import { GooglePlacesService } from '@/services/google-places.service'

const photoCache = new Map<string, string>()

export function usePlacePhoto(placeId: string | null | undefined, fallbackUrl?: string | null): string {
  const [photoUrl, setPhotoUrl] = useState<string>(fallbackUrl || '/placeholder-location.jpg')

  useEffect(() => {
    // Se já tem fallback URL válida, usar ela
    if (fallbackUrl && fallbackUrl !== '/placeholder-location.jpg' && !fallbackUrl.includes('placeholder')) {
      setPhotoUrl(fallbackUrl)
      return
    }

    // Se não tem place_id, usar placeholder
    if (!placeId) {
      setPhotoUrl('/placeholder-location.jpg')
      return
    }

    // Verificar cache
    if (photoCache.has(placeId)) {
      setPhotoUrl(photoCache.get(placeId)!)
      return
    }

    // Buscar foto do Google Places
    let cancelled = false
    
    GooglePlacesService.getPlaceDetails({
      placeId,
      fields: ['photos']
    }).then(result => {
      if (cancelled) return

      if (result.error || !result.data) {
        setPhotoUrl('/placeholder-location.jpg')
        return
      }

      const photos = result.data.photos || []
      if (photos.length === 0) {
        setPhotoUrl('/placeholder-location.jpg')
        return
      }

      // Pegar primeira foto e gerar URL da Edge Function
      const firstPhoto = photos[0]
      const photoRef = firstPhoto.photo_reference
      
      if (!photoRef || photoRef.startsWith('http')) {
        // Se já é URL completa, usar diretamente
        const url = photoRef || '/placeholder-location.jpg'
        photoCache.set(placeId, url)
        setPhotoUrl(url)
        return
      }

      // Gerar URL da Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (supabaseUrl) {
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/get-place-photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=400`
        photoCache.set(placeId, edgeFunctionUrl)
        setPhotoUrl(edgeFunctionUrl)
      } else {
        setPhotoUrl('/placeholder-location.jpg')
      }
    }).catch(error => {
      if (cancelled) return
      console.warn('[usePlacePhoto] Erro ao buscar foto:', error)
      setPhotoUrl('/placeholder-location.jpg')
    })

    return () => {
      cancelled = true
    }
  }, [placeId, fallbackUrl])

  return photoUrl
}

