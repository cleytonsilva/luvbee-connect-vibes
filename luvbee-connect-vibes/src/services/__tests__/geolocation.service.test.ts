/**
 * Testes para GeolocationService - Validação de erros e fallback
 */

import { GeolocationService } from '@/services/geolocation.service'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('GeolocationService - IP Fallback and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve tentar múltiplos serviços de IP quando o principal falha', async () => {
    // Mock fetch para simular falha do primeiro serviço e sucesso do segundo
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: -22.9068,
          longitude: -43.1729,
          city: 'Rio de Janeiro'
        })
      })

    global.fetch = mockFetch

    const result = await GeolocationService.getCurrentLocation({
      fallbackToIP: true
    })

    expect(result.latitude).toBe(-22.9068)
    expect(result.longitude).toBe(-43.1729)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('deve usar localização padrão (São Paulo) quando todos os serviços de IP falham', async () => {
    // Mock fetch para simular falha de todos os serviços
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const result = await GeolocationService.getCurrentLocation({
      fallbackToIP: true
    })

    // Deve usar fallback de São Paulo
    expect(result.latitude).toBe(-23.5505)
    expect(result.longitude).toBe(-46.6333)
    expect(result.accuracy).toBe(100000) // 100km
  })

  it('deve logar tentativas de serviços de IP', async () => {
    const consoleSpy = vi.spyOn(console, 'info')
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latitude: -22.9068,
        longitude: -43.1729
      })
    })
    global.fetch = mockFetch

    await GeolocationService.getCurrentLocation({
      fallbackToIP: true
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GeolocationService] Tentando serviço IP:'),
      undefined
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GeolocationService] Coordenadas válidas encontradas:'),
      undefined
    )
  })

  it('deve tratar diferentes formatos de resposta de serviços de IP', async () => {
    const testCases = [
      { latitude: -22.9068, longitude: -43.1729 },
      { lat: -22.9068, lng: -43.1729 },
      { lat: -22.9068, lon: -43.1729 },
      { latitude_deg: -22.9068, longitude_deg: -43.1729 }
    ]

    for (const testData of testCases) {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => testData
      })
      global.fetch = mockFetch

      const result = await GeolocationService.getCurrentLocation({
        fallbackToIP: true
      })

      expect(result.latitude).toBe(-22.9068)
      expect(result.longitude).toBe(-43.1729)
    }
  })

  it('deve rejeitar coordenadas inválidas', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latitude: 999, // Inválido
        longitude: 999  // Inválido
      })
    })
    global.fetch = mockFetch

    // Deve usar fallback de São Paulo
    const result = await GeolocationService.getCurrentLocation({
      fallbackToIP: true
    })

    expect(result.latitude).toBe(-23.5505)
    expect(result.longitude).toBe(-46.6333)
  })
})
  it('deve fazer fallback para IP quando geolocation retorna POSITION_UNAVAILABLE (code 2)', async () => {
    // Mock geolocation para retornar erro code 2
    // @ts-ignore
    global.navigator.geolocation = {
      getCurrentPosition: (success: any, error: any) => {
        error({ code: 2, message: 'Position unavailable' })
      }
    }

    // Mock de IP
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latitude: -22.9068, longitude: -43.1729 })
    })
    // @ts-ignore
    global.fetch = mockFetch

    const result = await GeolocationService.getCurrentLocation({ fallbackToIP: true })
    expect(result.latitude).toBe(-22.9068)
    expect(result.longitude).toBe(-43.1729)
  })