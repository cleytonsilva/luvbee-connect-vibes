/**
 * useCompatibility Hook - LuvBee Core Platform
 * 
 * Hook para calcular e cachear scores de compatibilidade
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CompatibilityService } from '@/services/compatibility.service'
import { useAuth } from '@/hooks/useAuth'

interface UseCompatibilityOptions {
  enabled?: boolean
  staleTime?: number
}

/**
 * Hook para calcular score de compatibilidade entre dois usuários
 */
export function useCompatibility(
  targetUserId: string | null,
  options: UseCompatibilityOptions = {}
) {
  const { user } = useAuth()
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options

  return useQuery({
    queryKey: ['compatibility', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId) return null
      const result = await CompatibilityService.calculateScore(user.id, targetUserId)
      if (result.error) throw new Error(result.error)
      return result.data ?? 0
    },
    enabled: enabled && !!user?.id && !!targetUserId,
    staleTime,
    gcTime: 10 * 60 * 1000, // Cache por 10 minutos
  })
}

/**
 * Hook para calcular scores de compatibilidade em lote
 */
export function useBatchCompatibility(
  targetUserIds: string[],
  options: UseCompatibilityOptions = {}
) {
  const { user } = useAuth()
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options

  return useQuery({
    queryKey: ['compatibility-batch', user?.id, targetUserIds.sort().join(',')],
    queryFn: async () => {
      if (!user?.id || targetUserIds.length === 0) return {}
      const result = await CompatibilityService.calculateBatchScores(user.id, targetUserIds)
      if (result.error) throw new Error(result.error)
      return result.data ?? {}
    },
    enabled: enabled && !!user?.id && targetUserIds.length > 0,
    staleTime,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook helper para invalidar cache de compatibilidade
 */
export function useInvalidateCompatibility() {
  const queryClient = useQueryClient()

  return {
    invalidate: (targetUserId?: string) => {
      if (targetUserId) {
        queryClient.invalidateQueries({ queryKey: ['compatibility', targetUserId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['compatibility'] })
      }
    },
    invalidateBatch: () => {
      queryClient.invalidateQueries({ queryKey: ['compatibility-batch'] })
    },
  }
}

