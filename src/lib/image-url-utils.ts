/**
 * Utilitários para URLs de imagens
 * Converte URLs antigas do Google Maps para usar Edge Function
 */

/**
 * Converte URL do Google Maps Photo para usar Edge Function
 * Se a URL já for da Edge Function ou de outro serviço, retorna como está
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder-location.jpg'
  
  // Se já é URL da Edge Function, retornar como está
  if (url.includes('/functions/v1/get-place-photo')) {
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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        if (supabaseUrl) {
          return `${supabaseUrl}/functions/v1/get-place-photo?photoreference=${encodeURIComponent(photoreference)}&maxwidth=${maxwidth}`
        }
      }
    } catch (error) {
      console.warn('[normalizeImageUrl] Erro ao converter URL do Google Maps:', error)
    }
  }
  
  // Se é uma URL válida de outro serviço, retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Fallback para placeholder
  return '/placeholder-location.jpg'
}

/**
 * Normaliza múltiplas URLs de imagens
 */
export function normalizeImageUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map(normalizeImageUrl).filter(url => url !== '/placeholder-location.jpg')
}

