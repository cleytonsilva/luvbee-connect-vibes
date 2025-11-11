import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'

// Mock the auth service
vi.mock('../services/auth.service', () => ({
  AuthService: {
    getCurrentUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUserProfile: vi.fn(),
  },
}))

// Mock zustand store
vi.mock('zustand', () => ({
  create: () => () => ({
    user: null,
    profile: null,
    isLoading: false,
    error: null,
    setUser: vi.fn(),
    setProfile: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    loadUserProfile: vi.fn(),
    updateProfile: vi.fn(),
  })
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return auth state and methods', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('profile')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('signIn')
    expect(result.current).toHaveProperty('signUp')
    expect(result.current).toHaveProperty('signOut')
    expect(result.current).toHaveProperty('updateProfile')
    expect(result.current).toHaveProperty('loadUserProfile')
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})