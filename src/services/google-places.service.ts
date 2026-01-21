/**
 * Google Places Service - Integração com Google Places API
 * T037: User Story 2 - Core Loop 1: Vibe Local
 * 
 * Usa Google Maps JavaScript API quando disponível (resolve CORS)
 * Fallback para Edge Functions quando necessário (Backend Proxy)
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
  editorial_summary?: string
  generative_summary?: string
  features?: {
    serves_beer?: boolean
    serves_wine?: boolean
    serves_cocktails?: boolean
    good_for_groups?: boolean
    good_for_children?: boolean
    live_music?: boolean
  }
}

export interface NearbySearchParams {
  latitude: number
  longitude: number
  radius?: number
  type?: string
  keyword?: string
  vibe_category?: 'date' | 'party' | 'culture'
}

export interface PlaceDetailsParams {
  placeId: string
  fields?: string[]
}

export class GooglePlacesService {
  private static readonly API_BASE = 'https://maps.googleapis.com/maps/api'
  private static apiKey: string | null = null
  private static pendingSearches: Map<string, Promise<ApiResponse<GooglePlace[]>>> = new Map()
  private static cache: Map<string, { data: GooglePlace[]; expiresAt: number }> = new Map()
  private static readonly CACHE_TTL_MS = 30 * 60 * 1000

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
   * Busca locais próximos com estratégia de fallback:
   * 1. Google Maps JS SDK (Client-side, melhor performance, sem CORS)
   * 2. Supabase Edge Function (Backend proxy)
   */
  static async searchNearby(params: NearbySearchParams): Promise<ApiResponse<GooglePlace[]>> {
    try {
      const { latitude, longitude, radius = GOOGLE_PLACES_CONFIG.radius, type, keyword, vibe_category } = params

      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        return { error: 'Parâmetros inválidos para busca de locais' }
      }

      // Determine types to search based on Vibe Category if type is not provided
      let typesToSearch: string[] = type ? [type] : [];
      if (!type && vibe_category) {
        typesToSearch = this.mapVibeToGoogleTypes(vibe_category);
      }

      // If no types derived, default to a safe list for dates/fun
      if (typesToSearch.length === 0) {
        typesToSearch = ['restaurant', 'bar', 'cafe'];
      }

      const key = `${latitude}|${longitude}|${radius}|${typesToSearch.join(',')}|${keyword || ''}`
      const now = Date.now()

      // 0. Check Cache
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > now) {
        return { data: cached.data }
      }

      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(`gplaces:${key}`) : null
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed && parsed.expiresAt > now && Array.isArray(parsed.data)) {
            this.cache.set(key, parsed)
            return { data: parsed.data }
          }
        } catch { }
      }

      if (this.pendingSearches.has(key)) {
        return await this.pendingSearches.get(key)!
      }

      const searchPromise = (async (): Promise<ApiResponse<GooglePlace[]>> => {
        let result: ApiResponse<GooglePlace[]> | null = null;
        let errors: string[] = [];

        // 1. Try JS SDK (New Place API first, then Legacy)
        // Skip if auth failed previously
        if (!GoogleMapsLoader.hasAuthFailed()) {
          try {
            await GoogleMapsLoader.load()

            if (GoogleMapsLoader.hasAuthFailed()) {
              throw new Error('Google Maps Auth Failed (detected after load)')
            }

            if (window.google?.maps) {
              // ... existing JS SDK logic
              console.log('[GooglePlacesService] Trying JS SDK...')
              // Tentar usar nova API Place primeiro se disponível
              try {
                // @ts-ignore - Importando biblioteca places nova
                const { Place, SearchNearbyRankPreference } = await window.google.maps.importLibrary("places") as any;

                if (Place && Place.searchNearby) {
                  // ... logic
                  const center = new window.google.maps.LatLng(latitude, longitude);

                  // New API supports includedPrimaryTypes array
                  const request = {
                    fields: ['displayName', 'location', 'formattedAddress', 'photos', 'rating', 'priceLevel', 'types', 'regularOpeningHours', 'id'],
                    locationRestriction: {
                      center: center,
                      radius: radius,
                    },
                    includedPrimaryTypes: typesToSearch,
                    maxResultCount: 20,
                  };

                  console.log('[GooglePlacesService] Calling Place.searchNearby...', { types: typesToSearch })
                  const { places } = await Place.searchNearby(request);
                  console.log(`[GooglePlacesService] Place.searchNearby returned ${places?.length} results`)

                  if (places && places.length > 0) {
                    const mapped = places.map((place: any) => ({
                      place_id: place.id,
                      name: place.displayName,
                      formatted_address: place.formattedAddress,
                      geometry: {
                        location: {
                          lat: typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat,
                          lng: typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng
                        }
                      },
                      photos: place.photos?.map((p: any) => ({
                        photo_reference: p.name || '', // Na nova API, 'name' é o recurso da foto
                        height: p.height,
                        width: p.width
                      })) || [],
                      rating: place.rating,
                      price_level: place.priceLevel,
                      types: place.types,
                      opening_hours: place.regularOpeningHours ? {
                        open_now: place.regularOpeningHours.isOpen?.()
                      } : undefined
                    }));
                    result = { data: mapped };
                  }
                }
              } catch (e) {
                // Se falhar a nova API, continuar para legacy
                console.warn('[GooglePlacesService] New Places API search failed:', e);
              }

              if (!result && window.google.maps.places) {
                // Fallback para PlacesService legado (pode estar bloqueado para novas chaves)
                console.log('[GooglePlacesService] Trying Legacy PlacesService...')
                const dummyDiv = document.createElement('div');
                const service = new window.google.maps.places.PlacesService(dummyDiv);

                // Legacy API usually only supports one type at a time or keywords.
                // We will loop through the top 3 types if necessary or just use the first one.
                // Or use 'keyword' combining them? No, keyword is better for text.
                // Let's pick the first type or map to a generic one.

                // Pick the first type from the list as the primary search
                const primaryType = typesToSearch[0];

                const request: google.maps.places.PlaceSearchRequest = {
                  location: new window.google.maps.LatLng(latitude, longitude),
                  radius: radius,
                  type: primaryType,
                  keyword: keyword
                };

                result = await new Promise((resolve) => {
                  service.nearbySearch(request, (results: any[], status: any) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                      console.log(`[GooglePlacesService] Legacy search returned ${results.length} results`)
                      const mapped = results.map((place: any) => ({
                        place_id: place.place_id || '',
                        name: place.name || '',
                        formatted_address: place.vicinity || '', // PlacesService retorna vicinity no nearbySearch
                        geometry: {
                          location: {
                            lat: place.geometry?.location?.lat() || 0,
                            lng: place.geometry?.location?.lng() || 0
                          }
                        },
                        photos: place.photos?.map((p: any) => ({
                          photo_reference: p.getUrl() || '', // Nota: getUrl() retorna a URL direta, mas vamos manter estrutura
                          height: p.height,
                          width: p.width
                        })) || [],
                        rating: place.rating,
                        price_level: place.price_level,
                        types: place.types,
                        opening_hours: place.opening_hours ? {
                          open_now: place.opening_hours.isOpen()
                        } : undefined
                      }));
                      resolve({ data: mapped });
                    } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                      console.log('[GooglePlacesService] Legacy search: ZERO_RESULTS')
                      resolve({ data: [] });
                    } else {
                      console.warn('[GooglePlacesService] Legacy search failed:', status)
                      resolve(null); // Falha, tentar próximo método
                    }
                  });
                });
              }
            }
          } catch (e) {
            console.warn('[GooglePlacesService] JS SDK search failed:', e);
            errors.push(`JS SDK: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          console.warn('[GooglePlacesService] Skipping JS SDK due to Auth/Load Failure (Fallback to Edge)')
          errors.push('JS SDK: Skipped due to Auth/Load Failure');
        }

        if (result?.data) {
          this.saveToCache(key, result.data);
          return result;
        }

        // 2. Try Edge Function (Backend Proxy)
        try {
          console.log('[GooglePlacesService] Trying Edge Function fallback...')
          const edgeResult = await this.searchNearbyEdge(params);
          if (edgeResult.data) {
            console.log(`[GooglePlacesService] Edge Function returned ${edgeResult.data.length} results`)
            this.saveToCache(key, edgeResult.data);
            return edgeResult;
          }
          console.warn('[GooglePlacesService] Edge Function error:', edgeResult.error)
          if (edgeResult.error) errors.push(`Edge: ${edgeResult.error}`);
        } catch (e) {
          console.warn('[GooglePlacesService] Edge Function exception:', e)
          errors.push(`Edge: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3. Direct REST API (REMOVED: Always causes CORS error in browser)

        return { error: `Todas as tentativas de busca falharam. Detalhes: ${errors.join('; ')}` };

      })();

      this.pendingSearches.set(key, searchPromise)
      return await searchPromise
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search nearby places'
      }
    } finally {
      const key = `${params.latitude}|${params.longitude}|${params.radius}|${params.type || ''}|${params.keyword || ''}`
      this.pendingSearches.delete(key)
    }
  }

  private static saveToCache(key: string, data: GooglePlace[]) {
    const expiresAt = Date.now() + this.CACHE_TTL_MS
    this.cache.set(key, { data, expiresAt })
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`gplaces:${key}`, JSON.stringify({ data, expiresAt }))
      } catch { }
    }
  }

  /**
   * Busca locais usando Edge Function
   */
  private static async searchNearbyEdge(params: NearbySearchParams): Promise<ApiResponse<GooglePlace[]>> {
    try {
      const supabaseModule = await import('@/integrations/supabase')
      const { data: { session } } = await supabaseModule.supabase.auth.getSession()

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-nearby`
      console.log('[GooglePlacesService] Fetching Edge Function:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_SUPABASE_ANON_KEY && { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }),
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        let message = response.statusText
        try {
          const errorData = await response.json()
          message = errorData?.error || message
        } catch { }
        console.warn('[GooglePlacesService] Edge Function failed:', response.status, message)
        if (response.status === 400) {
          return { error: message || 'Requisição inválida' }
        }
        return { error: message || 'Erro ao buscar locais via Edge Function' }
      }

      const result = await response.json()
      return { data: result.data || [] }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error in Edge Function' }
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

        if (window.google?.maps) {
          // Tentar usar nova API
          try {
            const { Place } = await window.google.maps.importLibrary('places') as any

            if (Place) {
              const place = new Place({ id: params.placeId })
              const fields = params.fields || GOOGLE_PLACES_CONFIG.fields

              await place.fetchFields({ fields })

              // Converter para formato GooglePlace
              const googlePlace: GooglePlace = {
                place_id: place.id || params.placeId,
                name: place.displayName || '',
                formatted_address: place.formattedAddress || '',
                geometry: {
                  location: {
                    lat: typeof place.location?.lat === 'function' ? place.location.lat() : (place.location as any)?.lat || 0,
                    lng: typeof place.location?.lng === 'function' ? place.location.lng() : (place.location as any)?.lng || 0,
                  },
                },
                photos: place.photos?.map((photo: any) => ({
                  // New API uses 'name' as resource ID (places/PLACE_ID/photos/PHOTO_ID)
                  // Fallback to getURI() or url for display only, but we prefer ID for caching
                  photo_reference: photo.name || photo.getURI?.() || photo.url || '',
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
          } catch (e) {
            // Fallback
          }
        }
      } catch (error) {
        // Fallback para REST API se nova API não disponível
      }

      // Fallback para REST API (via Edge Function)
      return await this.getPlaceDetailsEdge(params)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get place details'
      }
    }
  }

  /**
   * Busca detalhes usando Edge Function (Fallback seguro para CORS)
   * Substitui a antiga chamada REST direta que falhava no browser
   */
  private static async getPlaceDetailsEdge(params: PlaceDetailsParams): Promise<ApiResponse<GooglePlace>> {
    try {
      const { placeId, fields = GOOGLE_PLACES_CONFIG.fields } = params

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-place-details`

      const supabaseModule = await import('@/integrations/supabase')
      const { data: { session } } = await supabaseModule.supabase.auth.getSession()

      console.log('[GooglePlacesService] Fetching Details from Edge Function:', url, placeId)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_SUPABASE_ANON_KEY && { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }),
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          place_id: placeId,
          fields
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Edge Function error: ${response.statusText}`
        console.warn('[GooglePlacesService] Edge Function failed:', response.status, errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return { data: data.data }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get place details via Edge Function'
      }
    }
  }

  /**
   * Obtém URL da foto do Google Places
   * Suporta tanto a nova API (Places API v1) quanto a legado
   */
  static getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    this.checkApiKey()

    // Se for uma URL completa (ex: retornada pelo JS SDK legado getUrl()), retornar diretamente
    if (photoReference && (photoReference.startsWith('http://') || photoReference.startsWith('https://'))) {
      return photoReference
    }

    // Verificar se é um recurso da nova API (começa com "places/")
    if (photoReference && photoReference.startsWith('places/')) {
      return `https://places.googleapis.com/v1/${photoReference}/media?key=${this.apiKey!}&maxWidthPx=${maxWidth}&maxHeightPx=${maxWidth}`
    }

    // API Legado
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

        // Não existe método direto fácil na JS API v3 para baixar blob de foto sem carregar no DOM
        // A URL retornada por getUrl() pode ser usada em tags img, mas pode ter restrições de CORS em fetch
        // Vamos tentar usar a URL gerada pela API
      } catch (error) {
        // Ignore
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
    editorial_summary?: string
    generative_summary?: string
    features?: any
  } {
    // Determinar tipo baseado nos types do Google Places
    const type = this.determineLocationType(place.types || [])

    // Obter URL da foto se disponível
    let photoUrl: string | undefined
    // Não salvar URL direta do Google para evitar expor API Key e problemas de expiração/CORS.
    // O frontend (LocationCard) reconstruirá a URL usando o proxy cache-place-photo
    // se tivermos os dados de 'photos' no google_places_data.

    // Apenas salvamos image_url se for uma fonte externa (não Google) ou upload manual.
    // if (place.photos && place.photos.length > 0) {
    //   photoUrl = this.getPhotoUrl(place.photos[0].photo_reference)
    // }

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
      editorial_summary: place.editorial_summary,
      generative_summary: place.generative_summary,
      features: place.features
    }
  }

  /**
   * Converte coordenadas em endereço (cidade, estado) usando Geocoding API
   */
  static async reverseGeocode(lat: number, lng: number): Promise<ApiResponse<{ city: string; state: string; full_address: string }>> {
    try {
      this.checkApiKey()

      // Tentar usar Google Maps JavaScript API primeiro
      try {
        await GoogleMapsLoader.load()

        if (window.google?.maps) {
          return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder()

            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
                const addressComponents = results[0].address_components
                const city = addressComponents.find(c => c.types.includes('administrative_area_level_2'))?.long_name ||
                  addressComponents.find(c => c.types.includes('locality'))?.long_name || ''
                const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || ''

                resolve({
                  data: {
                    city: this.normalizeCityName(city),
                    state: state.toLowerCase(),
                    full_address: results[0].formatted_address
                  }
                })
              } else {
                // Fallback para REST API
                this.reverseGeocodeRest(lat, lng).then(resolve)
              }
            })
          })
        }
      } catch (error) {
        console.warn('[GooglePlacesService] Google Maps JS API não disponível para reverse geocoding, usando REST API:', error)
      }

      // Fallback para REST API
      return await this.reverseGeocodeRest(lat, lng)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to reverse geocode'
      }
    }
  }

  /**
   * Reverse Geocoding usando REST API (fallback)
   */
  private static async reverseGeocodeRest(lat: number, lng: number): Promise<ApiResponse<{ city: string; state: string; full_address: string }>> {
    try {
      this.checkApiKey()

      const url = new URL(`${this.API_BASE}/geocode/json`)
      url.searchParams.set('latlng', `${lat},${lng}`)
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

      const addressComponents = data.results[0].address_components
      const city = addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name ||
        addressComponents.find((c: any) => c.types.includes('locality'))?.long_name || ''
      const state = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || ''

      return {
        data: {
          city: this.normalizeCityName(city),
          state: state.toLowerCase(),
          full_address: data.results[0].formatted_address
        }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to reverse geocode'
      }
    }
  }

  private static normalizeCityName(city: string): string {
    return city.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
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

            geocoder.geocode({ address }, (results: any[], status: any) => {
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
      // Food & Drink
      bar: 'bar',
      night_club: 'club',
      restaurant: 'restaurant',
      cafe: 'cafe',
      bakery: 'cafe', // Bakery -> Cafe
      meal_takeaway: 'restaurant',
      meal_delivery: 'restaurant',
      food: 'restaurant',

      // Culture & Arts
      museum: 'museum',
      art_gallery: 'gallery',
      library: 'library',
      book_store: 'bookstore',
      movie_theater: 'cinema',

      // Entertainment
      amusement_park: 'park',
      aquarium: 'aquarium',
      bowling_alley: 'bowling',
      casino: 'casino',
      zoo: 'zoo',
      stadium: 'stadium',
      park: 'park',
      tourist_attraction: 'tourist',

      // Lodging
      lodging: 'hotel',
    }

    for (const type of types) {
      if (typeMap[type]) {
        return typeMap[type]
      }
    }

    // Tipo padrão se não encontrar correspondência (evita 'bar' se for desconhecido)
    // Se não tiver nenhum tipo conhecido, retorna o primeiro tipo original formatado ou 'place'
    if (types.length > 0) {
      // Formata o primeiro tipo (ex: point_of_interest -> Point Of Interest)
      return types[0].replace(/_/g, ' ');
    }

    return 'local';
  }

  /**
   * Mapeia Vibe Category para tipos do Google Places
   * Atualizado para incluir mais tipos relevantes e garantir melhores resultados
   */
  private static mapVibeToGoogleTypes(vibe: string): string[] {
    const map: Record<string, string[]> = {
      // Date: Lugares românticos, gastronômicos e culturais leves
      'date': [
        'restaurant', 'cafe', 'bakery', 'wine_bar', 'cocktail_bar',
        'french_restaurant', 'italian_restaurant', 'japanese_restaurant',
        'fine_dining_restaurant', 'art_gallery', 'museum',
        'book_store', 'coffee_shop', 'dessert_shop', 'ice_cream_shop',
        'tea_house', 'bistro', 'brunch_restaurant'
      ],
      // Party: Vida noturna e agito
      'party': [
        'night_club', 'bar', 'cocktail_bar', 'dance_club',
        'live_performance_venue', 'music_venue', 'karaoke',
        'disco', 'pub', 'sports_bar', 'beer_garden'
      ],
      // Culture: Arte, cultura e educação
      'culture': [
        'museum', 'art_gallery', 'performing_arts_theater',
        'cultural_center', 'library', 'theater', 'concert_hall',
        'exhibition_hall', 'cultural_landmark', 'historical_landmark',
        'opera_house', 'planetarium', 'science_museum'
      ]
    };
    return map[vibe] || [];
  }
}

// Freeze the class to prevent modifications at runtime
if (process.env.NODE_ENV !== 'test') {
  Object.freeze(GooglePlacesService);
}
