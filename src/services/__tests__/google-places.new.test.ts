import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GooglePlacesService } from '../google-places.service'
import { GoogleMapsLoader } from '../google-maps-loader.service'

// Mock dependencies
vi.mock('../google-maps-loader.service', () => ({
  GoogleMapsLoader: {
    load: vi.fn()
  }
}))

describe('GooglePlacesService', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset pending searches and cache
    // @ts-ignore - accessing private static properties for testing
    GooglePlacesService.pendingSearches = new Map()
    // @ts-ignore
    GooglePlacesService.cache = new Map()
    
    // Setup global fetch
    global.fetch = vi.fn()
    
    // Mock window
    vi.stubGlobal('window', {
      google: {
        maps: {
          places: {
            PlacesService: vi.fn(),
            PlacesServiceStatus: {
              OK: 'OK',
              ZERO_RESULTS: 'ZERO_RESULTS'
            }
          },
          LatLng: vi.fn()
        },
        importLibrary: vi.fn()
      },
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn()
      },
      document: {
        createElement: vi.fn(() => ({}))
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('should use JS SDK when available', async () => {
    // Mock Google Maps Loader success
    (GoogleMapsLoader.load as any).mockResolvedValue(undefined)
    
    const mockNearbySearch = vi.fn((request, callback) => {
      callback(
        [{ 
          place_id: '123', 
          name: 'Test Place', 
          vicinity: 'Test Address',
          geometry: { location: { lat: () => 10, lng: () => 20 } },
          photos: []
        }], 
        'OK'
      )
    })
    
    // Mock PlacesService constructor
    const MockPlacesService = vi.fn()
    MockPlacesService.prototype.nearbySearch = mockNearbySearch
    
    window.google.maps.places.PlacesService = MockPlacesService as any

    const result = await GooglePlacesService.searchNearby({
      latitude: 10,
      longitude: 20,
      radius: 1000
    })

    expect(GoogleMapsLoader.load).toHaveBeenCalled()
    expect(MockPlacesService).toHaveBeenCalled()
    expect(mockNearbySearch).toHaveBeenCalled()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].place_id).toBe('123')
  })

  it('should fallback to Edge Function when JS SDK fails', async () => {
    // Mock JS SDK failure
    (GoogleMapsLoader.load as any).mockRejectedValue(new Error('SDK Load Failed'))
    
    // Mock Edge Function response
    const mockFetch = global.fetch as any
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ place_id: '456', name: 'Edge Place' }] })
    })

    const result = await GooglePlacesService.searchNearby({
      latitude: 10,
      longitude: 20
    })

    expect(GoogleMapsLoader.load).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('search-nearby'),
      expect.anything()
    )
    expect(result.data).toHaveLength(1)
    expect(result.data![0].place_id).toBe('456')
  })

  it('should fallback to REST API when Edge Function fails', async () => {
    // Mock JS SDK failure
    (GoogleMapsLoader.load as any).mockRejectedValue(new Error('SDK Load Failed'))
    
    // Mock Edge Function failure and REST success
    const mockFetch = global.fetch as any
    mockFetch.mockImplementation((url: string) => {
      if (url && url.includes('search-nearby')) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' })
      }
      if (url && url.includes('maps.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'OK', results: [{ place_id: '789', name: 'REST Place' }] })
        })
      }
      return Promise.reject('Unknown URL: ' + url)
    })
    
    // Set API Key
    GooglePlacesService.initialize('TEST_KEY')

    const result = await GooglePlacesService.searchNearby({
      latitude: 10,
      longitude: 20
    })

    expect(result.data).toHaveLength(1)
    expect(result.data![0].place_id).toBe('789')
  })
})
