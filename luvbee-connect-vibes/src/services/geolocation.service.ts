/**
 * Geolocation Service - Mecanismo robusto de obtenção de localização
 * Com fallback para falhas e timeout configurável
 */

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface GeoLocationError {
  code: number
  message: string
  userMessage: string
}

export interface GeoLocationOptions {
  timeout?: number // milliseconds
  maximumAge?: number // milliseconds
  enableHighAccuracy?: boolean
  fallbackToIP?: boolean
}

import { safeLog } from '@/lib/safe-log'

export class GeolocationService {
  private static readonly DEFAULT_TIMEOUT = 10000 // 10 segundos
  private static readonly DEFAULT_MAX_AGE = 60000 // 1 minuto

  /**
   * Obtém localização do navegador com fallback robusto
   */
  static async getCurrentLocation(options: GeoLocationOptions = {}): Promise<GeoLocation> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      maximumAge = this.DEFAULT_MAX_AGE,
      enableHighAccuracy = true,
      fallbackToIP = true
    } = options

    // Verificar se geolocation está disponível
    if (!navigator.geolocation) {
      if (fallbackToIP) {
        return this.getLocationFromIP()
      }
      throw this.createError(2, 'Geolocation não é suportada pelo navegador')
    }

    return new Promise((resolve, reject) => {
      let isResolved = false

      // Configurar timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          if (fallbackToIP) {
            this.getLocationFromIP().then(resolve).catch(reject)
          } else {
            reject(this.createError(3, 'Timeout ao obter localização'))
          }
        }
      }, timeout)

      // Obter localização
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            
            const location: GeoLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            }
            
            // Validar coordenadas
            if (this.isValidCoordinates(location.latitude, location.longitude)) {
              resolve(location)
            } else {
              reject(this.createError(4, 'Coordenadas inválidas recebidas'))
            }
          }
        },
        (error) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            
            // Mapear erros do navegador
            const mappedError = this.mapBrowserError(error)
            
            // Para PERMISSION_DENIED (1), POSITION_UNAVAILABLE (2) ou TIMEOUT (3), tentar IP quando habilitado
            if (fallbackToIP && (error.code === 1 || error.code === 2 || error.code === 3)) {
              this.getLocationFromIP().then(resolve).catch(() => reject(mappedError))
            } else {
              reject(mappedError)
            }
          }
        },
        {
          timeout,
          maximumAge,
          enableHighAccuracy
        }
      )
    })
  }

  /**
   * Obtém localização aproximada via IP (fallback)
   */
  private static async getLocationFromIP(): Promise<GeoLocation> {
    try {
      // Usar múltiplos serviços de IP para maior confiabilidade
      const services = [
        'https://ipapi.co/json/',
        'https://ipwho.is/',
        'https://freeipapi.com/api/json/',
        'https://ipapi.com/json/',
        'https://get.geojs.io/v1/ip/geo.json'
      ]

      for (const service of services) {
        try {
          safeLog('info', `[GeolocationService] Tentando serviço IP: ${service}`)
          const response = await fetch(service, { 
            timeout: 5000,
            headers: { 'Accept': 'application/json' }
          })
          
          if (!response.ok) {
            safeLog('warn', `[GeolocationService] Serviço ${service} retornou status: ${response.status}`)
            continue
          }
          
          const data = await response.json()
          safeLog('info', `[GeolocationService] Resposta de ${service}:`, data)
          
          // Extrair coordenadas (formatos variados)
          const lat = data.latitude || data.lat || data.latitute || data.latitude_deg
          const lng = data.longitude || data.lon || data.lng || data.longitude_deg
          
          if (lat && lng && this.isValidCoordinates(lat, lng)) {
            safeLog('info', `[GeolocationService] Coordenadas válidas encontradas: ${lat}, ${lng}`)
            return {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
              accuracy: 50000, // 50km de precisão aproximada
              timestamp: Date.now()
            }
          }
        } catch (error) {
          safeLog('warn', `[GeolocationService] Falha ao obter localização de ${service}:`, error)
          continue
        }
      }
      
      throw new Error('Todos os serviços de IP falharam')
    } catch (error) {
      safeLog('error', '[GeolocationService] Falha total nos serviços de IP, usando fallback padrão', error)
      // Fallback final: localização padrão (São Paulo)
      safeLog('warn', 'Usando localização padrão (São Paulo) como último fallback')
      return {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracy: 100000, // 100km
        timestamp: Date.now()
      }
    }
  }

  /**
   * Verifica se as coordenadas são válidas
   */
  private static isValidCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    )
  }

  /**
   * Mapeia erros do navegador para nosso formato
   */
  private static mapBrowserError(error: GeolocationPositionError): GeoLocationError {
    const messages = {
      1: 'Permissão de localização negada',
      2: 'Posição indisponível',
      3: 'Timeout ao obter localização'
    }

    return {
      code: error.code,
      message: error.message || messages[error.code] || 'Erro desconhecido',
      userMessage: messages[error.code] || 'Erro ao obter localização'
    }
  }

  /**
   * Cria erro personalizado
   */
  private static createError(code: number, message: string): GeoLocationError {
    return {
      code,
      message,
      userMessage: message
    }
  }

  /**
   * Verifica se o navegador suporta geolocation
   */
  static isGeolocationSupported(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Solicita permissão de localização (para navegadores modernos)
   */
  static async requestPermission(): Promise<PermissionState | null> {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        return result.state as PermissionState
      } catch (error) {
        console.warn('Não foi possível verificar permissão de geolocation:', error)
        return null
      }
    }
    return null
  }
}