/**
 * Location Image Scraper Service - LuvBee Core Platform
 * 
 * Serviço para buscar fotos dos locais usando exclusivamente Google Places API
 * e salvá-las no Supabase Storage.
 */

import { supabase } from '@/integrations/supabase'
import { GooglePlacesService } from './google-places.service'
import { ImageStorageService } from './image-storage.service'
import { invokeCachePlacePhoto } from '@/lib/cache-place-photo-helper'
import type { ApiResponse } from '@/types/app.types'
import type { Location } from '@/types/location.types'
import type { NearbySearchParams } from './google-places.service'
import { GoogleMapsLoader } from './google-maps-loader.service'

export interface ScrapedImage {
  url: string
  source: 'google_places'
  width?: number
  height?: number
  photo_reference?: string // Para Google Places (REST fallback)
}

export class LocationImageScraper {
  /**
   * Busca fotos de um local usando Google Places API
   */
  static async scrapeLocationImages(location: Location): Promise<ApiResponse<ScrapedImage[]>> {
    const images: ScrapedImage[] = []

    try {
      // 1. Buscar fotos do Google Places (se tiver place_id)
      if (location.place_id) {
        const googleImages = await this.getGooglePlacesPhotos(location.place_id)
        images.push(...googleImages)
      }

      return { data: images }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to scrape location images'
      }
    }
  }

  /**
   * Busca fotos do Google Places API
   * Tenta usar o serviço centralizado que gerencia JS SDK (New API) e Fallbacks
   */
  private static async getGooglePlacesPhotos(placeId: string): Promise<ScrapedImage[]> {
    try {
      // Usar GooglePlacesService para obter detalhes (já lida com New API vs Legacy vs Edge)
      const result = await GooglePlacesService.getPlaceDetails({
        placeId,
        fields: ['photos']
      })

      if (result.error || !result.data || !result.data.photos) {
        // Se falhar, retornamos array vazio (o scraper tentará fallback depois se necessário)
        // Mas note que getPlaceDetails já tem fallback interno para Edge Function
        return []
      }

      return result.data.photos.map(photo => {
        // Se tivermos uma referência válida (ID), usamos ela
        // Se for uma URL completa (ex: blob: ou https:), ainda tentamos salvar
        return {
          url: GooglePlacesService.getPhotoUrl(photo.photo_reference, 800),
          source: 'google_places',
          width: photo.width,
          height: photo.height,
          photo_reference: photo.photo_reference
        }
      })
    } catch (error) {
      console.warn('[LocationImageScraper] Error getting Google Places photos:', error)
      return []
    }
  }

  // Removemos o método getGooglePlacesPhotosFallback antigo pois agora getGooglePlacesPhotos já usa o serviço unificado
  // Mas mantemos a assinatura se necessário ou removemos se não for usado.
  // Como era privado, podemos remover ou ignorar. 
  // Vou comentar o método getGooglePlacesPhotos antigo e o fallback para não quebrar referências se houver, 
  // mas o código acima substitui o método getGooglePlacesPhotos original.

  /**
   * Fallback: Busca fotos usando GooglePlacesService (REST/Edge Function)
   * Útil se o JS SDK falhar por autenticação
   * @deprecated Agora integrado no getGooglePlacesPhotos via GooglePlacesService
   */
  private static async getGooglePlacesPhotosFallback(placeId: string): Promise<ScrapedImage[]> {
    return this.getGooglePlacesPhotos(placeId);
  }

  /**
   * Processa e salva todas as fotos de um local no Supabase Storage
   */
  static async processAndSaveLocationImages(locationId: string): Promise<ApiResponse<string[]>> {
    try {
      // Buscar dados do local
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single()

      if (locationError || !location) {
        return { error: 'Location not found' }
      }

      // Verificar se já tem imagem salva
      const existingUrl = await ImageStorageService.getLocationImageUrl(locationId)
      if (existingUrl && existingUrl.includes('supabase.co/storage')) {
        return { data: [existingUrl] }
      }

      // Buscar fotos (agora apenas Google Places)
      const scrapedResult = await this.scrapeLocationImages(location as Location)

      if (scrapedResult.error || !scrapedResult.data || scrapedResult.data.length === 0) {
        // Se falhar scraping direto, tentar invokeCachePlacePhoto como último recurso (Edge Function)
        if (location.place_id) {
          const edgeResult = await invokeCachePlacePhoto(location.place_id, { maxWidth: 800 })
          if (edgeResult.success && edgeResult.imageUrl) {
            return { data: [edgeResult.imageUrl] }
          }
        }
        return { error: 'No images found' }
      }

      const photoToSave = scrapedResult.data[0]

      if (!photoToSave) {
        return { error: 'No images found to save' }
      }

      // Salvar primeira foto no Supabase Storage
      // Se tivermos a URL direta (do JS SDK getUrl), usamos ela.
      // Se tivermos apenas photo_reference (do fallback REST), ImageStorageService saberá lidar.

      if (photoToSave.url || photoToSave.photo_reference) {
        // O método saveLocationImageFromGoogle sabe lidar tanto com photo_reference quanto com URLs completas
        // PREFERÊNCIA: Usar photo_reference se disponível para evitar problemas com URLs assinadas/CORS
        const refOrUrl = photoToSave.photo_reference || photoToSave.url

        const saveResult = await ImageStorageService.saveLocationImageFromGoogle(
          locationId,
          refOrUrl
        )
        if (saveResult.data) {
          return { data: [saveResult.data] }
        }
      }

      return { error: 'Failed to save image' }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to process location images'
      }
    }
  }

  /**
   * Processa imagens para todos os locais que não têm foto salva
   */
  static async processAllLocationsWithoutImages(): Promise<ApiResponse<{ processed: number; errors: number }>> {
    try {
      // Buscar locais sem imagem salva
      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, place_id, instagram_handle, instagram, type')
        .or('image_url.is.null,image_url.eq.,image_url.not.like.*supabase.co/storage*')

      if (error) {
        return { error: error.message }
      }

      if (!locations || locations.length === 0) {
        return { data: { processed: 0, errors: 0 } }
      }

      let processed = 0
      let errors = 0

      // Processar em lotes de 5 para não sobrecarregar
      const batchSize = 5
      for (let i = 0; i < locations.length; i += batchSize) {
        const batch = locations.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (location) => {
            try {
              const result = await this.processAndSaveLocationImages(location.id)
              if (result.data) {
                processed++
                console.log(`✅ Processed image for location: ${location.name}`)
              } else {
                errors++
                console.warn(`❌ Failed to process image for location: ${location.name} - ${result.error}`)
              }
            } catch (error) {
              errors++
              console.error(`❌ Error processing location ${location.id}:`, error)
            }
          })
        )

        // Aguardar um pouco entre lotes para não sobrecarregar APIs
        if (i + batchSize < locations.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      return { data: { processed, errors } }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to process all locations'
      }
    }
  }

  static async scrapeAndCacheNearby(params: NearbySearchParams): Promise<ApiResponse<{ processed: number; errors: number }>> {
    try {
      const places = await GooglePlacesService.searchNearby(params)
      if (places.error || !places.data) return { error: places.error || 'Failed to search nearby places' }
      let processed = 0
      let errors = 0
      const batch = places.data.slice(0, Math.min(places.data.length, 100))
      for (const p of batch) {
        try {
          const result = await invokeCachePlacePhoto(p.place_id, { maxWidth: 800 })
          if (!result.success || !result.imageUrl) {
            errors++
            continue
          }
          processed++
        } catch {
          errors++
        }
        await new Promise(res => setTimeout(res, 100))
      }
      return { data: { processed, errors } }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to scrape and cache nearby places' }
    }
  }
}
