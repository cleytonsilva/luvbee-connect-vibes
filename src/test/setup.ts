import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

const cachedPhotos: any[] = []

const baseChain: any = {
    select: vi.fn(() => chain),
    single: vi.fn(() => ({ data: null, error: null })),
    maybeSingle: vi.fn(() => ({ data: null, error: null })),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => ({ data: [], count: 0, error: null })),
    limit: vi.fn(() => ({ data: [], error: null })),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    lt: vi.fn(() => ({ count: 0, error: null })),
  }

const makeSupabaseMock = () => {
  const chain = { ...baseChain }

  const from = vi.fn((table: string) => {
    if (table === 'cached_place_photos') {
      return {
        insert: vi.fn((row: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const saved = { id: row.id || 'test-cache-id', ...row }
              cachedPhotos.push(saved)
              return { data: saved, error: null }
            }),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: any) => {
            const found = cachedPhotos.filter(p => (p as any)[column] === value)
            return {
              data: found,
              error: null,
              single: vi.fn(async () => ({ data: found[0] || null, error: null })),
            }
          }),
          limit: vi.fn(async (n: number) => ({ data: cachedPhotos.slice(0, n), error: null })),
          single: vi.fn(async () => ({ data: cachedPhotos[0] || null, error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: any) => {
            const before = cachedPhotos.length
            for (let i = cachedPhotos.length - 1; i >= 0; i--) {
              if ((cachedPhotos[i] as any)[column] === value) cachedPhotos.splice(i, 1)
            }
            return { count: before - cachedPhotos.length, error: null }
          }),
        })),
      }
    }
    return chain
  })

  return {
    supabase: {
      from,
      rpc: vi.fn(async (fn: string, params?: any) => {
        if (fn === 'get_cached_photo_url') {
          const row = cachedPhotos.find(p => p.place_id === params?.place_id_param)
          return { data: row?.public_url || null, error: null }
        }
        if (fn === 'version') {
          return { data: 1, error: null }
        }
        return { data: null, error: null }
      }),
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
        from: vi.fn((bucket: string) => ({
          upload: vi.fn(),
          list: vi.fn(async () => ({ data: [], error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/avatar.png' } })),
        })),
      },
    },
    isSupabaseConfigured: () => true,
  }
}

vi.mock('@/integrations/supabase', () => makeSupabaseMock())
vi.mock('../integrations/supabase', () => makeSupabaseMock())
