/**
 * Google Maps TypeScript Definitions
 * Tipos para Google Maps JavaScript API
 */

declare global {
  interface Window {
    google: typeof google
  }
}

// Tipos básicos do Google Maps (simplificados)
declare namespace google {
  namespace maps {
    // Método importLibrary para carregar bibliotecas dinamicamente
    interface MapsLibrary {
      importLibrary(libraryName: 'places' | 'drawing' | 'geometry' | 'visualization'): Promise<any>
    }

    interface Maps extends MapsLibrary {
      places?: places.PlacesLibrary
      importLibrary(libraryName: 'places' | 'drawing' | 'geometry' | 'visualization'): Promise<any>
    }

    namespace places {
      // Places Library retornada por importLibrary
      interface PlacesLibrary {
        PlaceAutocompleteElement?: typeof PlaceAutocompleteElement
        PlaceDetailsElement?: typeof PlaceDetailsElement
        PlaceSearchElement?: typeof PlaceSearchElement
        Autocomplete?: typeof Autocomplete
        Place?: typeof Place // Nova API Place
        PlacesService?: typeof PlacesService // Legacy - deprecated
      }

      // Nova API Place (recomendada)
      interface Place {
        id: string
        displayName?: string
        formattedAddress?: string
        location?: LatLng
        photos?: PlacePhoto[]
        rating?: number
        priceLevel?: number
        regularOpeningHours?: {
          weekdayDescriptions?: string[]
        }
        nationalPhoneNumber?: string
        internationalPhoneNumber?: string
        websiteURI?: string
        types?: string[]
        fetchFields(options: { fields: string[] }): Promise<void>
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        NOT_FOUND = 'NOT_FOUND',
        REQUEST_DENIED = 'REQUEST_DENIED',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        INVALID_REQUEST = 'INVALID_REQUEST',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }

      interface PlaceDetailsRequest {
        placeId: string
        fields?: string[]
      }

      interface PlaceResult {
        place_id?: string
        name?: string
        formatted_address?: string
        geometry?: {
          location?: {
            lat(): number
            lng(): number
          }
        }
        photos?: PlacePhoto[]
        rating?: number
        price_level?: number
        opening_hours?: {
          open_now?: boolean
          weekday_text?: string[]
        }
        formatted_phone_number?: string
        website?: string
        types?: string[]
      }

      interface PlacePhoto {
        getUrl(options: { maxWidth?: number; maxHeight?: number }): string
        height: number
        width: number
      }

      class PlacesService {
        constructor(attrContainer: HTMLElement | HTMLDivElement)
        getDetails(
          request: PlaceDetailsRequest,
          callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
        ): void
      }

      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions)
        getPlace(): PlaceResult
        addListener(eventName: string, handler: () => void): void
      }

      interface AutocompleteOptions {
        types?: string[]
        componentRestrictions?: {
          country?: string | string[]
        }
        fields?: string[]
      }

      // Nova API - PlaceAutocompleteElement (Web Component do Places UI Kit)
      interface PlaceAutocompleteElement extends HTMLElement {
        input: HTMLInputElement
        requestedResultTypes?: string[]
        componentRestrictions?: {
          country?: string | string[]
        }
        addEventListener(type: 'gmp-placeselect', listener: (event: PlaceSelectEvent) => void): void
        removeEventListener(type: 'gmp-placeselect', listener: (event: PlaceSelectEvent) => void): void
      }

      // PlaceDetailsElement do Places UI Kit
      interface PlaceDetailsElement extends HTMLElement {
        placeId?: string
        requestedFields?: string[]
        addEventListener(type: 'gmp-placedetails', listener: (event: PlaceDetailsEvent) => void): void
      }

      // PlaceSearchElement do Places UI Kit
      interface PlaceSearchElement extends HTMLElement {
        location?: { lat: number; lng: number }
        radius?: number
        query?: string
        addEventListener(type: 'gmp-placesearch', listener: (event: PlaceSearchEvent) => void): void
      }

      interface PlaceSelectEvent extends Event {
        detail: {
          place: PlaceResult
        }
      }

      interface PlaceDetailsEvent extends Event {
        detail: {
          place: PlaceResult
        }
      }

      interface PlaceSearchEvent extends Event {
        detail: {
          places: PlaceResult[]
        }
      }
    }

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
      ): void
    }

    enum GeocoderStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }

    interface GeocoderRequest {
      address?: string
      location?: LatLng
      placeId?: string
    }

    interface GeocoderResult {
      address_components: AddressComponent[]
      formatted_address: string
      geometry: Geometry
      place_id: string
      types: string[]
    }

    interface AddressComponent {
      long_name: string
      short_name: string
      types: string[]
    }

    interface Geometry {
      location: LatLng
      location_type: string
      viewport: LatLngBounds
    }

    class LatLng {
      lat(): number
      lng(): number
    }

    class LatLngBounds {
      getNorthEast(): LatLng
      getSouthWest(): LatLng
    }
  }
}

export {}

