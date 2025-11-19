/**
 * Hook para buscar foto do Google Places quando necessário
 * Usa cache para evitar múltiplas requisições
 * Usa Edge Function para evitar problemas de CORS
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/integrations/supabase'

const photoCache = new Map<string, string>()
const pendingRequests = new Set<string>()
const errorCache = new Set<string>() // Cache de erros para evitar chamadas repetidas

export function usePlacePhoto(placeId: string | null | undefined, fallbackUrl?: string | null): string {
  // Estabilizar placeId e fallbackUrl para evitar re-renders desnecessários
  const stablePlaceId = useMemo(() => {
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      return null
    }
    return placeId.trim()
  }, [placeId])

  const stableFallbackUrl = useMemo(() => {
    if (!fallbackUrl || fallbackUrl === '/placeholder-location.jpg' || fallbackUrl.includes('placeholder')) {
      return null
    }
    // Se é URL da Edge Function, não usar como fallback
    if (fallbackUrl.includes('/functions/v1/get-place-photo')) {
      return null
    }
    return fallbackUrl
  }, [fallbackUrl])

  // Usar ref para rastrear valores e evitar atualizações desnecessárias
  const placeIdRef = useRef<string | null>(stablePlaceId)
  const fallbackUrlRef = useRef<string | null>(stableFallbackUrl)
  const lastPhotoUrlRef = useRef<string>('/placeholder-location.jpg')
  
  // Inicializar estado com fallback ou cache se disponível
  const getInitialUrl = (): string => {
    // Se tem fallback URL válida, usar ela
    if (stableFallbackUrl) {
      return stableFallbackUrl
    }
    
    // Se tem no cache, usar cache
    if (stablePlaceId && photoCache.has(stablePlaceId)) {
      return photoCache.get(stablePlaceId)!
    }
    
    // Se já teve erro antes, não tentar novamente
    if (stablePlaceId && errorCache.has(stablePlaceId)) {
      return '/placeholder-location.jpg'
    }
    
    return '/placeholder-location.jpg'
  }
  
  const [photoUrl, setPhotoUrl] = useState<string>(getInitialUrl)

  // Atualizar refs quando valores mudam
  useEffect(() => {
    placeIdRef.current = stablePlaceId
    fallbackUrlRef.current = stableFallbackUrl
  }, [stablePlaceId, stableFallbackUrl])

  // Efeito único que lida com tudo
  useEffect(() => {
    const currentPlaceId = placeIdRef.current
    const currentFallbackUrl = fallbackUrlRef.current

    // Se tem fallback URL válida, usar ela e não buscar
    if (currentFallbackUrl) {
      if (lastPhotoUrlRef.current !== currentFallbackUrl) {
        lastPhotoUrlRef.current = currentFallbackUrl
        setPhotoUrl(currentFallbackUrl)
      }
      return
    }

    // Se não tem placeId válido, usar placeholder
    if (!currentPlaceId) {
      if (lastPhotoUrlRef.current !== '/placeholder-location.jpg') {
        lastPhotoUrlRef.current = '/placeholder-location.jpg'
        setPhotoUrl('/placeholder-location.jpg')
      }
      return
    }

    // Se já teve erro antes, não tentar novamente
    if (errorCache.has(currentPlaceId)) {
      if (lastPhotoUrlRef.current !== '/placeholder-location.jpg') {
        lastPhotoUrlRef.current = '/placeholder-location.jpg'
        setPhotoUrl('/placeholder-location.jpg')
      }
      return
    }

    // Verificar cache primeiro
    if (photoCache.has(currentPlaceId)) {
      const cachedUrl = photoCache.get(currentPlaceId)!
      if (lastPhotoUrlRef.current !== cachedUrl) {
        lastPhotoUrlRef.current = cachedUrl
        setPhotoUrl(cachedUrl)
      }
      return
    }

    // Se já há uma requisição em andamento, não fazer outra
    if (pendingRequests.has(currentPlaceId)) {
      return
    }

    let cancelled = false
    pendingRequests.add(currentPlaceId)

    const fetchPhoto = async () => {
      // Verificar novamente se foi cancelado
      if (cancelled || placeIdRef.current !== currentPlaceId) {
        pendingRequests.delete(currentPlaceId)
        return
      }

      try {
        // Primeiro, verificar se já existe no storage
        const list = await supabase.storage.from('div').list(`places/${currentPlaceId}`)
        
        if (cancelled || placeIdRef.current !== currentPlaceId) {
          pendingRequests.delete(currentPlaceId)
          return
        }

        if (list.data && list.data.length > 0) {
          const filePath = `places/${currentPlaceId}/${list.data[0].name}`
          const { data: { publicUrl } } = supabase.storage.from('div').getPublicUrl(filePath)
          photoCache.set(currentPlaceId, publicUrl)
          
          if (!cancelled && placeIdRef.current === currentPlaceId) {
            lastPhotoUrlRef.current = publicUrl
            setPhotoUrl(publicUrl)
          }
          pendingRequests.delete(currentPlaceId)
          return
        }

        // Se não encontrou no storage, chamar Edge Function
        const { data, error } = await supabase.functions.invoke('cache-place-photo', {
          body: { place_id: currentPlaceId, maxWidth: 800 }
        })
        
        if (cancelled || placeIdRef.current !== currentPlaceId) {
          pendingRequests.delete(currentPlaceId)
          return
        }

        if (error) {
          // Adicionar ao cache de erros para evitar chamadas repetidas
          errorCache.add(currentPlaceId)
          pendingRequests.delete(currentPlaceId)
          
          if (!cancelled && placeIdRef.current === currentPlaceId) {
            lastPhotoUrlRef.current = '/placeholder-location.jpg'
            setPhotoUrl('/placeholder-location.jpg')
          }
          return
        }

        if (data?.imageUrl) {
          photoCache.set(currentPlaceId, data.imageUrl)
          if (!cancelled && placeIdRef.current === currentPlaceId) {
            lastPhotoUrlRef.current = data.imageUrl
            setPhotoUrl(data.imageUrl)
          }
        } else {
          // Se não retornou imagem, adicionar ao cache de erros
          errorCache.add(currentPlaceId)
          if (!cancelled && placeIdRef.current === currentPlaceId) {
            lastPhotoUrlRef.current = '/placeholder-location.jpg'
            setPhotoUrl('/placeholder-location.jpg')
          }
        }
        
        pendingRequests.delete(currentPlaceId)
      } catch (error) {
        // Adicionar ao cache de erros
        errorCache.add(currentPlaceId)
        pendingRequests.delete(currentPlaceId)
        
        if (!cancelled && placeIdRef.current === currentPlaceId) {
          lastPhotoUrlRef.current = '/placeholder-location.jpg'
          setPhotoUrl('/placeholder-location.jpg')
        }
      }
    }

    fetchPhoto()
    
    return () => {
      cancelled = true
      pendingRequests.delete(currentPlaceId)
    }
  }, [stablePlaceId, stableFallbackUrl]) // Dependências estabilizadas

  return photoUrl
}

