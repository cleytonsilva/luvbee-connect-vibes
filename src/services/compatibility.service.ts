/**
 * Compatibility Service - LuvBee Core Platform
 * 
 * Serviço para cálculo de compatibilidade entre usuários
 * Usa a função SQL calculate_compatibility_score do Supabase
 */

import { supabase } from '@/integrations/supabase'
import type { ApiResponse } from '@/types/app.types'

export interface CompatibilityScore {
  score: number
  commonLocations: number
  commonPreferences: {
    drinks: number
    food: number
    music: number
  }
}

export class CompatibilityService {
  /**
   * Calcula o score de compatibilidade entre dois usuários
   * Usa a função SQL calculate_compatibility_score
   */
  static async calculateScore(
    user1Id: string,
    user2Id: string
  ): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('calculate_compatibility_score', {
        user1_id: user1Id,
        user2_id: user2Id
      })

      if (error) throw error

      return { data: data as number }
    } catch (error) {
      console.error('Error calculating compatibility score:', error)
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to calculate compatibility score'
      }
    }
  }

  /**
   * Calcula scores de compatibilidade em lote
   * Útil para calcular scores de múltiplos usuários de uma vez
   */
  static async calculateBatchScores(
    userId: string,
    targetUserIds: string[]
  ): Promise<ApiResponse<Record<string, number>>> {
    try {
      const scores: Record<string, number> = {}

      // Calcular scores em paralelo (limitado a 10 por vez para não sobrecarregar)
      const batchSize = 10
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize)
        const promises = batch.map(async (targetId) => {
          const result = await this.calculateScore(userId, targetId)
          return { id: targetId, score: result.data ?? 0 }
        })

        const results = await Promise.all(promises)
        results.forEach(({ id, score }) => {
          scores[id] = score
        })
      }

      return { data: scores }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to calculate batch compatibility scores'
      }
    }
  }
}

