/**
 * Hook para buscar foto do Google Places quando necessário
 * Usa cache para evitar múltiplas requisições
 * Usa Edge Function para evitar problemas de CORS
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase'

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

    // Buscar foto do Google Places usando Edge Function
    let cancelled = false
    
    const fetchPhoto = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-place-details', {
          body: {
            place_id: placeId,
            fields: ['photos']
          }
        })

        if (cancelled) return

        if (error) {
          console.warn('[usePlacePhoto] Erro ao buscar detalhes:', error)
          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        if (!data || !data.data) {
          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        const photos = data.data.photos || []
        if (photos.length === 0) {
          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        // Pegar primeira foto e gerar URL da Edge Function
        const firstPhoto = photos[0]
        const photoRef = firstPhoto.photo_reference
        
        if (!photoRef) {
          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        // Se já é URL completa, usar diretamente
        if (photoRef.startsWith('http')) {
          photoCache.set(placeId, photoRef)
          setPhotoUrl(photoRef)
          return
        }

        // Gerar URL da Edge Function para buscar a foto
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        if (supabaseUrl) {
          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/get-place-photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=400`
          photoCache.set(placeId, edgeFunctionUrl)
          setPhotoUrl(edgeFunctionUrl)
        } else {
          setPhotoUrl('/placeholder-location.jpg')
        }
      } catch (error) {
        if (cancelled) return
        console.warn('[usePlacePhoto] Erro ao buscar foto:', error)
        setPhotoUrl('/placeholder-location.jpg')
      }
    }

    fetchPhoto()

    return () => {
      cancelled = true
    }
  }, [placeId, fallbackUrl])

  return photoUrl
}

