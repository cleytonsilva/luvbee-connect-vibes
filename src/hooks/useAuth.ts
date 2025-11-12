import { create } from 'zustand'
import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../types/app.types'
import { AuthService } from '../services/auth.service'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  loadUserProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await AuthService.signIn(email, password)
      if (result.error) {
        set({ error: result.error, isLoading: false })
        return
      }
      
      if (result.data) {
        set({ user: result.data, isLoading: false, error: null })
        // Carregar perfil em background sem bloquear
        get().loadUserProfile().catch(err => {
          console.warn('Erro ao carregar perfil após login:', err)
        })
      } else {
        set({ error: 'Falha ao fazer login. Tente novamente.', isLoading: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Falha ao fazer login. Verifique suas credenciais e tente novamente.'
      set({ 
        error: errorMessage, 
        isLoading: false 
      })
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await AuthService.signUp({ email, password, name })
      if (result.error) {
        set({ error: result.error, isLoading: false })
        return
      }
      
      if (result.data) {
        set({ user: result.data, isLoading: false, error: null })
        // Carregar perfil em background sem bloquear
        get().loadUserProfile().catch(err => {
          console.warn('Erro ao carregar perfil após registro:', err)
        })
      } else {
        set({ error: 'Falha ao criar conta. Tente novamente.', isLoading: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Falha ao criar conta. Verifique suas informações e tente novamente.'
      set({ 
        error: errorMessage, 
        isLoading: false 
      })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await AuthService.signOut()
      if (result.error) {
        set({ error: result.error, isLoading: false })
        return
      }
      
      set({ user: null, profile: null, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign out', 
        isLoading: false 
      })
    }
  },

  loadUserProfile: async () => {
    const { user } = get()
    if (!user) return

    // Prevenir múltiplas chamadas simultâneas
    const currentProfile = get().profile
    if (currentProfile?.id === user.id) {
      // Já tem perfil carregado para este usuário, não recarregar
      return
    }

    // Usar flag separada para não interferir com loading de auth
    set({ error: null })
    try {
      const result = await AuthService.getUserProfile(user.id)
      if (result.error) {
        // Se erro 406 ou usuário não encontrado, não é crítico - apenas log
        console.warn('Erro ao carregar perfil:', result.error)
        return
      }
      
      set({ profile: result.data })
    } catch (error) {
      console.warn('Erro ao carregar perfil:', error)
    }
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    const { user } = get()
    if (!user) throw new Error('Usuário não autenticado')

    set({ isLoading: true, error: null })
    try {
      const result = await AuthService.updateProfile(user.id, data)
      if (result.error) {
        const errorMessage = result.error
        set({ error: errorMessage, isLoading: false })
        throw new Error(errorMessage)
      }
      
      // Atualizar perfil local sem recarregar do servidor (evita loop)
      if (result.data) {
        set({ profile: result.data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      set({ 
        error: errorMessage, 
        isLoading: false 
      })
      throw error // Re-lançar para que o componente possa tratar
    }
  }
}))

export const useAuth = () => {
  const { 
    user, 
    profile, 
    isLoading, 
    error,
    setUser,
    setProfile,
    signIn,
    signUp,
    signOut,
    loadUserProfile,
    updateProfile,
    clearError
  } = useAuthStore()
  
  // Usar ref para evitar loops infinitos
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (hasInitialized.current) return
    
    let mounted = true
    hasInitialized.current = true

    const checkUser = async () => {
      try {
        const result = await AuthService.getCurrentUser()
        if (!mounted) return
        
        if (result.data) {
          setUser(result.data)
          // Carregar perfil sem await para não bloquear
          loadUserProfile().catch(err => console.warn('Erro ao carregar perfil inicial:', err))
        }
        // Always set loading to false after check
        useAuthStore.setState({ isLoading: false })
      } catch (error) {
        if (!mounted) return
        // Error getting user (likely not authenticated), set loading to false
        useAuthStore.setState({ isLoading: false })
      }
    }

    checkUser()

    const { data: { subscription } } = AuthService.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // Carregar perfil sem alterar isLoading para evitar loops
        loadUserProfile().catch(err => console.warn('Erro ao carregar perfil após sign in:', err))
        useAuthStore.setState({ isLoading: false })
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        useAuthStore.setState({ isLoading: false })
      } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Initial session loaded, stop loading
        useAuthStore.setState({ isLoading: false })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      hasInitialized.current = false
    }
  }, [setUser, setProfile]) // Removido loadUserProfile das dependências

  const initializeAuth = async () => {
    const result = await AuthService.getCurrentUser()
    if (result.data) {
      setUser(result.data)
      await loadUserProfile()
    }
  }

  return {
    user,
    profile,
    isLoading,
    loading: isLoading, // Alias para compatibilidade
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    loadUserProfile,
    clearError,
    initializeAuth, // Para compatibilidade com App.tsx
  }
}