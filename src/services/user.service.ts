import { supabase } from '../integrations/supabase'
import type { UserWithPreferences } from '../types/user.types'
import type { ApiResponse } from '../types/app.types'
import { updatePreferencesSchema, updateUserSchema, formatZodErrors } from '../lib/validations'
import { ErrorHandler } from '@/lib/errors'
import type { UserPreferences } from '../types/user.types'

export class UserService {
  /**
   * Busca o perfil completo do usuário (users + user_preferences)
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<UserWithPreferences>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_preferences (*)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error

      return { data: data as UserWithPreferences }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to get user profile' 
      }
    }
  }

  /**
   * Atualiza informações básicas do usuário
   */
  static async updateUser(userId: string, data: Partial<UserWithPreferences>): Promise<ApiResponse<UserWithPreferences>> {
    try {
      // Validar dados com Zod
      const validatedData = updateUserSchema.parse(data)

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(validatedData)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: updatedUser as UserWithPreferences }
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return { error: 'Dados inválidos: ' + error.message }
      }
      return { 
        error: error instanceof Error ? error.message : 'Failed to update user' 
      }
    }
  }

  /**
   * Busca preferências do usuário
   */
  static async getUserPreferences(userId: string): Promise<ApiResponse<UserPreferences | null>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // Se não existir, retorna null ao invés de erro
        if (error.code === 'PGRST116') {
          return { data: null }
        }
        throw error
      }

      return { data }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to get preferences' 
      }
    }
  }

  /**
   * Cria ou atualiza preferências do usuário
   */
  static async saveUserPreferences(
    userId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    try {
      // ✅ VALIDAÇÃO CRÍTICA: Garantir que userId === auth.uid()
      // Usar getSession() primeiro (mais rápido e confiável após signup)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Se não houver sessão, tentar getUser() como fallback
      let authenticatedUserId: string | null = null
      if (session?.user) {
        authenticatedUserId = session.user.id
      } else {
        // Fallback: tentar getUser() se getSession() não retornou usuário
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.error('[UserService] Erro ao obter usuário autenticado:', authError)
          return { error: 'Não autorizado: usuário não autenticado' }
        }
        authenticatedUserId = user?.id || null
      }
      
      // Validar que o userId fornecido corresponde ao usuário autenticado
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        console.error('[UserService] Validação de autorização falhou:', {
          providedUserId: userId,
          authenticatedUserId,
          hasSession: !!session,
          sessionError
        })
        return { error: 'Não autorizado: userId não corresponde ao usuário autenticado' }
      }
      
      // Validar dados com Zod
      const validatedData = updatePreferencesSchema.parse(preferences)
      
      // Upsert para evitar select prévio e reduzir fricção com RLS
      const { data: upserted, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...validatedData
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (upsertError) throw upsertError
      const result = upserted

      // Atualizar flag de onboarding completo
      await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId)

      return { data: result }
    } catch (error) {
      // Zod validation error
      if (error instanceof Error && error.name === 'ZodError') {
        try {
          // @ts-expect-error - zod error typing
          const messages = formatZodErrors(error)
          return { error: 'Preferências inválidas: ' + messages.join('; ') }
        } catch {
          return { error: 'Preferências inválidas: ' + error.message }
        }
      }

      // Supabase or unknown error → normalize and log
      const appError = ErrorHandler.handleSupabaseError(error)
      ErrorHandler.logError(appError, {
        source: 'UserService.saveUserPreferences',
        userId,
        // Avoid logging full arrays if huge; include counts
        preferencesSummary: {
          hasDrink: Array.isArray((preferences as any)?.drink_preferences),
          hasFood: Array.isArray((preferences as any)?.food_preferences),
          hasMusic: Array.isArray((preferences as any)?.music_preferences),
        }
      })

      return { error: ErrorHandler.getUserMessage(appError) }
    }
  }

  /**
   * Verifica se o usuário completou o onboarding
   */
  static async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single()

      if (error) return false

      return data?.onboarding_completed ?? false
    } catch {
      return false
    }
  }

  /**
   * Upload de avatar
   */
  static async uploadAvatar(userId: string, file: File): Promise<ApiResponse<string>> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload para bucket avatars
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Atualizar perfil do usuário
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      return { data: publicUrl }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to upload avatar' 
      }
    }
  }
}

