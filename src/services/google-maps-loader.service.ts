/**
 * Google Maps Loader - Carrega e gerencia Google Maps JavaScript API
 */

// @ts-ignore
declare var google: any;

declare global {
  interface Window {
    google: typeof google
  }
}

export class GoogleMapsLoader {
  private static loadPromise: Promise<void> | null = null
  private static isLoaded = false
  private static authFailed = false

  /**
   * Carrega o Google Maps JavaScript API dinamicamente com Places UI Kit
   * Usa importLibrary() para carregar as bibliotecas necessárias
   */
  static async load(): Promise<void> {
    // Se houve falha de autenticação anterior, rejeitar imediatamente
    if (this.authFailed) {
        return Promise.reject(new Error('Google Maps Authentication Error (Cached): ApiTargetBlockedMapError'))
    }

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

    // Verificar se o script já existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Script já existe, aguardar carregamento e carregar bibliotecas
      this.loadPromise = this.waitForGoogleMapsAndLoadLibraries()
      return this.loadPromise
    }

    // Criar nova promise de carregamento
    this.loadPromise = new Promise((resolve, reject) => {
      // Callback global para erro de autenticação do Google Maps
      // @ts-ignore
      window.gm_authFailure = () => {
        this.isLoaded = false
        this.authFailed = true
        this.loadFailed = true
        const error = new Error('Google Maps Authentication Error: ApiTargetBlockedMapError or similar')
        console.error('[GoogleMapsLoader] gm_authFailure detected:', error)
        reject(error)
      }

      // Criar script element com loading=async
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`
      script.async = true
      script.defer = true
      
      script.onload = async () => {
        try {
          // Aguardar um pouco para garantir que o objeto google está disponível
          await new Promise(resolve => setTimeout(resolve, 100))
          
          if (!window.google?.maps) {
            reject(new Error('Google Maps não está disponível'))
            return
          }

          // Carregar biblioteca Places usando importLibrary (Places UI Kit)
          await window.google.maps.importLibrary('places')
          
          this.isLoaded = true
          resolve()
        } catch (error) {
          // Se falhar o importLibrary, mas o script carregou, podemos tentar continuar
          // ou rejeitar se for crítico.
          // Se ApiTargetBlockedMapError ocorrer, geralmente gm_authFailure é chamado.
          console.warn('[GoogleMapsLoader] Erro ao importar biblioteca places:', error)
          reject(error)
        }
      }
      
      script.onerror = () => {
        reject(new Error('Erro ao carregar Google Maps JavaScript API (script error)'))
      }

      document.head.appendChild(script)
    })

    return this.loadPromise
  }

  /**
   * Aguarda o Google Maps estar disponível e carrega as bibliotecas necessárias
   */
  private static async waitForGoogleMapsAndLoadLibraries(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Verificar se já está disponível
      if (window.google?.maps?.importLibrary) {
        try {
          // Carregar biblioteca Places usando importLibrary (Places UI Kit)
          await window.google.maps.importLibrary('places')
          this.isLoaded = true
          resolve()
          return
        } catch (error) {
          reject(new Error(`Erro ao carregar Places UI Kit: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
          return
        }
      }

      // Aguardar até que o script seja carregado
      const checkInterval = setInterval(async () => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(checkInterval)
          try {
            // Carregar biblioteca Places usando importLibrary (Places UI Kit)
            await window.google.maps.importLibrary('places')
            this.isLoaded = true
            resolve()
          } catch (error) {
            reject(new Error(`Erro ao carregar Places UI Kit: ${error instanceof Error ? error.message : 'Erro desconhecido'}`))
          }
        }
      }, 100)

      // Timeout após 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps?.importLibrary) {
          reject(new Error('Google Maps JavaScript API não carregou após 10 segundos'))
        }
      }, 10000)
    })
  }

  /**
   * Verifica se o Google Maps está carregado
   */
  static isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps?.places
  }

  /**
   * Verifica se houve falha de autenticação ou carregamento
   */
  static hasAuthFailed(): boolean {
    return this.authFailed || this.loadFailed
  }

  /**
   * Carrega a biblioteca Places UI Kit e retorna os componentes disponíveis
   */
  static async loadPlacesUIKit(): Promise<{
    PlaceAutocompleteElement?: any
    PlaceDetailsElement?: any
    PlaceSearchElement?: any
  }> {
    if (!this.isLoaded) {
      await this.load()
    }

    if (!window.google?.maps?.importLibrary) {
      throw new Error('Google Maps importLibrary não está disponível')
    }

    const placesLibrary = await window.google.maps.importLibrary('places')
    return placesLibrary as any
  }

}
