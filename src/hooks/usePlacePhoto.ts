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

    // Buscar foto do Google Places usando Edge Function
    let cancelled = false
    
    const fetchPhoto = async () => {
      // Validação adicional dentro da função assíncrona
      if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
        console.warn('[usePlacePhoto] fetchPhoto: placeId inválido, abortando chamada.', { placeId })
        return
      }

      try {
        console.log('[DEBUG Frontend] Preparando para invocar "get-place-details". Payload:', {
          placeId: placeId,
          place_id: placeId, // Confirmando o nome do campo que será enviado
          fields: ['photos']
        })

        const { data, error } = await supabase.functions.invoke('get-place-details', {
          body: {
            place_id: placeId,
            fields: ['photos']
          }
        })

        if (cancelled) return

        // Verificar se há erro na resposta
        // Quando há erro HTTP (400, 500, etc), tentar capturar o body da resposta
        if (error) {
          let errorBody: any = null
          let googleErrorMessage: string | undefined

          // Tentar fazer uma chamada direta para capturar o body do erro
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

            if (supabaseUrl && supabaseAnonKey) {
              const directResponse = await fetch(`${supabaseUrl}/functions/v1/get-place-details`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                  place_id: placeId,
                  fields: ['photos']
                })
              })

              // Se a resposta não foi OK, tentar ler o body JSON
              if (!directResponse.ok) {
                try {
                  errorBody = await directResponse.json()
                  googleErrorMessage = errorBody.error_message || errorBody.error
                } catch (parseError) {
                  // Se não conseguir parsear JSON, tentar texto
                  const errorText = await directResponse.text()
                  console.warn('[usePlacePhoto] Resposta de erro não é JSON:', errorText)
                }
              }
            }
          } catch (fetchError) {
            // Ignorar erro ao tentar capturar o body
            console.warn('[usePlacePhoto] Não foi possível capturar body do erro:', fetchError)
          }

          console.error('[usePlacePhoto] Erro ao buscar detalhes:', {
            error,
            placeId,
            errorMessage: error.message,
            googleErrorMessage,
            errorBody,
            // Nota: A mensagem completa do Google também está nos logs da Edge Function
            // Acesse: Supabase Dashboard > Functions > get-place-details > Logs
          })

          // Mostrar mensagem informativa baseada no erro capturado
          if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
            const isRefererError = googleErrorMessage?.includes('referer restrictions') || 
                                  errorBody?.error_message?.includes('referer restrictions')

            if (isRefererError) {
              console.error(
                '%c🔴 ERRO DE CONFIGURAÇÃO: Chave com restrições de referer',
                'color: red; font-weight: bold; font-size: 14px;'
              )
              console.error(
                'Mensagem do Google: ' + (googleErrorMessage || errorBody?.error_message || 'Não disponível') + '\n\n' +
                'SOLUÇÃO:\n' +
                '1. Crie uma chave separada para o backend SEM restrições de "Aplicativos da web"\n' +
                '2. Configure essa chave no Supabase como GOOGLE_MAPS_BACKEND_KEY\n' +
                '3. Veja o arquivo GOOGLE_API_KEY_SETUP.md para instruções detalhadas'
              )
            } else {
              console.error(
                '%c⚠️ ERRO 400: Verifique a configuração da chave da API do Google',
                'color: orange; font-weight: bold; font-size: 14px;'
              )
              console.warn(
                'Mensagem do erro: ' + (googleErrorMessage || errorBody?.error_message || error.message) + '\n\n' +
                'Possíveis causas:\n' +
                '1. Chave com restrições de referer (mais comum)\n' +
                '2. Chave inválida ou não configurada no Supabase\n' +
                '3. Places API não habilitada no Google Cloud Console\n\n' +
                'Para ver a mensagem completa do erro, verifique os logs da Edge Function:\n' +
                'Supabase Dashboard > Functions > get-place-details > Logs'
              )
            }
          }

          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        // Verificar se a resposta contém um erro (Edge Function retornou erro mas não lançou exceção)
        if (data && data.error) {
          console.error('[usePlacePhoto] Erro retornado pela Edge Function:', {
            error: data.error,
            error_message: data.error_message,
            status: data.status,
            details: data.details,
            placeId,
            fullResponse: data
          })
          
          // Log específico para erros do Google Places API
          if (data.error_message) {
            console.error('[usePlacePhoto] Mensagem de erro do Google Places API:', data.error_message)
          }
          
          setPhotoUrl('/placeholder-location.jpg')
          return
        }

        console.log('[DEBUG Frontend] Resposta recebida de "get-place-details":', {
          hasData: !!data,
          hasDataData: !!(data && data.data),
          dataKeys: data ? Object.keys(data) : []
        })

        if (!data || !data.data) {
          console.warn('[usePlacePhoto] Resposta inválida ou sem dados:', { data })
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
          console.log('[DEBUG Frontend] Foto processada com sucesso. URL gerada:', edgeFunctionUrl)
          setPhotoUrl(edgeFunctionUrl)
        } else {
          console.warn('[usePlacePhoto] VITE_SUPABASE_URL não configurado')
          setPhotoUrl('/placeholder-location.jpg')
        }
      } catch (error) {
        if (cancelled) return
        console.error('[usePlacePhoto] Erro ao buscar foto:', {
          error,
          placeId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined
        })
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

