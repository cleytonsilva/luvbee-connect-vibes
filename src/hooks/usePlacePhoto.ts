/**
 * Hook para buscar foto do Google Places quando necessário
 * Usa cache para evitar múltiplas requisições
 * Usa Edge Function para evitar problemas de CORS
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase'
import { safeLog } from '@/lib/safe-log'
import { invokeCachePlacePhoto } from '@/lib/cache-place-photo-helper'

const photoCache = new Map<string, string>()
const inflight = new Set<string>()

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

    // Cache em sessionStorage
    const sessionKey = `place-photo:${placeId}`
    try {
      const cachedStr = typeof window !== 'undefined' ? window.sessionStorage.getItem(sessionKey) : null
      if (cachedStr) {
        const cached = JSON.parse(cachedStr)
        if (cached && cached.imageUrl && typeof cached.ts === 'number' && Date.now() - cached.ts < 86400000) {
          photoCache.set(placeId, cached.imageUrl)
        } else if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(sessionKey)
        }
      }
    } catch {}

    // Verificar cache
    if (photoCache.has(placeId)) {
      updatePhotoUrl(photoCache.get(placeId)!)
      return () => { cancelled = true }
    }

    const fetchPhoto = async () => {
      try {
        if (inflight.has(placeId)) {
          if (import.meta.env.DEV) {
            console.debug('[usePlacePhoto] Requisição já em andamento para', placeId)
          }
          return
        }
        inflight.add(placeId)
        try {
          const unavailableStr = typeof window !== 'undefined' ? window.sessionStorage.getItem('edge-cache-place-photo-unavailable') : null
          if (unavailableStr) {
            const ts = Number(unavailableStr)
            if (!Number.isNaN(ts) && Date.now() - ts < 300000) {
              updatePhotoUrl('/placeholder-location.jpg')
              return
            }
          }
        } catch {}
        // Primeiro, verificar se já existe no storage
        const list = await supabase.storage.from('div').list(`places/${placeId}`)
        if (!cancelled && list.data && list.data.length > 0) {
          const filePath = `places/${placeId}/${list.data[0].name}`
          const { data: { publicUrl } } = supabase.storage.from('div').getPublicUrl(filePath)
          photoCache.set(placeId, publicUrl)
          try {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(sessionKey, JSON.stringify({ imageUrl: publicUrl, ts: Date.now() }))
            }
          } catch {}
          updatePhotoUrl(publicUrl)
          return
        }

        // Se não encontrou no storage, chamar Edge Function usando helper
        if (import.meta.env.DEV) {
          console.debug('[usePlacePhoto] Edge cache-place-photo →', placeId)
        }

        const result = await invokeCachePlacePhoto(placeId, { maxWidth: 400 })

        if (cancelled) return

        if (result.success && result.imageUrl) {
          photoCache.set(placeId, result.imageUrl)
          try {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(sessionKey, JSON.stringify({ imageUrl: result.imageUrl, ts: Date.now() }))
            }
          } catch {}
          updatePhotoUrl(result.imageUrl)
          if (import.meta.env.DEV) {
            console.debug('[usePlacePhoto] Foto obtida:', result.imageUrl.substring(0, 50) + '...')
          }
          return
        }

        // Se falhou, logar erro e usar fallback
        if (result.error) {
          safeLog('warn', '[usePlacePhoto] erro foto', { placeId, error: result.error })
          if (result.error.includes('404') && typeof window !== 'undefined') {
            try { window.sessionStorage.setItem('edge-cache-place-photo-unavailable', String(Date.now())) } catch {}
          }
        }
        updatePhotoUrl('/placeholder-location.jpg')
      } catch (err) {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.error('[usePlacePhoto] Erro não tratado:', err)
          }
          safeLog('error', '[usePlacePhoto] erro não tratado', { placeId, error: err instanceof Error ? err.message : String(err) })
          updatePhotoUrl('/placeholder-location.jpg')
        }
      } finally {
        inflight.delete(placeId)
      }
    }

    fetchPhoto()
    return () => { cancelled = true }
  }, [placeId, fallbackUrl])

  return photoUrl
}

