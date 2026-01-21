/**
 * Hook para buscar locais em comum entre usuários
 */

import { useQuery } from '@tanstack/react-query'
import { MatchService } from '@/services/match.service'
import { useAuth } from './useAuth'

export function useCommonLocations(targetUserId: string | null) {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['commonLocations', user?.id, targetUserId],
        queryFn: async () => {
            if (!user?.id || !targetUserId || user.id === targetUserId) {
                console.log('[useCommonLocations] Skipping:', { userId: user?.id, targetUserId, same: user?.id === targetUserId })
                return []
            }

            console.log('[useCommonLocations] Fetching for:', { userId: user.id, targetUserId })
            const result = await MatchService.getCommonLocations(user.id, targetUserId)

            if (result.error) {
                console.error('[useCommonLocations] Error:', result.error)
                throw new Error(result.error)
            }

            console.log('[useCommonLocations] Success:', result.data)
            return result.data || []
        },
        enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
        staleTime: 5 * 60 * 1000, // 5 minutos
    })
}
