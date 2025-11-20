/**
 * Reverse Geocoding Service - Converte coordenadas em endereço
 * Baseado em: https://developers.google.com/maps/documentation/geocoding?hl=pt-br
 */

import { GoogleMapsLoader } from '@/services/google-maps-loader.service'
import type { ApiResponse } from '@/types/app.types'

export interface ReverseGeocodeResult {
  formatted_address: string
  address_components: {
    long_name: string
    short_name: string
    types: string[]
  }[]
  place_id?: string
  city?: string
  state?: string
  country?: string
}

export class ReverseGeocodingService {
  /**
   * Converte coordenadas (lat, lng) em endereço formatado usando Geocoding API
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<ReverseGeocodeResult>> {
    try {
      // Carregar Google Maps API
      await GoogleMapsLoader.load()

      if (!window.google?.maps?.Geocoder) {
        throw new Error('Geocoder não está disponível')
      }

      return new Promise((resolve) => {
        const geocoder = new window.google.maps.Geocoder()

        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
              const result = results[0]

              // Extrair componentes do endereço
              const addressComponents = result.address_components || []
              let city = ''
              let state = ''
              let country = ''

              addressComponents.forEach((component) => {
                const types = component.types
                if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                  city = component.long_name
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name
                }
                if (types.includes('country')) {
                  country = component.long_name
                }
              })

              resolve({
                data: {
                  formatted_address: result.formatted_address,
                  address_components: addressComponents.map((comp) => ({
                    long_name: comp.long_name,
                    short_name: comp.short_name,
                    types: comp.types,
                  })),
                  place_id: result.place_id,
                  city,
                  state,
                  country,
                },
              })
            } else {
              resolve({
                error: `Geocoding falhou: ${status}`,
              })
            }
          }
        )
      })
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Erro ao fazer reverse geocoding',
      }
    }
  }
}

