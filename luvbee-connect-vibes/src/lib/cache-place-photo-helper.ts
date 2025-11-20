/**
 * Helper para chamar a Edge Function cache-place-photo
 * Com fallback e tratamento de erros melhorado
 */

import { supabase } from '@/integrations/supabase'

export interface CachePlacePhotoResponse {
  imageUrl?: string
  error?: string
  success: boolean
}

/**
 * Chama a Edge Function cache-place-photo com fallback
 */
export async function invokeCachePlacePhoto(
  placeId: string,
  options?: { maxWidth?: number; photoReference?: string }
): Promise<CachePlacePhotoResponse> {
  const maxWidth = options?.maxWidth || 800
  const photoReference = options?.photoReference

  try {
    // Tentar usar o método invoke do Supabase SDK primeiro
    const { data, error } = await supabase.functions.invoke('cache-place-photo', {
      body: {
        place_id: placeId,
        maxWidth,
        ...(photoReference && { photo_reference: photoReference })
      }
    })

    if (error) {
      // Se der erro 404, tentar chamar diretamente via fetch como fallback
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        if (import.meta.env.DEV) {
          console.warn('[cache-place-photo-helper] Invoke retornou 404, tentando fallback via fetch...')
        }
        return await invokeCachePlacePhotoFallback(placeId, { maxWidth, photoReference })
      }

      return {
        success: false,
        error: error.message || 'Erro desconhecido ao chamar Edge Function'
      }
    }

    if (data?.imageUrl) {
      return {
        success: true,
        imageUrl: data.imageUrl
      }
    }

    return {
      success: false,
      error: 'Edge Function não retornou imageUrl'
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[cache-place-photo-helper] Erro ao chamar Edge Function:', err)
    }

    // Tentar fallback em caso de erro
    return await invokeCachePlacePhotoFallback(placeId, { maxWidth, photoReference })
  }
}

/**
 * Fallback: chama a Edge Function diretamente via fetch
 */
async function invokeCachePlacePhotoFallback(
  placeId: string,
  options?: { maxWidth?: number; photoReference?: string }
): Promise<CachePlacePhotoResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: 'Variáveis de ambiente do Supabase não configuradas'
    }
  }

  try {
    const functionUrl = `${supabaseUrl}/functions/v1/cache-place-photo`
    
    if (import.meta.env.DEV) {
      console.log('[cache-place-photo-helper] Chamando via fetch:', functionUrl)
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        place_id: placeId,
        maxWidth: options?.maxWidth || 800,
        ...(options?.photoReference && { photo_reference: options.photoReference })
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      
      if (import.meta.env.DEV) {
        console.error('[cache-place-photo-helper] Erro na resposta:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    if (data?.imageUrl) {
      return {
        success: true,
        imageUrl: data.imageUrl
      }
    }

    if (data?.error) {
      return {
        success: false,
        error: data.error
      }
    }

    return {
      success: false,
      error: 'Resposta inválida da Edge Function'
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[cache-place-photo-helper] Erro no fallback:', err)
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido no fallback'
    }
  }
}

