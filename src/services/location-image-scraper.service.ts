/**
 * Location Image Scraper Service - LuvBee Core Platform
 * 
 * Serviço para fazer scraping de fotos dos locais de múltiplas fontes
 * e salvá-las no Supabase Storage
 */

import { supabase } from '@/integrations/supabase'
import { GooglePlacesService } from './google-places.service'
import { ImageStorageService } from './image-storage.service'
import type { ApiResponse } from '@/types/app.types'
import type { Location } from '@/types/location.types'

export interface ScrapedImage {
  url: string
  source: 'google_places' | 'instagram' | 'website' | 'unsplash'
  width?: number
  height?: number
  photo_reference?: string // Para Google Places
}

export class LocationImageScraper {
  /**
   * Busca fotos de um local de múltiplas fontes
   */
  static async scrapeLocationImages(location: Location): Promise<ApiResponse<ScrapedImage[]>> {
    const images: ScrapedImage[] = []

    try {
      // 1. Buscar fotos do Google Places (se tiver place_id)
      if (location.place_id) {
        const googleImages = await this.getGooglePlacesPhotos(location.place_id)
        images.push(...googleImages)
      }

      // 2. Buscar fotos do Instagram (se tiver instagram_handle)
      if (location.instagram_handle || location.instagram) {
        const instagramHandle = location.instagram_handle || location.instagram
        const instagramImages = await this.getInstagramPhotos(instagramHandle, location.name)
        images.push(...instagramImages)
      }

      // 3. Buscar fotos do Unsplash (fallback)
      if (images.length === 0) {
        const unsplashImages = await this.getUnsplashPhotos(location.name, location.type)
        images.push(...unsplashImages)
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
   */
  private static async getGooglePlacesPhotos(placeId: string): Promise<ScrapedImage[]> {
    try {
      const result = await GooglePlacesService.getPlaceDetails({
        placeId,
        fields: ['photos']
      })

      if (result.error || !result.data) {
        return []
      }

      const photos = result.data.photos || []
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      
      return photos.map(photo => {
        // photo pode ter photo_reference (string) ou url (string completa)
        const photoRef = typeof photo.photo_reference === 'string' && !photo.photo_reference.startsWith('http')
          ? photo.photo_reference
          : null
        
        // Se já tem URL completa e não é do Google Maps (pode ser de outro serviço), usar diretamente
        // Caso contrário, usar Edge Function para proteger a API key
        let photoUrl: string | null = null
        if (photo.url && !photo.url.includes('maps.googleapis.com')) {
          photoUrl = photo.url
        } else if (photoRef && supabaseUrl) {
          // Usar Edge Function para proteger a chave da API
          photoUrl = `${supabaseUrl}/functions/v1/get-place-photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=800`
        }
        
        return {
          url: photoUrl || '',
          source: 'google_places' as const,
          width: photo.width,
          height: photo.height,
          photo_reference: photoRef || undefined
        }
      }).filter(img => img.url)
    } catch (error) {
      console.warn('[LocationImageScraper] Error getting Google Places photos:', error)
      return []
    }
  }

  /**
   * Busca fotos do Instagram (usando busca por nome do local)
   * Nota: Instagram não tem API pública, então fazemos busca por hashtag/nome
   */
  private static async getInstagramPhotos(handle: string, locationName: string): Promise<ScrapedImage[]> {
    // Instagram não tem API pública fácil, então vamos usar Unsplash como fallback
    // Em produção, poderia usar serviços de scraping especializados ou APIs pagas
    console.log(`[LocationImageScraper] Instagram scraping not implemented for ${handle}`)
    return []
  }

  /**
   * Busca fotos do Unsplash baseado no nome e tipo do local
   */
  private static async getUnsplashPhotos(locationName: string, locationType?: string): Promise<ScrapedImage[]> {
    try {
      // Usar Unsplash API para buscar fotos relacionadas
      const searchQuery = `${locationName} ${locationType || 'bar restaurant'}`.trim()
      const unsplashAccessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY

      if (!unsplashAccessKey) {
        console.warn('[LocationImageScraper] Unsplash API key not configured')
        return []
      }

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=3&client_id=${unsplashAccessKey}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      const photos = data.results || []

      return photos.map((photo: any) => ({
        url: photo.urls?.regular || photo.urls?.small || '',
        source: 'unsplash' as const,
        width: photo.width,
        height: photo.height
      })).filter((img: ScrapedImage) => img.url)
    } catch (error) {
      console.warn('[LocationImageScraper] Error getting Unsplash photos:', error)
      return []
    }
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

      // Buscar fotos de múltiplas fontes
      const scrapedResult = await this.scrapeLocationImages(location as Location)
      if (scrapedResult.error || !scrapedResult.data || scrapedResult.data.length === 0) {
        return { error: 'No images found' }
      }

      // Priorizar foto do Google Places
      const googlePhoto = scrapedResult.data.find(img => img.source === 'google_places')
      const photoToSave = googlePhoto || scrapedResult.data[0]

      if (!photoToSave) {
        return { error: 'No images found to save' }
      }

      // Salvar primeira foto no Supabase Storage
      let photoReference: string | undefined

      if (photoToSave.source === 'google_places') {
        // Se já tem photo_reference, usar diretamente
        if (photoToSave.photo_reference) {
          photoReference = photoToSave.photo_reference
        } else if (location.place_id) {
          // Se não tem, buscar do Google Places
          const placeDetails = await GooglePlacesService.getPlaceDetails({
            placeId: location.place_id,
            fields: ['photos']
          })

          if (placeDetails.data?.photos && placeDetails.data.photos.length > 0) {
            const firstPhoto = placeDetails.data.photos[0]
            // photo_reference pode ser string ou URL
            if (typeof firstPhoto.photo_reference === 'string' && !firstPhoto.photo_reference.startsWith('http')) {
              photoReference = firstPhoto.photo_reference
            } else if (firstPhoto.url) {
              // Se for URL, usar diretamente
              const saveResult = await ImageStorageService.saveLocationImageFromGoogle(
                locationId,
                firstPhoto.url
              )
              if (saveResult.data) {
                return { data: [saveResult.data] }
              }
            }
          }
        }
      }

      if (photoReference) {
        // Salvar usando photo_reference
        const saveResult = await ImageStorageService.saveLocationImageFromGoogle(
          locationId,
          photoReference
        )
        if (saveResult.data) {
          return { data: [saveResult.data] }
        }
      } else if (photoToSave.url) {
        // Salvar usando URL direta
        const saveResult = await ImageStorageService.saveLocationImageFromGoogle(
          locationId,
          photoToSave.url
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
}

