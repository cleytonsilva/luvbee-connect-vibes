/**
 * Compatibility Service - LuvBee Core Platform
 * 
 * Serviço para cálculo de compatibilidade entre usuários
 * Usa a função SQL calculate_compatibility_score do Supabase
 * e também calcula baseado em interseção de locais e interesses
 */

import { supabase } from '@/integrations/supabase'
import type { ApiResponse } from '@/types/app.types'

export interface CompatibilityScore {
  score: number
  commonLocations: number
  commonInterests: number
  details: {
    locationScore: number
    interestScore: number
    totalScore: number
  }
}

export interface CompatibilityFactors {
  commonLocationIds: string[]
  commonInterestNames: string[]
  user1Locations: string[]
  user2Locations: string[]
  user1Interests: string[]
  user2Interests: string[]
}

export class CompatibilityService {
  /**
   * Calcula o score de compatibilidade entre dois usuários
   * Baseado em:
   * - Locais em comum (peso 60%)
   * - Interesses em comum (peso 40%)
   */
  static async calculateCompatibility(
    user1Id: string,
    user2Id: string
  ): Promise<ApiResponse<CompatibilityScore>> {
    try {
      // Buscar dados de ambos os usuários em paralelo
      const [user1Data, user2Data, commonFactors] = await Promise.all([
        this.getUserCompatibilityData(user1Id),
        this.getUserCompatibilityData(user2Id),
        this.getCommonFactors(user1Id, user2Id)
      ]);

      if (!user1Data || !user2Data) {
        return { error: 'Dados de usuário não encontrados' };
      }

      // Calcular score baseado em locais (máx 60 pontos)
      const maxLocations = Math.max(user1Data.locationIds.length, user2Data.locationIds.length, 1);
      const locationScore = Math.min(
        (commonFactors.commonLocationIds.length / maxLocations) * 60,
        60
      );

      // Calcular score baseado em interesses (máx 40 pontos)
      const maxInterests = Math.max(user1Data.interests.length, user2Data.interests.length, 1);
      const interestScore = Math.min(
        (commonFactors.commonInterestNames.length / maxInterests) * 40,
        40
      );

      // Score total (0-100)
      const totalScore = Math.round(locationScore + interestScore);

      return {
        data: {
          score: totalScore,
          commonLocations: commonFactors.commonLocationIds.length,
          commonInterests: commonFactors.commonInterestNames.length,
          details: {
            locationScore: Math.round(locationScore),
            interestScore: Math.round(interestScore),
            totalScore
          }
        }
      };
    } catch (error) {
      console.error('[CompatibilityService] Error calculating compatibility:', error);
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to calculate compatibility score'
      };
    }
  }

  /**
   * Busca dados necessários para cálculo de compatibilidade
   */
  private static async getUserCompatibilityData(userId: string): Promise<{
    locationIds: string[];
    interests: string[];
  } | null> {
    try {
      // Buscar locais curtidos pelo usuário
      const { data: matches, error: matchesError } = await supabase
        .from('location_matches')
        .select('location_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (matchesError) throw matchesError;

      // Buscar interesses do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      return {
        locationIds: matches?.map(m => m.location_id) || [],
        interests: profile?.interests || []
      };
    } catch (error) {
      console.error('[CompatibilityService] Error getting user data:', error);
      return null;
    }
  }

  /**
   * Calcula fatores comuns entre dois usuários
   */
  static async getCommonFactors(user1Id: string, user2Id: string): Promise<CompatibilityFactors> {
    try {
      // Buscar locais de ambos
      const [user1Matches, user2Matches] = await Promise.all([
        supabase.from('location_matches').select('location_id').eq('user_id', user1Id).eq('status', 'active'),
        supabase.from('location_matches').select('location_id').eq('user_id', user2Id).eq('status', 'active')
      ]);

      const user1LocationIds = user1Matches.data?.map(m => m.location_id) || [];
      const user2LocationIds = user2Matches.data?.map(m => m.location_id) || [];
      const commonLocationIds = user1LocationIds.filter(id => user2LocationIds.includes(id));

      // Buscar interesses de ambos
      const [user1Profile, user2Profile] = await Promise.all([
        supabase.from('profiles').select('interests').eq('id', user1Id).single(),
        supabase.from('profiles').select('interests').eq('id', user2Id).single()
      ]);

      const user1Interests = user1Profile.data?.interests || [];
      const user2Interests = user2Profile.data?.interests || [];
      const commonInterestNames = user1Interests.filter(i => user2Interests.includes(i));

      return {
        commonLocationIds,
        commonInterestNames,
        user1LocationIds,
        user2LocationIds,
        user1Interests,
        user2Interests
      };
    } catch (error) {
      console.error('[CompatibilityService] Error getting common factors:', error);
      return {
        commonLocationIds: [],
        commonInterestNames: [],
        user1LocationIds: [],
        user2LocationIds: [],
        user1Interests: [],
        user2Interests: []
      };
    }
  }

  /**
   * Busca locais em comum entre dois usuários com detalhes
   */
  static async getCommonLocationsWithDetails(
    user1Id: string,
    user2Id: string
  ): Promise<ApiResponse<Array<{ id: string; name: string; image_url: string | null }>>> {
    try {
      const factors = await this.getCommonFactors(user1Id, user2Id);
      
      if (factors.commonLocationIds.length === 0) {
        return { data: [] };
      }

      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, image_url')
        .in('id', factors.commonLocationIds);

      if (error) throw error;

      return { data: locations || [] };
    } catch (error) {
      console.error('[CompatibilityService] Error getting common locations:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to get common locations'
      };
    }
  }

  /**
   * Calcula scores de compatibilidade em lote
   */
  static async calculateBatchScores(
    userId: string,
    targetUserIds: string[]
  ): Promise<ApiResponse<Record<string, CompatibilityScore>>> {
    try {
      const scores: Record<string, CompatibilityScore> = {};

      // Calcular scores em paralelo (limitado a 5 por vez)
      const batchSize = 5;
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        const promises = batch.map(async (targetId) => {
          const result = await this.calculateCompatibility(userId, targetId);
          return { id: targetId, score: result.data };
        });

        const results = await Promise.all(promises);
        results.forEach(({ id, score }) => {
          if (score) {
            scores[id] = score;
          }
        });
      }

      return { data: scores };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to calculate batch compatibility scores'
      };
    }
  }

  /**
   * Calcula score usando a função RPC do banco (fallback)
   */
  static async calculateScoreRPC(user1Id: string, user2Id: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('calculate_compatibility_score', {
        user1_id: user1Id,
        user2_id: user2Id
      });

      if (error) throw error;

      return { data: data as number };
    } catch (error) {
      console.error('Error calculating compatibility score via RPC:', error);
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to calculate compatibility score'
      };
    }
  }
}
