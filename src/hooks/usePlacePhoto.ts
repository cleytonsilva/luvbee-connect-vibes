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
      const isEdgePhotoUrl = fallbackUrl.includes('/functions/v1/get-place-photo') || fallbackUrl.includes('/functions/v1/cache-place-photo')
      // Se for URL direta do Google (que expira) ou da API antiga, ignorar para forçar cache via Edge Function
      const isGoogleUrl = fallbackUrl.includes('googleusercontent.com') || fallbackUrl.includes('maps.googleapis.com')

      if (!isEdgePhotoUrl && !isGoogleUrl) {
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
    } catch { }

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
        } catch { }
        // Primeiro, verificar se já existe no storage (bucket 'places' - novo padrão)
        const listPlaces = await supabase.storage.from('places').list(placeId)
        if (!cancelled && listPlaces.data && listPlaces.data.length > 0) {
           const filePath = `${placeId}/${listPlaces.data[0].name}`
           const { data: { publicUrl } } = supabase.storage.from('places').getPublicUrl(filePath)
           photoCache.set(placeId, publicUrl)
           try {
             if (typeof window !== 'undefined') {
               window.sessionStorage.setItem(sessionKey, JSON.stringify({ imageUrl: publicUrl, ts: Date.now() }))
             }
           } catch { }
           updatePhotoUrl(publicUrl)
           return
        }

        // Fallback: verificar bucket antigo 'div'
        const list = await supabase.storage.from('div').list(`places/${placeId}`)
        if (!cancelled && list.data && list.data.length > 0) {
          const filePath = `places/${placeId}/${list.data[0].name}`
          const { data: { publicUrl } } = supabase.storage.from('div').getPublicUrl(filePath)
          photoCache.set(placeId, publicUrl)
          try {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(sessionKey, JSON.stringify({ imageUrl: publicUrl, ts: Date.now() }))
            }
          } catch { }
          updatePhotoUrl(publicUrl)
          return
        }

        // Se não encontrou no storage, usar Edge Function como Proxy direto
        if (import.meta.env.DEV) {
          console.debug('[usePlacePhoto] Edge cache-place-photo →', placeId)
          console.log(`[usePlacePhoto] Using Edge Function Proxy for ${placeId}`)
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        // Construir URL do Proxy
        // Nota: Adicionamos timestamp para evitar cache agressivo do navegador se a URL falhar antes
        // Mas a Edge Function retorna headers de cache corretos para sucesso
        // Usamos um timestamp arredondado (a cada 5 min) para permitir cache de curto prazo mas renovar falhas eventualmente
        // Ou melhor: usamos timestamp atual se não tiver cache, para forçar tentativa.
        const cacheBuster = Date.now();
        const proxyUrl = `${supabaseUrl}/functions/v1/cache-place-photo?place_id=${placeId}&maxwidth=400&apikey=${supabaseAnonKey}&t=${cacheBuster}`

        if (cancelled) return

        // Salvar no cache de memória para navegação rápida
        photoCache.set(placeId, proxyUrl)
        try {
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(sessionKey, JSON.stringify({ imageUrl: proxyUrl, ts: Date.now() }))
            }
        } catch { }

        updatePhotoUrl(proxyUrl)
        return

        /* LÓGICA ANTIGA REMOVIDA: A Edge Function retorna Blob, não JSON, então invoke falhava.
        const result = await invokeCachePlacePhoto(placeId, { maxWidth: 400 })

        if (cancelled) return

        if (result.success && result.imageUrl) {
          // ...
        }
        */
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

