/**
 * Google Places Service - Integração com Google Places API
 * T037: User Story 2 - Core Loop 1: Vibe Local
 * 
 * Usa Google Maps JavaScript API quando disponível (resolve CORS)
 * Fallback para REST API quando necessário
 */

import { GOOGLE_PLACES_CONFIG } from '@/lib/constants'
import type { ApiResponse } from '@/types/app.types'
import { GoogleMapsLoader } from './google-maps-loader.service'

export interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  rating?: number
  price_level?: number
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  phone_number?: string
  website?: string
  types?: string[]
}

export interface NearbySearchParams {
  latitude: number
  longitude: number
  radius?: number
  type?: string
  keyword?: string
}

export interface PlaceDetailsParams {
  placeId: string
  fields?: string[]
}

export class GooglePlacesService {
  private static readonly API_BASE = 'https://maps.googleapis.com/maps/api'
  private static apiKey: string | null = null

  /**
   * Inicializa a API key do Google Places
   */
  static initialize(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Verifica se a API key está configurada
   */
  private static checkApiKey(): void {
    if (!this.apiKey) {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (!key) {
        throw new Error('Google Maps API key não configurada. Configure VITE_GOOGLE_MAPS_API_KEY no .env.local')
      }
      this.apiKey = key
    }
  }

  /**
   * Busca locais próximos usando Edge Function (evita CORS e usa nova arquitetura)
   * Migrado de PlacesService para evitar deprecação
   */
  static async searchNearby(params: NearbySearchParams): Promise<ApiResponse<GooglePlace[]>> {
    try {
      this.checkApiKey()

      const { latitude, longitude, radius = GOOGLE_PLACES_CONFIG.radius, type, keyword } = params

      // Usar Edge Function para evitar CORS e usar REST API diretamente
      try {
        const supabaseModule = await import('@/integrations/supabase')
        const { data: { session } } = await supabaseModule.supabase.auth.getSession()
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-nearby`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
          },
          body: JSON.stringify({ latitude, longitude, radius, type, keyword }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
          return { error: errorData.error || `Erro ao buscar locais: ${response.statusText}` }
        }

        const result = await response.json()
        return { data: result.data || [] }
      } catch (error) {
        // Se Edge Function falhar, retornar erro ao invés de tentar REST API (que causa CORS)
        return {
          error: error instanceof Error ? error.message : 'Failed to search nearby places - Edge Function não disponível'
        }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search nearby places'
      }
    }
  }

  /**
   * Busca locais próximos usando REST API (fallback - pode ter problemas CORS)
   */
  private static async searchNearbyRest(params: NearbySearchParams): Promise<ApiResponse<GooglePlace[]>> {
    try {
      this.checkApiKey()

      const { latitude, longitude, radius = GOOGLE_PLACES_CONFIG.radius, type, keyword } = params

      const url = new URL(`${this.API_BASE}/place/nearbysearch/json`)
      url.searchParams.set('location', `${latitude},${longitude}`)
      url.searchParams.set('radius', radius.toString())
      url.searchParams.set('key', this.apiKey!)

      if (type) {
        url.searchParams.set('type', type)
      } else {
        // Usar tipos padrão se não especificado
        GOOGLE_PLACES_CONFIG.types.forEach(t => {
          url.searchParams.append('type', t)
        })
      }

      if (keyword) {
        url.searchParams.set('keyword', keyword)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === 'ZERO_RESULTS') {
        return { data: [] }
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
      }

      return { data: data.results || [] }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search nearby places'
      }
    }
  }

  /**
   * Busca detalhes completos de um local específico usando nova API Place.fetchFields()
   * Migrado de PlacesService para evitar deprecação
   */
  static async getPlaceDetails(params: PlaceDetailsParams): Promise<ApiResponse<GooglePlace>> {
    try {
      this.checkApiKey()

      // Usar nova API Place.fetchFields()
      try {
        await GoogleMapsLoader.load()
        
        if (window.google?.maps?.places) {
          const { Place } = await window.google.maps.importLibrary('places') as any
          
          const place = new Place({ id: params.placeId })
          const fields = params.fields || GOOGLE_PLACES_CONFIG.fields
          
          await place.fetchFields({ fields })
          
          // Converter para formato GooglePlace
          // A nova API Place tem propriedades diferentes
          const googlePlace: GooglePlace = {
            place_id: place.id || params.placeId,
            name: place.displayName?.text || place.displayName || '',
            formatted_address: place.formattedAddress || '',
            geometry: {
              location: {
                lat: typeof place.location?.lat === 'function' ? place.location.lat() : (place.location as any)?.lat || 0,
                lng: typeof place.location?.lng === 'function' ? place.location.lng() : (place.location as any)?.lng || 0,
              },
            },
            photos: place.photos?.map((photo: any) => ({
              photo_reference: photo.getURI?.() || photo.url || '',
              height: photo.height || 0,
              width: photo.width || 0,
            })) || [],
            rating: place.rating || undefined,
            price_level: place.priceLevel || undefined,
            opening_hours: place.regularOpeningHours
              ? {
                  weekday_text: place.regularOpeningHours.weekdayDescriptions || [],
                }
              : undefined,
            phone_number: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
            website: place.websiteURI || undefined,
            types: place.types || [],
          }
          
          return { data: googlePlace }
        }
      } catch (error) {
        // Fallback para REST API se nova API não disponível
      }

      // Fallback para REST API
      return await this.getPlaceDetailsRest(params)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get place details'
      }
    }
  }

  /**
   * Busca detalhes usando REST API (fallback)
   */
  private static async getPlaceDetailsRest(params: PlaceDetailsParams): Promise<ApiResponse<GooglePlace>> {
    try {
      this.checkApiKey()

      const { placeId, fields = GOOGLE_PLACES_CONFIG.fields } = params

      const url = new URL(`${this.API_BASE}/place/details/json`)
      url.searchParams.set('place_id', placeId)
      url.searchParams.set('fields', fields.join(','))
      url.searchParams.set('key', this.apiKey!)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
      }

      return { data: data.result }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get place details'
      }
    }
  }

  /**
   * Obtém URL da foto do Google Places
   * Formato correto: https://maps.googleapis.com/maps/api/place/photo?maxwidth={maxWidth}&photoreference={photoReference}&key={apiKey}
   */
  static getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    this.checkApiKey()
    // URL correta da API do Google Places Photo
    return `${this.API_BASE}/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey!}`
  }

  /**
   * Baixa uma foto do Google Places usando Google Maps JavaScript API (resolve CORS)
   */
  static async downloadPhoto(photoReference: string, maxWidth: number = 400): Promise<ApiResponse<Blob>> {
    try {
      this.checkApiKey()

      // Tentar usar Google Maps JavaScript API primeiro
      try {
        await GoogleMapsLoader.load()
        
        if (window.google?.maps?.places) {
          // Criar URL da foto usando a biblioteca (resolve CORS)
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey!}`
          
          // Usar fetch com a biblioteca carregada (não tem problemas CORS)
          const response = await fetch(photoUrl, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to download photo: ${response.statusText}`)
          }

          const blob = await response.blob()
          
          if (!blob.type.startsWith('image/')) {
            throw new Error('Resposta não é uma imagem válida')
          }

          return { data: blob }
        }
      } catch (error) {
        console.warn('[GooglePlacesService] Erro ao usar Google Maps JS API, tentando método alternativo:', error)
      }

      // Fallback para método REST (pode ter problemas CORS)
      const photoUrl = this.getPhotoUrl(photoReference, maxWidth)
      
      const response = await fetch(photoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        mode: 'cors',
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado à foto do Google Places. Verifique a API key e permissões.')
        }
        throw new Error(`Failed to download photo: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      if (!blob.type.startsWith('image/')) {
        throw new Error('Resposta não é uma imagem válida')
      }

      return { data: blob }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to download photo from Google Places'
      }
    }
  }

  /**
   * Converte Google Place para formato do banco de dados
   */
  static convertToLocationData(place: GooglePlace): {
    google_place_id: string
    name: string
    type: string
    address: string
    latitude: number
    longitude: number
    photo_url?: string
    rating?: number
    price_level?: number
    opening_hours?: Record<string, any>
    google_places_data?: Record<string, any>
  } {
    // Determinar tipo baseado nos types do Google Places
    const type = this.determineLocationType(place.types || [])

    // Obter URL da foto se disponível
    let photoUrl: string | undefined
    if (place.photos && place.photos.length > 0) {
      photoUrl = this.getPhotoUrl(place.photos[0].photo_reference)
    }

    return {
      google_place_id: place.place_id,
      name: place.name,
      type,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      photo_url: photoUrl,
      rating: place.rating,
      price_level: place.price_level,
      opening_hours: place.opening_hours ? {
        open_now: place.opening_hours.open_now,
        weekday_text: place.opening_hours.weekday_text,
      } : undefined,
      google_places_data: place as any,
    }
  }

  /**
   * Converte endereço (cidade, estado) em coordenadas usando Geocoding API
   */
  static async geocodeAddress(address: string): Promise<ApiResponse<{ lat: number; lng: number }>> {
    try {
      this.checkApiKey()

      // Tentar usar Google Maps JavaScript API primeiro
      try {
        await GoogleMapsLoader.load()
        
        if (window.google?.maps) {
          return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder()
            
            geocoder.geocode({ address }, (results, status) => {
              if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
                const location = results[0].geometry.location
                resolve({
                  data: {
                    lat: location.lat(),
                    lng: location.lng(),
                  }
                })
              } else {
                // Fallback para REST API
                this.geocodeAddressRest(address).then(resolve)
              }
            })
          })
        }
      } catch (error) {
        console.warn('[GooglePlacesService] Google Maps JS API não disponível para geocoding, usando REST API:', error)
      }

      // Fallback para REST API
      return await this.geocodeAddressRest(address)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to geocode address'
      }
    }
  }

  /**
   * Geocoding usando REST API (fallback)
   */
  private static async geocodeAddressRest(address: string): Promise<ApiResponse<{ lat: number; lng: number }>> {
    try {
      this.checkApiKey()

      const url = new URL(`${this.API_BASE}/geocode/json`)
      url.searchParams.set('address', address)
      url.searchParams.set('key', this.apiKey!)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Google Geocoding API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
      }

      if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
        return { error: 'Endereço não encontrado' }
      }

      const location = data.results[0].geometry.location
      return {
        data: {
          lat: location.lat,
          lng: location.lng,
        }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to geocode address'
      }
    }
  }

  /**
   * Determina o tipo de local baseado nos types do Google Places
   */
  private static determineLocationType(types: string[]): string {
    // Mapeamento de tipos do Google Places para tipos do LuvBee
    const typeMap: Record<string, string> = {
      bar: 'bar',
      night_club: 'club',
      restaurant: 'restaurant',
      cafe: 'cafe',
      lodging: 'hotel',
      meal_takeaway: 'restaurant',
      meal_delivery: 'restaurant',
    }

    for (const type of types) {
      if (typeMap[type]) {
        return typeMap[type]
      }
    }

    // Tipo padrão se não encontrar correspondência
    return 'bar'
  }
}

