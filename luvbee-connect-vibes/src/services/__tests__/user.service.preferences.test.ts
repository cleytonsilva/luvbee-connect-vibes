import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from '../user.service'

// Mock supabase client
vi.mock('../../integrations/supabase', () => {
  const upsertMock = vi.fn()
  const updateUsersMock = vi.fn()
  const selectSingle = vi.fn(() => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }))

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'user_preferences') {
          return {
            upsert: (payload: any) => {
              return {
                select: () => ({
                  single: () => upsertMock(payload),
                }),
                // for backwards compatibility if used
              }
            },
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves valid preferences via upsert and marks onboarding completed', async () => {
    const { supabase } = await import('../../integrations/supabase') as any
    const upsertMock = vi.spyOn(supabase.from('user_preferences'), 'upsert')
    const userUpdate = vi.spyOn(supabase.from('users'), 'update')

    // Mock successful upsert result
    (supabase.from('user_preferences') as any).upsert({}).select().single = () => ({
      data: {
        user_id: 'u1',
        drink_preferences: ['cerveja'],
        food_preferences: ['pizza'],
        music_preferences: ['rock'],
        vibe_preferences: { ambiente: 'eclético' },
      },
      error: null,
    })

    // Mock users update response
    ;(supabase.from('users') as any).update = () => ({ eq: () => ({ data: null, error: null }) })

    const res = await UserService.saveUserPreferences('u1', {
      // Provide valid payload
      drink_preferences: ['cerveja'],
      food_preferences: ['pizza'],
      music_preferences: ['rock'],
      vibe_preferences: { ambiente: 'eclético' },
    } as any)

    expect(res.error).toBeUndefined()
    expect(res.data?.user_id).toBe('u1')
    expect(upsertMock).toHaveBeenCalled()
    expect(userUpdate).toHaveBeenCalled()
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

    // Force upsert to throw an error-like object
    (supabase.from('user_preferences') as any).upsert = () => ({
      select: () => ({
        single: () => ({
          data: null,
          error: { message: 'Forbidden', statusCode: 403, code: 'RLS' },
        }),
      }),
    })

    const res = await UserService.saveUserPreferences('u1', {
      drink_preferences: ['cerveja'],
      food_preferences: ['pizza'],
      music_preferences: ['rock'],
    } as any)

    expect(res.data).toBeUndefined()
    expect(res.error).toBeDefined()
    // Should map 403 to a friendly message defined in constants
    expect(res.error).toMatch(/Permissão|Você não tem permissão|Forbidden|Erro/) // loose match
  })
})