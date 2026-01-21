import { supabase } from '../integrations/supabase'
import type { UserWithPreferences } from '../types/user.types'
import type { ApiResponse } from '../types/app.types'
import { updatePreferencesSchema, updateUserSchema, formatZodErrors } from '../lib/validations'
import { ErrorHandler } from '@/lib/errors'
import type { UserPreferences } from '../types/user.types'

export class UserService {
  /**
   * Busca o perfil completo do usuário
   * Nota: user_preferences está relacionado com auth.users, não public.users
   * Por isso buscamos separadamente se necessário
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<UserWithPreferences>> {
    try {
      // Buscar dados do usuário da tabela users (que já tem location como JSONB)
      // Usar campos específicos para evitar expansão automática de relacionamentos
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id,email,name,age,bio,location,photos,preferences,onboarding_completed,role,created_at,updated_at')
        .eq('id', userId)
        .single()

      if (userError) {
        // Se usuário não encontrado, não é erro crítico
        if (userError.code === 'PGRST116') {
          console.log('[UserService] Usuário não encontrado:', userId)
          return { data: null as any }
        }
        throw userError
      }

      // Buscar preferências separadamente (FK é para auth.users)
      // Usar maybeSingle para não falhar se não existir
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('user_id,drink_preferences,food_preferences,music_preferences,vibe_preferences,interests')
        .eq('user_id', userId)
        .maybeSingle()

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.warn('[UserService] Erro ao buscar preferências (não crítico):', prefsError.message)
      }

      // Combinar os dados
      const combinedData = {
        ...userData,
        user_preferences: prefsData || null
      }

      return { data: combinedData as UserWithPreferences }
    } catch (error) {
      console.error('[UserService] Erro ao buscar perfil:', error)
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
      // ✅ VALIDAÇÃO: Tentar obter usuário autenticado, mas ser flexível após signup
      // Após signup, a sessão pode não estar disponível imediatamente (especialmente se email precisa ser confirmado)
      // Confiamos no userId fornecido e deixamos o RLS proteger contra acesso não autorizado
      
      let authenticatedUserId: string | null = null
      let hasValidSession = false
      
      try {
        // Tentar obter sessão atual (mais rápido)
        const sessionRes = await supabase.auth.getSession?.()
        const session = sessionRes?.data?.session
        if (session?.user) {
          authenticatedUserId = session.user.id
          hasValidSession = true
        }
      } catch (sessionError) {
        // Se getSession() falhar, tentar getUser() como fallback
        try {
          const userRes = await supabase.auth.getUser?.()
          const user = userRes?.data?.user
          if (user) {
            authenticatedUserId = user.id
            hasValidSession = true
          }
        } catch (getUserError) {
          // Se ambos falharem, logar mas não bloquear (pode ser após signup)
          console.warn('[UserService] Não foi possível obter sessão do usuário:', {
            sessionError: sessionError instanceof Error ? sessionError.message : sessionError,
            getUserError: getUserError instanceof Error ? getUserError.message : getUserError,
            userId,
            note: 'Isso pode ser normal após signup se o email precisa ser confirmado'
          })
        }
      }
      
      // Validar userId apenas se tivermos uma sessão válida
      // Se não houver sessão, confiar no userId fornecido (vem do contexto do frontend)
      // O RLS do Supabase vai proteger contra acesso não autorizado
      if (hasValidSession && authenticatedUserId && authenticatedUserId !== userId) {
        console.error('[UserService] Validação de autorização falhou:', {
          providedUserId: userId,
          authenticatedUserId,
          hasValidSession
        })
        return { error: 'Não autorizado: userId não corresponde ao usuário autenticado' }
      }
      
      // Se não há sessão válida, tentar aguardar um pouco e tentar novamente
      // Isso pode acontecer após signup quando a sessão ainda não está disponível
      if (!hasValidSession) {
        console.warn('[UserService] Sessão não disponível, aguardando e tentando novamente...', {
          userId,
          attempt: 1
        })
        
        // Aguardar um pouco e tentar obter sessão novamente
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          const retryRes = await supabase.auth.getSession?.()
          const retrySession = retryRes?.data?.session
          if (retrySession?.user) {
            authenticatedUserId = retrySession.user.id
            hasValidSession = true
            console.info('[UserService] Sessão obtida após retry:', { userId: authenticatedUserId })
          }
        } catch (retryError) {
          console.warn('[UserService] Retry também falhou, continuando sem validação de sessão:', {
            error: retryError instanceof Error ? retryError.message : retryError,
            note: 'RLS vai proteger contra acesso não autorizado se não houver sessão válida'
          })
        }
      }
      
      // Validar dados com Zod
      const validatedData = updatePreferencesSchema.parse(preferences)
      
      // Upsert para evitar select prévio e reduzir fricção com RLS
      // NOTA: Se não houver sessão válida, o RLS pode bloquear esta operação
      console.log('[UserService] Salvando preferências para:', userId, validatedData)
      
      const upsertRes = await supabase
        .from('user_preferences' as any)
        .upsert({
          user_id: userId,
          ...validatedData
        }, { onConflict: 'user_id' })
        .select()
        .single()
      
      if (upsertRes.error) {
        console.error('[UserService] Erro ao salvar preferências (upsert):', upsertRes.error);
      } else {
        console.log('[UserService] Preferências salvas com sucesso:', upsertRes.data);
      }

      const upserted = upsertRes?.data
      const upsertError = upsertRes?.error

      if (upsertError) {
        // Se o erro for de RLS (permissão negada), pode ser porque não há sessão válida
        const isRLSError = upsertError.code === '42501' || 
                          upsertError.code === 'PGRST301' ||
                          upsertError.status === 403 ||
                          upsertError.message?.includes('permission denied') || 
                          upsertError.message?.includes('row-level security') ||
                          upsertError.message?.includes('new row violates row-level security policy')
        
        if (isRLSError) {
          console.error('[UserService] Erro de RLS ao salvar preferências:', {
            error: upsertError,
            errorCode: upsertError.code,
            errorStatus: upsertError.status,
            errorMessage: upsertError.message,
            userId,
            authenticatedUserId,
            hasValidSession,
            note: 'Isso pode acontecer se o email precisa ser confirmado antes de completar o onboarding'
          })
          
          // Verificar se o email foi confirmado
          let emailConfirmed = false
          try {
            const userRes = await supabase.auth.getUser()
            emailConfirmed = !!userRes.data?.user?.email_confirmed_at
          } catch (e) {
            console.warn('[UserService] Não foi possível verificar confirmação de email:', e)
          }
          
          if (!emailConfirmed) {
            return { 
              error: 'Não foi possível salvar preferências. Por favor, confirme seu email e tente novamente.' 
            }
          }
          
          return { 
            error: 'Não foi possível salvar preferências. Por favor, verifique sua conexão e tente novamente.' 
          }
        }
        throw upsertError
      }
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
      const filePath = `${userId}/${fileName}`

      let bucketUsed = 'avatars'
      let uploadError: any = null
      const res1 = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      uploadError = res1.error
      if (uploadError) {
        const msg = String(uploadError.message || uploadError)
        if (msg.includes('row-level security') || msg.includes('permission') || msg.includes('bucket')) {
          const res2 = await supabase.storage
            .from('profile-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          uploadError = res2.error
          if (!uploadError) bucketUsed = 'profile-photos'
        }
      }

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucketUsed)
        .getPublicUrl(filePath)

      // Atualizar perfil do usuário
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      return { data: publicUrl }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { error: msg }
    }
  }
}

