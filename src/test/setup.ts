import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

vi.mock('@/integrations/supabase', () => {
  const chain: any = {
    upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
    select: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })), maybeSingle: vi.fn(() => ({ data: null, error: null })) })),
    eq: vi.fn(() => chain),
    delete: vi.fn(() => ({ lt: vi.fn(() => ({ count: 0, error: null })) })),
    order: vi.fn(() => chain),
    range: vi.fn(() => ({ data: [], count: 0, error: null })),
    limit: vi.fn(() => ({ data: [], error: null })),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
  }

  return {
    supabase: {
      from: vi.fn(() => chain),
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null } })),
        getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        updateUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: null })),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/avatar.png' } })),
        })),
      },
    },
    isSupabaseConfigured: () => false,
  }
})
