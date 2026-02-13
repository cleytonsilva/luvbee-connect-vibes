import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Profile } from '../types';
import { supabase } from '../services/supabase';
import i18n from '../i18n';

// Extrai cidade do campo location (JSONB: pode ser {city, state} ou string)
function extractLocation(location: any): string | undefined {
  if (!location) return undefined;
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    if (location.city) {
      return location.state ? `${location.city}, ${location.state}` : location.city;
    }
  }
  return undefined;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  createProfile: (userId: string, email: string, name?: string) => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session, isAuthenticated: !!session }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        if (get().isInitialized) {
          set({ isLoading: false });
          return;
        }

        try {
          set({ isLoading: true });

          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            set({
              session,
              user: session.user as User,
              isAuthenticated: true
            });
            await get().fetchProfile();
          } else {
            set({
              session: null,
              user: null,
              isAuthenticated: false
            });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
              set({
                session,
                user: session.user as User,
                isAuthenticated: true
              });
              await get().fetchProfile();
            } else {
              set({
                session: null,
                user: null,
                profile: null,
                isAuthenticated: false
              });
            }
          });

        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isAuthenticated: false, session: null, user: null });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;

          set({
            user: data.user as User,
            session: data.session,
            isAuthenticated: true
          });

          await get().fetchProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (email, password, userData) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: userData,
            },
          });
          if (error) throw error;

          if (data.user) {
            await get().createProfile(data.user.id, email, userData?.name);
          }

          set({
            user: data.user as User,
            session: data.session,
            isAuthenticated: true
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Cria perfil na tabela 'users' (não 'profiles')
      createProfile: async (userId: string, email: string, name?: string) => {
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert([{
              id: userId,
              email: email,
              name: name || email.split('@')[0],
              bio: null,
              photos: [],
              preferences: {
                age_min: 18,
                age_max: 50,
                distance_max: 50,
                interests: []
              },
              is_active: true,
              onboarding_completed: false,
              country: 'BR', // Default
              state_province: null,
              language_preference: 'pt',
            }]);

          if (profileError) {
            console.error('Error creating profile:', profileError);
          } else {
          }
        } catch (err) {
          console.error('Error in createProfile:', err);
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({ user: null, profile: null, session: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      // Busca perfil da tabela 'users' (não 'profiles')
      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }

          if (data) {
            // Mapeia os dados da tabela 'users' para o formato Profile
            const profile: Profile = {
              id: data.id,
              user_id: data.id,
              name: data.name,
              age: data.age,
              bio: data.bio || '',
              occupation: data.occupation || '',
              photos: data.photos || [],
              location: extractLocation(data.location),
              country: data.country,
              state_province: data.state_province,
              language_preference: data.language_preference,
              vibes: data.preferences?.interests || [], // Legacy mapping
              interests: data.preferences?.interests || [], // New mapping
              looking_for: data.preferences?.looking_for || 'unsure',
              preferred_age_min: data.preferences?.age_min || 18,
              preferred_age_max: data.preferences?.age_max || 50,
              preferred_distance: data.preferences?.distance_max || 50,
              show_me: data.is_active,
              incognito_mode: false,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
            set({ profile });
            if (data.language_preference) {
              i18n.changeLanguage(data.language_preference);
            }
          } else {
            // Perfil não existe, criar um novo
            await get().createProfile(user.id, user.email || '');

            // Buscar o perfil criado
            const { data: newProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (newProfile) {
              const profile: Profile = {
                id: newProfile.id,
                user_id: newProfile.id,
                name: newProfile.name,
                age: newProfile.age,
                bio: newProfile.bio || '',
                photos: newProfile.photos || [],
                location: extractLocation(newProfile.location),
                country: newProfile.country,
                state_province: newProfile.state_province,
                language_preference: newProfile.language_preference,
                vibes: [],
                interests: [],
                looking_for: 'unsure',
                preferred_age_min: 18,
                preferred_age_max: 50,
                preferred_distance: 50,
                show_me: true,
                incognito_mode: false,
                created_at: newProfile.created_at,
                updated_at: newProfile.updated_at,
              };
              set({ profile });
            }
          }
        } catch (err) {
          console.error('Error in fetchProfile:', err);
        }
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        // Mapeia os campos do Profile para a tabela 'users'
        const userUpdate: any = {};
        if (data.name) userUpdate.name = data.name;
        if (data.age) userUpdate.age = data.age;
        if (data.bio !== undefined) userUpdate.bio = data.bio || null;
        if (data.occupation !== undefined) userUpdate.occupation = data.occupation || null;
        if (data.photos) userUpdate.photos = data.photos;
        if (data.country) userUpdate.country = data.country;
        if (data.state_province) userUpdate.state_province = data.state_province;

        // Handle Persisting Preferences (Interests, Age range, etc)
        if (data.interests || data.looking_for || data.preferred_age_min || data.preferred_age_max || data.preferred_distance) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('preferences')
            .eq('id', user.id)
            .single();

          const currentPrefs = currentUser?.preferences || {};
          const newPrefs = {
            ...currentPrefs,
            ...(data.interests ? { interests: data.interests } : {}),
            ...(data.looking_for ? { looking_for: data.looking_for } : {}),
            ...(data.preferred_age_min ? { age_min: data.preferred_age_min } : {}),
            ...(data.preferred_age_max ? { age_max: data.preferred_age_max } : {}),
            ...(data.preferred_distance ? { distance_max: data.preferred_distance } : {}),
          };
          userUpdate.preferences = newPrefs;
        }

        if (data.language_preference) {
          userUpdate.language_preference = data.language_preference;
          i18n.changeLanguage(data.language_preference);
        }

        const { error } = await supabase
          .from('users')
          .update(userUpdate)
          .eq('id', user.id);

        if (error) throw error;

        await get().fetchProfile();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
