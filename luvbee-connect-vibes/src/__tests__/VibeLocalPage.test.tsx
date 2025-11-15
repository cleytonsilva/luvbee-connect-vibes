/**
 * Testes para VibeLocalPage - Validação de erros de geolocalização e renderização
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { VibeLocalPage } from '@/pages/VibeLocalPage'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock dos serviços e hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { location: 'São Paulo, SP' }
  })
}))

vi.mock('@/store/useVibeMode', () => ({
  useVibeModeStore: () => ({ soloMode: false })
}))

vi.mock('@/hooks/useVibePlaces', () => ({
  useVibePlaces: vi.fn(() => ({
    places: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    hasMore: false,
    loadMore: vi.fn(),
    cacheStatus: 'none'
  }))
}))

describe('VibeLocalPage - Geolocation Error Handling', () => {
  beforeEach(() => {
    // Resetar mocks antes de cada teste
    vi.clearAllMocks()
    
    // Mock do console para verificar logs
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve exibir mensagem de erro apropriada para geolocation code 2 (POSITION_UNAVAILABLE)', async () => {
    // Mock do serviço de geolocalização para simular erro
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn((success, error) => {
        error({
          code: 2,
          message: 'Failed to query location from network service',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        })
      })
    }

    render(<VibeLocalPage />)

    // Verificar se a mensagem de erro apropriada é exibida
    await waitFor(() => {
      expect(screen.getByText(/Localização indisponível/i)).toBeInTheDocument()
      expect(screen.getByText(/Não foi possível obter sua localização/i)).toBeInTheDocument()
    })
  })

  it('deve fornecer fallback para cidade manual quando GPS falha', async () => {
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn((success, error) => {
        error({
          code: 2,
          message: 'Position unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        })
      })
    }

    // Mock do localStorage para ter cidade salva
    localStorage.setItem('luvbee_manual_city', 'Rio de Janeiro')
    localStorage.setItem('luvbee_manual_state', 'RJ')

    render(<VibeLocalPage />)

    await waitFor(() => {
      // Deve mostrar a opção de usar localização manual
      expect(screen.getByText(/Usando localização do perfil/i)).toBeInTheDocument()
    })
  })

  it('deve exibir interface de busca manual quando não há localização disponível', async () => {
    global.navigator.geolocation = undefined

    render(<VibeLocalPage />)

    // Verificar se os componentes de busca manual são exibidos
    await waitFor(() => {
      expect(screen.getByText(/Localização necessária/i)).toBeInTheDocument()
      expect(screen.getByText(/Precisamos da sua localização/i)).toBeInTheDocument()
    })
  })
})

describe('VibeLocalPage - CSS Positioning and Layout', () => {
  it('deve ter layout responsivo sem sobreposição de elementos', () => {
    render(<VibeLocalPage />)

    const container = screen.getByRole('main')
    expect(container).toHaveClass('prevent-mobile-overflow')
    
    // Verificar se os elementos não estão sobrepostos
    const statusBadges = screen.getAllByRole('status')
    statusBadges.forEach((badge, index) => {
      if (index > 0) {
        const prevBadge = statusBadges[index - 1]
        const badgeRect = badge.getBoundingClientRect()
        const prevBadgeRect = prevBadge.getBoundingClientRect()
        
        // Verificar se não há sobreposição vertical
        expect(badgeRect.top).toBeGreaterThanOrEqual(prevBadgeRect.bottom)
      }
    })
  })

  it('deve aplicar classes CSS corretas para mobile', () => {
    // Simular viewport mobile
    global.innerWidth = 375
    global.dispatchEvent(new Event('resize'))

    render(<VibeLocalPage />)

    const locationStatus = screen.getByText(/Modo manual:|Modo GPS/)
    expect(locationStatus).toHaveClass('location-status-badge')
  })
})

describe('VibeLocalPage - Data Validation and Fallbacks', () => {
  it('deve exibir fallback quando não há locais disponíveis', async () => {
    const mockUseVibePlaces = vi.fn(() => ({
      places: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      cacheStatus: 'none'
    }))

    vi.mock('@/hooks/useVibePlaces', () => ({
      useVibePlaces: mockUseVibePlaces
    }))

    render(<VibeLocalPage />)

    await waitFor(() => {
      expect(screen.getByText(/Nenhum local encontrado/i)).toBeInTheDocument()
      expect(screen.getByText(/Aumentar o raio de busca/i)).toBeInTheDocument()
      expect(screen.getByText(/Mudar para outra localização/i)).toBeInTheDocument()
    })
  })

  it('deve validar e exibir informações completas do local', () => {
    const mockPlaces = [{
      id: 'test-place-1',
      name: 'Bar Teste',
      address: 'Rua Teste, 123',
      rating: 4.5,
      description: 'Um bar legal',
      place_id: 'google_place_123'
    }]

    const mockUseVibePlaces = vi.fn(() => ({
      places: mockPlaces,
      loading: false,
      error: null,
      refresh: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      cacheStatus: 'valid'
    }))

    vi.mock('@/hooks/useVibePlaces', () => ({
      useVibePlaces: mockUseVibePlaces
    }))

    render(<VibeLocalPage />)

    // Verificar se todas as informações são exibidas
    expect(screen.getByText('Bar Teste')).toBeInTheDocument()
    expect(screen.getByText('Rua Teste, 123')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('Um bar legal')).toBeInTheDocument()
  })

  it('deve usar fallback quando dados estão incompletos', () => {
    const mockPlaces = [{
      id: 'test-place-incomplete'
      // name, address, rating e description estão faltando
    }]

    const mockUseVibePlaces = vi.fn(() => ({
      places: mockPlaces,
      loading: false,
      error: null,
      refresh: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      cacheStatus: 'valid'
    }))

    vi.mock('@/hooks/useVibePlaces', () => ({
      useVibePlaces: mockUseVibePlaces
    }))

    render(<VibeLocalPage />)

    // Verificar fallbacks
    expect(screen.getByText('Local sem nome')).toBeInTheDocument()
    expect(screen.getByText('Endereço não disponível')).toBeInTheDocument()
  })
})

describe('VibeLocalPage - Error Logging and Monitoring', () => {
  it('deve logar erros de geolocalização apropriadamente', async () => {
    const consoleSpy = vi.spyOn(console, 'error')
    
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn((success, error) => {
        error({
          code: 2,
          message: 'Network error',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        })
      })
    }

    render(<VibeLocalPage />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VibeLocalPage] geolocation error'),
        expect.objectContaining({
          code: 2,
          message: 'Network error'
        })
      )
    })
  })

  it('deve logar informações de estado para debugging', () => {
    const consoleSpy = vi.spyOn(console, 'log')
    
    render(<VibeLocalPage />)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[VibeLocalPage] Estado atual:'),
      expect.objectContaining({
        latitude: expect.anything(),
        longitude: expect.anything(),
        placesCount: expect.any(Number),
        placesLoading: expect.any(Boolean),
        placesError: expect.anything(),
        cacheStatus: expect.any(String),
        soloMode: expect.any(Boolean)
      })
    )
  })
})