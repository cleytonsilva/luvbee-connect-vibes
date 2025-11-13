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
      const isEdgePhotoUrl = fallbackUrl.includes('/functions/v1/get-place-photo')
      if (!isEdgePhotoUrl) {
        setPhotoUrl(fallbackUrl)
        return
      }
    }

    // Cláusula de Guarda: Validar placeId antes de qualquer operação
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      console.warn('[usePlacePhoto] Chamada pulada: placeId é nulo, inválido ou vazio.', { placeId })
      setPhotoUrl('/placeholder-location.jpg')
      return
    }

    // Verificar cache
    if (photoCache.has(placeId)) {
      setPhotoUrl(photoCache.get(placeId)!)
      return
    }

    let cancelled = false
    const fetchPhoto = async () => {
      if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
        return
      }
      try {
        const list = await supabase.storage.from('div').list(`places/${placeId}`)
        if (!cancelled && list.data && list.data.length > 0) {
          const filePath = `places/${placeId}/${list.data[0].name}`
          const { data: { publicUrl } } = supabase.storage.from('div').getPublicUrl(filePath)
          photoCache.set(placeId, publicUrl)
          setPhotoUrl(publicUrl)
          return
        }
        const { data, error } = await supabase.functions.invoke('cache-place-photo', {
          body: { place_id: placeId, maxWidth: 800 }
        })
        if (cancelled) return
        if (error) {
          setPhotoUrl('/placeholder-location.jpg')
          return
        }
        if (data?.imageUrl) {
          photoCache.set(placeId, data.imageUrl)
          setPhotoUrl(data.imageUrl)
          return
        }
        setPhotoUrl('/placeholder-location.jpg')
      } catch {
        if (!cancelled) setPhotoUrl('/placeholder-location.jpg')
      }
    }
    fetchPhoto()
    return () => { cancelled = true }
  }, [placeId, fallbackUrl])

  return photoUrl
}

