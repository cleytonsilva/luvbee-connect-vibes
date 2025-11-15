import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LocationService } from '@/services/location.service'

// Supabase mock com cadeia eq() → resultado
const updateMock = vi.fn()
const deleteMock = vi.fn()
const fromMock = vi.fn((table: string) => ({
  update: (payload: any) => ({
    eq: (col: string, val: any) => ({
      eq: (col2: string, val2: any) => updateMock(payload, col, val, col2, val2)
    })
  }),
  delete: () => ({
    eq: (col: string, val: any) => ({
      eq: (col2: string, val2: any) => deleteMock(col, val, col2, val2)
    })
  })
}))

vi.mock('@/integrations/supabase', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  }
}))

describe('LocationService.removeLocationMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('remove usando UUID quando fornecido place_id', async () => {
    const userId = 'user-123'
    const placeId = 'google_place_abc'
    const uuid = 'a5e1e732-efb9-409a-9e20-205aa72b6497'

    // Primeira tentativa com place_id retorna erro de coluna status ausente → cai para delete
    updateMock.mockReturnValueOnce({ error: { code: '42703', message: 'status column missing' } })
    deleteMock.mockReturnValueOnce({ error: null })

    // hasLocationMatch indica ainda ativo por place_id (simular fallback)
    const hasSpy = vi.spyOn(LocationService, 'hasLocationMatch').mockResolvedValueOnce(true)

    // getLocationByPlaceId retorna UUID
    const getByPlaceSpy = vi.spyOn(LocationService, 'getLocationByPlaceId').mockResolvedValueOnce({ data: { id: uuid } } as any)

    // Tentativa com UUID: update ok, depois hasLocationMatch retorna false
    updateMock.mockReturnValueOnce({ error: null })
    hasSpy.mockResolvedValueOnce(false)

    const res = await LocationService.removeLocationMatch(userId, placeId)
    expect(res.error).toBeUndefined()
    expect(updateMock).toHaveBeenCalled()
    expect(getByPlaceSpy).toHaveBeenCalledWith(placeId)
  })
})