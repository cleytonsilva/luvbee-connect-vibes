/**
 * Match Service - LuvBee Core Platform
 * 
 * Serviço para gerenciar matches entre pessoas
 * Usa a tabela people_matches e funções RPC do Supabase
 */

import { supabase } from '@/integrations/supabase'
import type { ApiResponse } from '@/types/app.types'
import type { PeopleMatch, PeopleMatchWithUsers } from '@/types/match.types'
import type { User } from '@/types/user.types'

/**
 * Tipo retornado pela função get_potential_matches
 */
export interface PotentialMatch {
  id: string
  email: string
  name: string
  age: number | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  location_latitude: number | null
  location_longitude: number | null
  onboarding_completed: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  compatibility_score: number | null
  common_locations_count: number
  drink_preferences: string[] | null
  food_preferences: string[] | null
  music_preferences: string[] | null
}

export class MatchService {
  /**
   * Busca matches potenciais usando a função RPC get_potential_matches
   * FILTRA APENAS USUÁRIOS COM LOCAIS EM COMUM (Core Feature)
   */
  static async getPotentialMatches(
    userId: string,
    limit: number = 10
  ): Promise<ApiResponse<PotentialMatch[]>> {
    try {
      const { data, error } = await supabase.rpc('get_potential_matches', {
        p_user_id: userId,
        match_limit: limit
      })

      if (error) {
        console.error('Error calling get_potential_matches:', error)
        throw error
      }

      return { data: (data || []) as PotentialMatch[] }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get potential matches'
      }
    }
  }

  /**
   * Cria ou atualiza um match entre pessoas usando a função RPC create_people_match
   * Detecta match mútuo automaticamente
   */
  static async createPeopleMatch(
    userId: string,
    targetUserId: string
  ): Promise<ApiResponse<PeopleMatch>> {
    try {
      const { data, error } = await supabase.rpc('create_people_match', {
        p_user1_id: userId,
        p_user2_id: targetUserId,
        p_liker_id: userId
      })

      if (error) {
        console.error('Error calling create_people_match:', error)
        throw error
      }

      return { data: data as PeopleMatch }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to create people match'
      }
    }
  }

  /**
   * Busca matches do usuário da tabela people_matches
   */
  static async getUserMatches(
    userId: string,
    status?: 'pending' | 'mutual' | 'unmatched'
  ): Promise<ApiResponse<PeopleMatchWithUsers[]>> {
    try {
      let query = supabase
        .from('people_matches')
        .select(`
          *,
          user1:users!people_matches_user1_id_fkey(*),
          user2:users!people_matches_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return { data: (data || []) as PeopleMatchWithUsers[] }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get user matches'
      }
    }
  }

  /**
   * Busca matches mútuos do usuário
   */
  static async getMutualMatches(
    userId: string
  ): Promise<ApiResponse<PeopleMatchWithUsers[]>> {
    return this.getUserMatches(userId, 'mutual')
  }

  /**
   * Busca um match específico entre dois usuários
   */
  static async getMatchByUsers(
    userId1: string,
    userId2: string
  ): Promise<ApiResponse<PeopleMatchWithUsers | null>> {
    try {
      const { data, error } = await supabase
        .from('people_matches')
        .select(`
          *,
          user1:users!people_matches_user1_id_fkey(*),
          user2:users!people_matches_user2_id_fkey(*)
        `)
        .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
        .maybeSingle()

      if (error) throw error

      return { data: data as PeopleMatchWithUsers | null }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get match by users'
      }
    }
  }

  /**
   * Atualiza status de um match
   */
  static async updateMatchStatus(
    matchId: string,
    status: 'pending' | 'mutual' | 'unmatched'
  ): Promise<ApiResponse<PeopleMatch>> {
    try {
      const { data, error } = await supabase
        .from('people_matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', matchId)
        .select()
        .single()

      if (error) throw error

      return { data: data as PeopleMatch }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to update match status'
      }
    }
  }

  /**
   * Remove um match (soft delete - muda status para unmatched)
   */
  static async removeMatch(matchId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('people_matches')
        .update({ status: 'unmatched', updated_at: new Date().toISOString() })
        .eq('id', matchId)

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to remove match'
      }
    }
  }

  /**
   * Verifica se usuário tem matches com locais (pré-requisito para Vibe People)
   */
  static async hasLocationMatches(userId: string): Promise<ApiResponse<boolean>> {
    try {
      const { count, error } = await supabase
        .from('location_matches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error

      return { data: (count || 0) > 0 }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to check location matches'
      }
    }
  }
}
