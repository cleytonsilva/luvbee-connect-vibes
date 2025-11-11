/**
 * Google Places Photo Service
 * 
 * Usa Edge Function do Supabase para proteger a chave da API Google Maps
 */

import { supabase } from '../integrations/supabase'

export class GooglePlacesPhotoService {
  /**
   * Obtém URL da foto de um local usando Edge Function
   * Protege a chave da API do frontend
   * 
   * NOTA: Por enquanto, mantemos a implementação atual usando a chave diretamente
   * mas documentamos que deve ser migrado para Edge Function em produção.
   * 
   * TODO: Migrar para Edge Function antes de produção
   */
  static async getPlacePhotoUrl(photoreference: string, maxwidth: number = 400): Promise<string> {
    // Por enquanto, usar chave diretamente (será migrado para Edge Function)
    // Em produção, usar:
    // const { data } = await supabase.functions.invoke('get-place-photo', {
    //   body: { photoreference, maxwidth }
    // })
    // return data?.url || ''
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API key não configurada')
      return ''
    }
    
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoreference}&key=${apiKey}`
  }

  /**
   * Obtém múltiplas URLs de fotos
   */
  static async getPlacePhotoUrls(photoreferences: string[], maxwidth: number = 400): Promise<string[]> {
    const urls = await Promise.all(
      photoreferences.map(ref => this.getPlacePhotoUrl(ref, maxwidth))
    )
    return urls.filter(url => url !== '')
  }
}

