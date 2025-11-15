/**
 * Hook para buscar foto do Google Places quando necessário
 * Usa cache para evitar múltiplas requisições
 * Usa Edge Function para evitar problemas de CORS
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase'
import { invokeCachePlacePhoto } from '@/lib/cache-place-photo-helper'

const photoCache = new Map<string, string>()

export function usePlacePhoto(placeId: string | null | undefined, fallbackUrl?: string | null): string {
  const [photoUrl, setPhotoUrl] = useState<string>(fallbackUrl || '/placeholder-location.jpg')

  useEffect(() => {
    // Sempre chamar o efeito, mas aplicar lógica condicional dentro dele
    let cancelled = false

    const updatePhotoUrl = (url: string) => {
      if (!cancelled) {
        setPhotoUrl(url)
      }
    }

    // Se já tem fallback URL válida, usar ela
    if (fallbackUrl && fallbackUrl !== '/placeholder-location.jpg' && !fallbackUrl.includes('placeholder')) {
      const isEdgePhotoUrl = fallbackUrl.includes('/functions/v1/get-place-photo')
      if (!isEdgePhotoUrl) {
        updatePhotoUrl(fallbackUrl)
        return () => { cancelled = true }
      }
    }

    // Cláusula de Guarda: Validar placeId antes de qualquer operação
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      if (import.meta.env.DEV) {
        console.warn('[usePlacePhoto] Chamada pulada: placeId é nulo, inválido ou vazio.', { placeId })
      }
      updatePhotoUrl('/placeholder-location.jpg')
      return () => { cancelled = true }
    }

    // Verificar cache
    if (photoCache.has(placeId)) {
      updatePhotoUrl(photoCache.get(placeId)!)
      return () => { cancelled = true }
    }

    const fetchPhoto = async () => {
      try {
        // Primeiro, verificar se já existe no storage
        const list = await supabase.storage.from('div').list(`places/${placeId}`)
        if (!cancelled && list.data && list.data.length > 0) {
          const filePath = `places/${placeId}/${list.data[0].name}`
          const { data: { publicUrl } } = supabase.storage.from('div').getPublicUrl(filePath)
          photoCache.set(placeId, publicUrl)
          updatePhotoUrl(publicUrl)
          return
        }

        // Se não encontrou no storage, chamar Edge Function usando helper
        if (import.meta.env.DEV) {
          console.log('[usePlacePhoto] Chamando Edge Function cache-place-photo para placeId:', placeId)
        }

        const result = await invokeCachePlacePhoto(placeId, { maxWidth: 800 })

        if (cancelled) return

        if (result.success && result.imageUrl) {
          photoCache.set(placeId, result.imageUrl)
          updatePhotoUrl(result.imageUrl)
          if (import.meta.env.DEV) {
            console.log('[usePlacePhoto] Foto obtida com sucesso:', result.imageUrl.substring(0, 50) + '...')
          }
          return
        }

        // Se falhou, logar erro e usar fallback
        if (import.meta.env.DEV && result.error) {
          console.warn('[usePlacePhoto] Erro ao obter foto:', result.error)
        }
        updatePhotoUrl('/placeholder-location.jpg')
      } catch (err) {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.error('[usePlacePhoto] Erro não tratado:', err)
          }
          updatePhotoUrl('/placeholder-location.jpg')
        }
      }
    }

    fetchPhoto()
    return () => { cancelled = true }
  }, [placeId, fallbackUrl])

  return photoUrl
}

