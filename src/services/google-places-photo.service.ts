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
   */
  static async getPlacePhotoUrl(photoreference: string, maxwidth: number = 400): Promise<string> {
    try {
      // Usar Edge Function para proteger a chave da API
      const { data, error } = await supabase.functions.invoke('get-place-photo', {
        body: { photoreference, maxwidth }
      })

      if (error) {
        console.warn('Erro ao obter foto via Edge Function:', error)
        return ''
      }

      // A Edge Function retorna a imagem diretamente, então precisamos construir a URL da Edge Function
      // que servirá a imagem
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        console.warn('Supabase URL não configurada')
        return ''
      }

      // Retornar URL da Edge Function que servirá a imagem com autenticação
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const url = new URL(`${supabaseUrl}/functions/v1/get-place-photo`)
      url.searchParams.set('photoreference', photoreference)
      url.searchParams.set('maxwidth', String(maxwidth))
      // Adicionar apikey como query parameter para autenticação
      if (supabaseAnonKey) {
        url.searchParams.set('apikey', supabaseAnonKey)
      }
      return url.toString()
    } catch (error) {
      console.warn('Erro ao obter URL da foto:', error)
      return ''
    }
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

