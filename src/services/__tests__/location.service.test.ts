import { describe, it, expect, vi } from 'vitest'
import { LocationService } from '../location.service'

// Mock the supabase integration
vi.mock('../../integrations/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}))

describe('LocationService', () => {
  it('should be defined', () => {
    expect(LocationService).toBeDefined()
  })

  it('should have all required methods', () => {
    expect(LocationService.getLocations).toBeDefined()
    expect(LocationService.getLocationById).toBeDefined()
    expect(LocationService.addToFavorites).toBeDefined()
    expect(LocationService.removeFromFavorites).toBeDefined()
  })
})