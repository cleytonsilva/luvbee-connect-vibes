/**
 * Google Maps Loader Compat - Versão compatível com API tradicional
 * Usa a API clássica do Google Maps sem importLibrary
 */

declare global {
  interface Window {
    google: typeof google
    initGoogleMaps?: () => void
  }
}

export class GoogleMapsLoaderCompat {
  private static loadPromise: Promise<void> | null = null
  private static isLoaded = false

  /**
   * Carrega o Google Maps JavaScript API com bibliotecas tradicionais
   */
  static async load(): Promise<void> {
    // Se já está carregado, retornar imediatamente
    if (this.isLoaded && window.google?.maps?.places) {
      return Promise.resolve()
    }

    // Se já está carregando, retornar a promise existente
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Obter API key do ambiente
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('VITE_GOOGLE_MAPS_API_KEY não configurada')
    }

    // Criar nova promise de carregamento
    this.loadPromise = new Promise((resolve, reject) => {
      // Definir callback global
      window.initGoogleMaps = () => {
        this.isLoaded = true
        delete window.initGoogleMaps
        resolve()
      }

      // Criar script com callback e bibliotecas necessárias
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
      script.async = true
      script.defer = true
      
      script.onerror = () => {
        delete window.initGoogleMaps
        reject(new Error('Erro ao carregar Google Maps JavaScript API'))
      }

      document.head.appendChild(script)
    })

    return this.loadPromise
  }

  /**
   * Verifica se o Google Maps está carregado
   */
  static isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps?.places
  }

  /**
   * Cria um serviço Places usando a API tradicional
   */
  static createPlacesService(): google.maps.places.PlacesService | null {
    if (!this.isLoaded || !window.google?.maps?.places) {
      return null
    }

    // Criar um elemento div temporário para o PlacesService
    const tempDiv = document.createElement('div')
    return new window.google.maps.places.PlacesService(tempDiv)
  }

  /**
   * Cria um Autocomplete usando a API tradicional
   */
  static createAutocomplete(input: HTMLInputElement, options?: google.maps.places.AutocompleteOptions): google.maps.places.Autocomplete | null {
    if (!this.isLoaded || !window.google?.maps?.places) {
      return null
    }

    return new window.google.maps.places.Autocomplete(input, options)
  }

  /**
   * Busca lugares próximos usando a API tradicional
   */
  static async nearbySearch(request: google.maps.places.PlaceSearchRequest): Promise<google.maps.places.PlaceResult[]> {
    const service = this.createPlacesService()
    if (!service) {
      throw new Error('Google Maps PlacesService não está disponível')
    }

    return new Promise((resolve, reject) => {
      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results || [])
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([])
        } else {
          reject(new Error(`Erro na busca: ${status}`))
        }
      })
    })
  }

  /**
   * Obtém detalhes de um lugar usando a API tradicional
   */
  static async getPlaceDetails(request: google.maps.places.PlaceDetailsRequest): Promise<google.maps.places.PlaceResult | null> {
    const service = this.createPlacesService()
    if (!service) {
      throw new Error('Google Maps PlacesService não está disponível')
    }

    return new Promise((resolve, reject) => {
      service.getDetails(request, (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(result)
        } else if (status === window.google.maps.places.PlacesServiceStatus.NOT_FOUND) {
          resolve(null)
        } else {
          reject(new Error(`Erro ao obter detalhes: ${status}`))
        }
      })
    })
  }
}