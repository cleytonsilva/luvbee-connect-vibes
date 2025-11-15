/**
 * useMatches Hook - LuvBee Core Platform
 * 
 * Hook para gerenciar matches com pessoas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MatchService, type PotentialMatch } from '@/services/match.service'
import { useAuth } from '@/hooks/useAuth'
import type { PeopleMatchWithUsers } from '@/types/match.types'

interface UsePotentialMatchesOptions {
  limit?: number
  enabled?: boolean
}

/**
 * Hook para buscar matches potenciais (filtrados por locais em comum)
 */
export function usePotentialMatches(options: UsePotentialMatchesOptions = {}) {
  const { user } = useAuth()
  const { limit = 10, enabled = true } = options

  return useQuery({
    queryKey: ['potential-matches', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await MatchService.getPotentialMatches(user.id, limit)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: enabled && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para buscar matches do usuário
 */
export function useUserMatches(status?: 'pending' | 'mutual' | 'unmatched') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-matches', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await MatchService.getUserMatches(user.id, status)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para buscar matches mútuos
 */
export function useMutualMatches() {
  return useUserMatches('mutual')
}

/**
 * Hook para criar um match (like)
 */
export function useCreateMatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await MatchService.createPeopleMatch(user.id, targetUserId)
      if (result.error) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['potential-matches'] })
      queryClient.invalidateQueries({ queryKey: ['user-matches'] })
      queryClient.invalidateQueries({ queryKey: ['compatibility'] })
    },
  })
}

/**
 * Hook para verificar se usuário tem matches com locais
 */
export function useHasLocationMatches() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['has-location-matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return false
      const result = await MatchService.hasLocationMatches(user.id)
      if (result.error) throw new Error(result.error)
      return result.data ?? false
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para buscar um match específico entre dois usuários
 */
export function useMatchByUsers(userId1: string | null, userId2: string | null) {
  return useQuery({
    queryKey: ['match-by-users', userId1, userId2],
    queryFn: async () => {
      if (!userId1 || !userId2) return null
      const result = await MatchService.getMatchByUsers(userId1, userId2)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!userId1 && !!userId2,
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Hook helper para invalidar cache de matches
 */
export function useInvalidateMatches() {
  const queryClient = useQueryClient()

  return {
    invalidatePotential: () => {
      queryClient.invalidateQueries({ queryKey: ['potential-matches'] })
    },
    invalidateUserMatches: () => {
      queryClient.invalidateQueries({ queryKey: ['user-matches'] })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['potential-matches'] })
      queryClient.invalidateQueries({ queryKey: ['user-matches'] })
      queryClient.invalidateQueries({ queryKey: ['has-location-matches'] })
    },
  }
}

