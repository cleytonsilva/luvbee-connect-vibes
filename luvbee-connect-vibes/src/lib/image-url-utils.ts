/**
 * Utilitários para URLs de imagens
 * Converte URLs antigas do Google Maps para usar Edge Function
 */

import { getEdgeFunctionImageUrl } from './edge-function-image-loader'

/**
 * Converte URL do Google Maps Photo para usar Edge Function
 * Se a URL já for da Edge Function ou de outro serviço, retorna como está
 * Se não houver URL mas houver place_id, retorna URL da Edge Function usando place_id
 */
export function normalizeImageUrl(
  url: string | null | undefined, 
  placeId?: string | null | undefined
): string {
  // Se tem URL, processar normalmente
  if (url) {
    // Se já é URL da Edge Function, retornar como está (já deve ter apikey se necessário)
    if (url.includes('/functions/v1/get-place-photo')) {
      // Se não tem apikey na URL, adicionar
      if (!url.includes('apikey=')) {
        try {
          const urlObj = new URL(url)
          const photoreference = urlObj.searchParams.get('photoreference')
          const maxwidth = urlObj.searchParams.get('maxwidth') || '400'
          
          if (photoreference) {
            return getEdgeFunctionImageUrl('/functions/v1/get-place-photo', {
              photoreference,
              maxwidth: parseInt(maxwidth, 10)
            })
          }
        } catch (error) {
          console.warn('[normalizeImageUrl] Erro ao processar URL da Edge Function:', error)
        }
      }
      return url
    }
    
    // Se é URL do Supabase Storage, retornar como está
    if (url.includes('supabase.co/storage')) {
      return url
    }
    
    // Se é URL do Google Maps com API key exposta, converter para Edge Function
    if (url.includes('maps.googleapis.com/maps/api/place/photo')) {
      try {
        const urlObj = new URL(url)
        const photoreference = urlObj.searchParams.get('photoreference')
        const maxwidth = urlObj.searchParams.get('maxwidth') || '400'
        
        if (photoreference) {
          return getEdgeFunctionImageUrl('/functions/v1/get-place-photo', {
            photoreference,
            maxwidth: parseInt(maxwidth, 10)
          })
        }
      } catch (error) {
        console.warn('[normalizeImageUrl] Erro ao converter URL do Google Maps:', error)
      }
    }
    if (url.includes('PhotoService.GetPhoto')) {
      return '/placeholder-location.jpg'
    }
    
    // Se é uma URL válida de outro serviço, retornar como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
  }
  
  // Se não tem URL mas tem place_id, tentar buscar foto do Google Places
  // Nota: Isso requer buscar detalhes do lugar primeiro para obter photo_reference
  // Por enquanto, retornamos placeholder. A busca será feita no componente.
  if (placeId && !url) {
    // Retornar placeholder por enquanto - o componente pode buscar depois
    return '/placeholder-location.jpg'
  }
  
  // Fallback para placeholder
  return '/placeholder-location.jpg'
}

/**
 * Gera URL da Edge Function para buscar foto do Google Places usando place_id
 * Nota: Isso requer que a Edge Function suporte buscar por place_id
 * Por enquanto, retorna null - precisa buscar detalhes do lugar primeiro
 */
export function getPlacePhotoUrlFromPlaceId(placeId: string, maxwidth: number = 400): string | null {
  // Por enquanto, não podemos gerar URL diretamente do place_id
  // Precisamos buscar detalhes do lugar primeiro para obter photo_reference
  return null
}

/**
 * Normaliza múltiplas URLs de imagens
 */
export function normalizeImageUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map(normalizeImageUrl).filter(url => url !== '/placeholder-location.jpg')
}

