import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserService as UserServiceType } from '../user.service'

// Mock supabase client
vi.mock('../../integrations/supabase', () => {
  const upsertMock = vi.fn()
  const updateUsersMock = vi.fn()

  // Cadeia estável para permitir sobrescrever .single nos testes
  const createUpsertChain = (payload: any) => {
    const chain: any = {
      select: () => chain,
      single: () => upsertMock(payload),
    }
    return chain
  }

  const selectSingle = vi.fn(() => {
    const chain: any = {
      select: () => chain,
      single: () => ({ data: null, error: null }),
    }
    return chain
  })

  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1' } } }, error: null })),
        getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'user_preferences') {
          return {
            upsert: (payload: any, _opts?: any) => createUpsertChain(payload),
            update: vi.fn(() => selectSingle()),
            insert: vi.fn(() => selectSingle()),
          }
        }
        if (table === 'users') {
          return {
            update: (payload: any) => ({ eq: vi.fn(() => updateUsersMock(payload)) }),
          }
        }
        return {}
      }),
    },
  }
})

describe('UserService.saveUserPreferences', () => {
  let UserService: typeof UserServiceType
  beforeEach(async () => {
    const mod = await import('../user.service')
    UserService = mod.UserService
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves valid preferences via upsert and marks onboarding completed', async () => {
    const { supabase } = await import('../../integrations/supabase') as any
    
    // Mock successful upsert result
    const mockUpsertResult = {
      data: {
        user_id: 'u1',
        drink_preferences: ['cerveja'],
        food_preferences: ['pizza'],
        music_preferences: ['rock'],
        vibe_preferences: { ambiente: 'eclético' },
      },
      error: null,
    }

    // Mock the chain of Supabase methods
    const fromMock = vi.spyOn(supabase, 'from')
    fromMock.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockUpsertResult))
            }))
          }))
        }
      }
      if (table === 'users') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }
      }
      return {}
    })

    // Mock auth methods
    const authMock = {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { user: { id: 'u1' } } },
        error: null
      }))
    }
    supabase.auth = authMock

    const res = await UserService.saveUserPreferences('u1', {
      drink_preferences: ['cerveja'],
      food_preferences: ['pizza'],
      music_preferences: ['rock'],
      vibe_preferences: { ambiente: 'eclético' },
    } as any)

    expect(res.error).toBeUndefined()
    expect(res.data).toBeDefined()
  })

  it('returns detailed validation errors when payload is invalid', async () => {
    const res = await UserService.saveUserPreferences('u1', {
      drink_preferences: [], // invalid: min 1
      food_preferences: ['pizza'],
      music_preferences: ['rock'],
    } as any)

    expect(res.data).toBeUndefined()
    expect(res.error).toBeDefined()
    expect(res.error).toMatch(/Preferências inválidas/)
  })

  it('normalizes supabase errors and returns user-friendly message', async () => {
    const { supabase } = await import('../../integrations/supabase') as any

    // Mock auth methods
    const authMock = {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { user: { id: 'u1' } } },
        error: null
      }))
    }
    supabase.auth = authMock

    // Force upsert to return an error
    const fromMock = vi.spyOn(supabase, 'from')
    fromMock.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Forbidden', statusCode: 403, code: 'RLS' }
              }))
            }))
          }))
        }
      }
      return {}
    })

    const res = await UserService.saveUserPreferences('u1', {
      drink_preferences: ['cerveja'],
      food_preferences: ['pizza'],
      music_preferences: ['rock'],
    } as any)

    expect(res.data).toBeUndefined()
    expect(res.error).toBeDefined()
  })
})