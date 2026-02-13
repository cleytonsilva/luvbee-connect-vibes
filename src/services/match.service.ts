/**
 * Match Service - LuvBee Core Platform
 * 
 * Serviço para gerenciar matches entre pessoas
 * Usa a tabela people_matches e funções RPC do Supabase
 */

import { supabase } from '@/integrations/supabase'
import type { ApiResponse } from '@/types/app.types'
import type { PeopleMatch, PeopleMatchWithUsers } from '@/types/match.types'
import { CompatibilityService } from './compatibility.service'
import type { GenderPreference } from '@/types/user.types'

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
  interests: string[] | null
  gender: string | null
  photos: string[] | null
}

/**
 * Filtros para busca de matches
 */
export interface MatchFilters {
  looking_for?: GenderPreference[];
  age_min?: number;
  age_max?: number;
  distance_km?: number;
}

export class MatchService {
  /**
   * Busca matches potenciais usando a função RPC get_potential_matches
   * FILTRA APENAS USUÁRIOS COM LOCAIS EM COMUM (Core Feature)
   * 
   * Agora também aplica filtros de preferência (looking_for)
   */
  static async getPotentialMatches(
    userId: string,
    limit: number = 10,
    filters?: MatchFilters
  ): Promise<ApiResponse<PotentialMatch[]>> {
    try {
      // Primeiro, buscar preferências do usuário atual
      const { data: userPrefs } = await supabase
        .from('profiles')
        .select('looking_for, gender')
        .eq('id', userId)
        .single();

      const lookingFor = filters?.looking_for || userPrefs?.looking_for || ['todos'];

      // Buscar matches potenciais
      const { data, error } = await supabase.rpc('get_potential_matches', {
        p_user_id: userId,
        match_limit: limit * 2 // Buscar mais para poder filtrar
      });

      if (error) {
        console.error('Error calling get_potential_matches:', error);
        throw error;
      }

      let matches = (data || []) as PotentialMatch[];

      // Aplicar filtros de preferência
      if (lookingFor && !lookingFor.includes('todos')) {
        matches = matches.filter(match => {
          // Se o match não tem gênero definido, incluir
          if (!match.gender) return true;
          // Verificar se o gênero do match está nas preferências
          return lookingFor.includes(match.gender as GenderPreference);
        });
      }

      // Aplicar filtro de idade
      if (filters?.age_min !== undefined) {
        matches = matches.filter(m => m.age === null || m.age >= filters.age_min!);
      }
      if (filters?.age_max !== undefined) {
        matches = matches.filter(m => m.age === null || m.age <= filters.age_max!);
      }

      // Calcular compatibilidade para cada match
      const matchesWithCompatibility = await Promise.all(
        matches.slice(0, limit).map(async (match) => {
          const compatResult = await CompatibilityService.calculateCompatibility(userId, match.id);
          return {
            ...match,
            compatibility_score: compatResult.data?.score || match.compatibility_score
          };
        })
      );

      // Ordenar por score de compatibilidade
      matchesWithCompatibility.sort((a, b) => 
        (b.compatibility_score || 0) - (a.compatibility_score || 0)
      );

      return { data: matchesWithCompatibility };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get potential matches'
      };
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
      });

      if (error) {
        console.error('Error calling create_people_match:', error);
        throw error;
      }

      return { data: data as PeopleMatch };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to create people match'
      };
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
      if (!userId) return { data: [] };

      let query = supabase
        .from('people_matches')
        .select(`
          *,
          user1:profiles!people_matches_user1_id_fkey(id, full_name, avatar_url, bio, age, interests, photos),
          user2:profiles!people_matches_user2_id_fkey(id, full_name, avatar_url, bio, age, interests, photos)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Calcular compatibilidade para cada match
      const matchesWithCompatibility = await Promise.all(
        (data || []).map(async (match) => {
          const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
          const compatResult = await CompatibilityService.calculateCompatibility(userId, otherUserId);
          
          return {
            ...match,
            user1: match.user1 || null,
            user2: match.user2 || null,
            compatibility_score: compatResult.data?.score || 0,
            common_locations_count: compatResult.data?.commonLocations || 0
          };
        })
      );

      return { data: matchesWithCompatibility as PeopleMatchWithUsers[] };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get user matches'
      };
    }
  }

  /**
   * Busca apenas matches mútuos (conexões já feitas)
   * Usado na aba Matches
   */
  static async getMutualMatches(userId: string): Promise<ApiResponse<PeopleMatchWithUsers[]>> {
    return this.getUserMatches(userId, 'mutual');
  }

  /**
   * Busca um match específico entre dois usuários
   */
  static async getMatchByUsers(
    userId1: string,
    userId2: string
  ): Promise<ApiResponse<PeopleMatchWithUsers | null>> {
    try {
      if (!userId1 || !userId2) return { error: 'User IDs are required' };

      const { data, error } = await supabase
        .from('people_matches')
        .select(`
          *,
          user1:profiles!people_matches_user1_id_fkey(id, full_name, avatar_url, bio, age, interests, photos, gender),
          user2:profiles!people_matches_user2_id_fkey(id, full_name, avatar_url, bio, age, interests, photos, gender)
        `)
        .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
        .maybeSingle();

      if (error) throw error;

      // Calcular compatibilidade
      if (data) {
        const compatResult = await CompatibilityService.calculateCompatibility(userId1, userId2);
        return {
          data: {
            ...data,
            compatibility_score: compatResult.data?.score || 0,
            common_locations_count: compatResult.data?.commonLocations || 0
          } as PeopleMatchWithUsers
        };
      }

      return { data: null };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to get match by users'
      };
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
        .single();

      if (error) throw error;

      return { data: data as PeopleMatch };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to update match status'
      };
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
        .eq('id', matchId);

      if (error) throw error;

      return { data: undefined };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to remove match'
      };
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
        .eq('status', 'active');

      if (error) throw error;

      return { data: (count || 0) > 0 };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to check location matches'
      };
    }
  }

  /**
   * Salva preferências de filtro do usuário (looking_for)
   */
  static async saveUserFilterPreferences(
    userId: string,
    preferences: {
      looking_for?: GenderPreference[];
      age_min?: number;
      age_max?: number;
    }
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          looking_for: preferences.looking_for,
          age_min: preferences.age_min,
          age_max: preferences.age_max,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      return { data: undefined };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'Failed to save filter preferences'
      };
    }
  }

  /**
   * Busca locais em comum entre dois usuários
   */
  static async getCommonLocations(
    userId1: string,
    userId2: string
  ): Promise<ApiResponse<Array<{ id: string; name: string; photo_url?: string }>>> {
    return CompatibilityService.getCommonLocationsWithDetails(userId1, userId2);
  }
}
