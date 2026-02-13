import { create } from 'zustand';
import { Match, Profile } from '../types';
import { supabase } from '../services/supabase';

interface MatchState {
  potentialMatches: Profile[];
  matches: Match[];
  currentProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  loadPotentialMatches: (userId: string) => Promise<void>;
  likeProfile: (fromUserId: string, toUserId: string, isSuperLike?: boolean) => Promise<boolean>;
  passProfile: (fromUserId: string, toUserId: string) => Promise<void>;
  loadMatches: (userId: string) => Promise<void>;
  checkMatch: (userId1: string, userId2: string) => Promise<boolean>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  potentialMatches: [],
  matches: [],
  currentProfile: null,
  isLoading: false,
  error: null,

  /**
   * Carrega perfis potenciais para match
   * Exclui perfis que o usuário já passou ou deu like
   */
  loadPotentialMatches: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      // Buscar IDs de usuários que já foram interagidos
      const { data: interactions } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const interactedIds = interactions?.map(i => i.to_user_id) || [];
      interactedIds.push(userId); // Excluir o próprio usuário

      // Buscar perfis que não foram interagidos
      let query = supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .limit(20);

      // Se há IDs para excluir, adiciona filtro
      if (interactedIds.length > 0) {
        query = query.not('id', 'in', `(${interactedIds.join(',')})`);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      // Mapear para formato Profile
      const mappedProfiles: Profile[] = (profiles || []).map(user => ({
        id: user.id,
        user_id: user.id,
        name: user.name,
        birth_date: '', // Não disponível na tabela users
        age: user.age,
        gender: 'other' as const,
        bio: user.bio || '',
        photos: user.photos || [],
        vibes: user.preferences?.interests || [],
        looking_for: 'unsure' as const,
        preferred_age_min: user.preferences?.age_min || 18,
        preferred_age_max: user.preferences?.age_max || 50,
        preferred_distance: user.preferences?.distance_max || 50,
        show_me: user.is_active,
        incognito_mode: false,
        last_active: user.updated_at || new Date().toISOString(),
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));

      set({ potentialMatches: mappedProfiles, isLoading: false });
    } catch (error: any) {
      console.error('Erro ao carregar perfis potenciais:', error);
      set({ error: error.message, isLoading: false, potentialMatches: [] });
    }
  },

  /**
   * Dá like em um perfil
   * Retorna true se houve match mútuo
   */
  likeProfile: async (fromUserId, toUserId, isSuperLike = false) => {
    try {
      // Inserir o like
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          is_super_like: isSuperLike,
          is_pass: false,
        });

      if (likeError) {
        // Se for erro de duplicata, ignora
        if (likeError.code === '23505') {
        } else {
          throw likeError;
        }
      }


      // Verificar se há match mútuo
      const isMatch = await get().checkMatch(fromUserId, toUserId);

      // Remover o perfil da lista de potenciais
      const { potentialMatches } = get();
      set({
        potentialMatches: potentialMatches.filter(p => p.id !== toUserId)
      });

      if (isMatch) {
        // Recarregar matches
        await get().loadMatches(fromUserId);
      }

      return isMatch;
    } catch (error: any) {
      console.error('Erro ao dar like:', error);
      return false;
    }
  },

  /**
   * Passa (rejeita) um perfil
   */
  passProfile: async (fromUserId, toUserId) => {
    try {
      // Registrar o pass
      const { error } = await supabase
        .from('likes')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          is_super_like: false,
          is_pass: true,
        });

      if (error && error.code !== '23505') {
        // Ignora erro de duplicata
        throw error;
      }


      // Remover o perfil da lista de potenciais
      const { potentialMatches } = get();
      set({
        potentialMatches: potentialMatches.filter(p => p.id !== toUserId)
      });
    } catch (error) {
      console.error('Erro ao passar perfil:', error);
    }
  },

  /**
   * Verifica se há match mútuo entre dois usuários
   */
  checkMatch: async (userId1, userId2) => {
    try {
      // Verificar se userId2 também deu like em userId1 (e não é pass)
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('from_user_id', userId2)
        .eq('to_user_id', userId1)
        .eq('is_pass', false)
        .maybeSingle();

      if (data) {

        // Criar o match no banco
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            user_id_1: userId1,
            user_id_2: userId2,
            status: 'matched',
            compatibility_score: 80, // TODO: Calcular baseado em lugares em comum
          });

        if (matchError && matchError.code !== '23505') {
          console.error('Erro ao criar match:', matchError);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar match:', error);
      return false;
    }
  },

  /**
   * Carrega matches do usuário
   */
  loadMatches: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      // Buscar matches onde o usuário está envolvido
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user_1:user_id_1 (id, name, age, bio, photos),
          user_2:user_id_2 (id, name, age, bio, photos)
        `)
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq('status', 'matched')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const matches: Match[] = (data || []).map(match => ({
        id: match.id,
        user_id_1: match.user_id_1,
        user_id_2: match.user_id_2,
        user_1: match.user_1,
        user_2: match.user_2,
        status: match.status,
        common_places: [],
        compatibility_score: match.compatibility_score || 0,
        initiated_by: match.user_id_1,
        matched_at: match.created_at,
        created_at: match.created_at,
      }));

      set({ matches, isLoading: false });
    } catch (error: any) {
      console.error('Erro ao carregar matches:', error);
      set({ error: error.message, isLoading: false, matches: [] });
    }
  },
}));
