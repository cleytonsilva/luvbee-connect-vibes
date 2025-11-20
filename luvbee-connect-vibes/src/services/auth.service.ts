import { supabase } from '../integrations/supabase'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, AuthFormData, ApiResponse } from '../types/app.types'
import { isSupabaseConfigured } from '../integrations/supabase'
import { safeLog } from '../lib/safe-log'

export class AuthService {
  // Helper para validar configuração antes de operações
  private static validateSupabaseConfig(): { valid: boolean; error?: string } {
    if (!isSupabaseConfigured()) {
      return {
        valid: false,
        error: 'Supabase não está configurado corretamente. Verifique as variáveis de ambiente.'
      }
    }
    return { valid: true }
  }

  // Helper para traduzir erros do Supabase
  private static translateSupabaseError(error: any): string {
    const errorMessage = error?.message || 'Erro desconhecido'
    const status = error?.status || error?.code

    // Erros comuns de autenticação
    if (errorMessage.includes('Invalid login credentials') || 
        errorMessage.includes('Invalid credentials') ||
        (status === 400 && errorMessage.includes('password'))) {
      return 'Email ou senha incorretos. Verifique suas credenciais.'
    }

    if (errorMessage.includes('Email not confirmed')) {
      return 'Por favor, confirme seu email antes de fazer login.'
    }

    if (errorMessage.includes('already registered') || 
        errorMessage.includes('already exists')) {
      return 'Este email já está cadastrado. Tente fazer login.'
    }

    if (errorMessage.includes('Invalid email')) {
      return 'Email inválido. Verifique o formato do email.'
    }

    if (errorMessage.includes('Password') && errorMessage.includes('weak')) {
      return 'Senha muito fraca. Use pelo menos 6 caracteres.'
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    }

    if (errorMessage.includes('User not found')) {
      return 'Usuário não encontrado. Verifique seu email.'
    }

    // Erro genérico 400
    if (status === 400) {
      return 'Dados inválidos. Verifique suas informações e tente novamente.'
    }

    // Retornar mensagem original se não houver tradução
    return errorMessage
  }
  static async signUp(data: AuthFormData & { name: string }): Promise<ApiResponse<User>> {
    // Validar configuração do Supabase
    const configCheck = this.validateSupabaseConfig()
    if (!configCheck.valid) {
      return { error: configCheck.error }
    }

    try {
      // Validar dados antes de enviar
      if (!data.email || !data.password || !data.name) {
        return { error: 'Por favor, preencha todos os campos obrigatórios' }
      }

      if (data.password.length < 6) {
        return { error: 'A senha deve ter pelo menos 6 caracteres' }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            name: data.name.trim()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        const errorMessage = this.translateSupabaseError(authError)
        
        // ✅ Log sanitizado - não expõe informações sensíveis
        safeLog('error', '[AuthService] signUp error', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
          translated: errorMessage
        })
        
        return { error: errorMessage }
      }

      if (!authData.user) {
        return { error: 'Falha ao criar conta. Tente novamente.' }
      }

      // Criar perfil do usuário na tabela users
      try {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email.trim().toLowerCase(),
            name: data.name.trim(),
            age: (authData.user.user_metadata?.age ?? null) ?? 18,
            location: null,
            role: 'user' // Todos os novos usuários recebem role 'user' por padrão
          })

        if (profileError) {
          // Se for erro de constraint NOT NULL em age, tentar com valor padrão temporário
          if (profileError.code === '23502' && profileError.message?.includes('age')) {
            const { error: retryError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: data.email.trim().toLowerCase(),
                name: data.name.trim(),
                age: 18,
                location: null,
                role: 'user' // Todos os novos usuários recebem role 'user' por padrão
              })

            if (retryError) {
              // ✅ Log sanitizado
              safeLog('error', '[AuthService] profile creation retry error', retryError)
              // Não falhar o registro se não conseguir criar o perfil - será criado depois
            }
          } else {
            // ✅ Log sanitizado
            safeLog('error', '[AuthService] profile creation error', profileError)
            // Não falhar o registro se não conseguir criar o perfil - será criado depois
          }
        }
      } catch (profileErr) {
        // ✅ Log sanitizado
        safeLog('error', '[AuthService] profile creation exception', profileErr)
        // Não falhar o registro se não conseguir criar o perfil
      }

      return { data: authData.user }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? this.translateSupabaseError(error)
        : 'Falha ao criar conta. Verifique suas informações e tente novamente.'
      
      // ✅ Log sanitizado
      safeLog('error', '[AuthService] signUp exception', error)
      return { error: errorMessage }
    }
  }

  static async signIn(email: string, password: string): Promise<ApiResponse<User>> {
    // Validar configuração do Supabase
    const configCheck = this.validateSupabaseConfig()
    if (!configCheck.valid) {
      return { error: configCheck.error }
    }

    try {
      // Validar dados antes de enviar
      if (!email || !password) {
        return { error: 'Por favor, preencha email e senha' }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        const errorMessage = this.translateSupabaseError(error)
        
        // ✅ Log sanitizado
        safeLog('error', '[AuthService] signIn error', {
          message: error.message,
          status: error.status,
          code: error.code,
          translated: errorMessage
        })
        
        return { error: errorMessage }
      }

      if (!data.user) {
        return { error: 'Falha ao fazer login. Tente novamente.' }
      }

      // Verificar se o usuário existe na tabela users, se não existir, criar
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // Se não existe (erro PGRST116 = no rows returned), criar registro
        if (checkError && checkError.code === 'PGRST116') {
          let insertError = null
          
          // Tentar inserir primeiro com age null
          const { error: firstInsertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || email.trim().toLowerCase(),
              name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
              age: (data.user.user_metadata?.age ?? null) ?? 18,
              location: null
            })

          insertError = firstInsertError

          // Se for erro de constraint NOT NULL em age, tentar com valor padrão temporário
          if (insertError && insertError.code === '23502' && insertError.message?.includes('age')) {
            const { error: retryError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email || email.trim().toLowerCase(),
                name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
                age: 18,
                location: null
              })

            insertError = retryError
          }

          if (insertError) {
            // ✅ Log sanitizado
            safeLog('warn', '[AuthService] Erro ao criar registro do usuário', insertError)
            // Não falha o login se não conseguir criar o registro
          }
        } else if (checkError) {
          // ✅ Log sanitizado
          safeLog('warn', '[AuthService] Erro ao verificar usuário', checkError)
        }
      } catch (profileErr) {
        // ✅ Log sanitizado
        safeLog('warn', '[AuthService] Erro ao verificar/criar perfil', profileErr)
        // Não falha o login se não conseguir criar o registro
      }

      return { data: data.user }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? this.translateSupabaseError(error)
        : 'Falha ao fazer login. Verifique suas credenciais e tente novamente.'
      
      // ✅ Log sanitizado
      safeLog('error', '[AuthService] signIn exception', error)
      return { error: errorMessage }
    }
  }

  static async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to sign out' }
    }
  }

  static async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error

      return { data: session?.user ?? null }
    } catch (error) {
      // Return null user instead of error if not authenticated
      return { data: null }
    }
  }

  static async updateProfile(userId: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('🔧 AuthService.updateProfile - UserID:', userId, 'Data:', data)
      // Preparar dados para atualização - mapear campos do UserProfile para estrutura da tabela users
      const updateData: any = {}
      
      // Campos diretos que existem na tabela
      if (data.name !== undefined) updateData.name = data.name
      if (data.age !== undefined) updateData.age = data.age
      if (data.bio !== undefined) updateData.bio = data.bio
      if (data.location !== undefined) {
        updateData.location = data.location
      }
      
      // Mapear avatar_url para photos (array)
      if (data.avatar_url !== undefined) {
        // Se avatar_url é uma string (URL ou base64), converter para array
        if (typeof data.avatar_url === 'string') {
          // Buscar photos existentes para preservar
          const { data: currentUser } = await supabase
            .from('users')
            .select('photos')
            .eq('id', userId)
            .single()
          
          const existingPhotos = currentUser?.photos || []
          // Se já existe avatar_url no array, substituir, senão adicionar
          if (existingPhotos.length > 0) {
            updateData.photos = [data.avatar_url, ...existingPhotos.slice(1)]
          } else {
            updateData.photos = [data.avatar_url]
          }
        }
      }
      
      // Se photos for fornecido diretamente, usar ele (prioridade sobre avatar_url)
      if (data.photos !== undefined) {
        console.log('📸 Photos detectado, atualizando:', data.photos)
        updateData.photos = data.photos
      }
      
      // Mapear interests para dentro de preferences
      if (data.interests !== undefined) {
        // Buscar preferences existentes
        const { data: currentUser } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single()
        
        const existingPreferences = currentUser?.preferences || {}
        updateData.preferences = {
          ...existingPreferences,
          interests: data.interests
        }
      }
      
      // Se preferences foi passado diretamente, mesclar com existentes
      if (data.preferences !== undefined && !data.interests) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single()
        
        const existingPreferences = currentUser?.preferences || {}
        updateData.preferences = {
          ...existingPreferences,
          ...data.preferences
        }
      }

      // Se não há nada para atualizar, retornar erro
      if (Object.keys(updateData).length === 0) {
        return { error: 'Nenhum dado válido para atualizar' }
      }

      console.log('🔄 Enviando para Supabase - updateData:', updateData)
      const { data: profileData, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        // ✅ Log sanitizado
        safeLog('error', '[AuthService] updateProfile error', error)
        throw error
      }

      console.log('✅ Perfil atualizado com sucesso:', profileData)
      return { data: profileData as UserProfile }
    } catch (error) {
      // ✅ Log sanitizado
      safeLog('error', '[AuthService] updateProfile exception', error)
      return { error: error instanceof Error ? error.message : 'Failed to update profile' }
    }
  }

  static async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      // Buscar dados do usuário primeiro
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id,email,name,age,bio,location,photos,preferences')
        .eq('id', userId)
        .single()

      if (userError) {
        // Se erro 406 (Not Acceptable), PGRST116 (no rows) ou usuário não encontrado, tentar criar o registro
        const isNotFoundError = userError.code === 'PGRST116' || 
                                userError.message?.includes('406') ||
                                userError.message?.includes('Not Acceptable') ||
                                (userError as any).status === 406
        
        if (isNotFoundError) {
          // Buscar dados do usuário autenticado
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            // Criar registro na tabela users
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                age: user.user_metadata?.age || null, // Age será coletado no onboarding
                location: null
              })
              .select()
              .single()

            if (insertError) {
              // Se erro ao inserir, pode ser problema de RLS ou constraint - retornar erro mais claro
              // ✅ Log sanitizado
              safeLog('error', '[AuthService] Erro ao criar perfil do usuário', insertError)
              
              // Se for erro de constraint NOT NULL em age, tentar com valor padrão temporário
              if (insertError.code === '23502' && insertError.message?.includes('age')) {
                const { data: retryUser, error: retryError } = await supabase
                  .from('users')
                  .insert({
                    id: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                    age: 18, // Valor mínimo temporário - será atualizado no onboarding
                    location: null
                  })
                  .select()
                  .single()

                if (retryError) {
                  throw new Error(`Erro ao criar perfil: ${retryError.message}. Verifique as políticas RLS.`)
                }

                return { data: retryUser as UserProfile }
              }
              
              throw new Error(`Erro ao criar perfil: ${insertError.message}. Verifique as políticas RLS.`)
            }

            return { data: newUser as UserProfile }
          }
        }
        throw userError
      }

      // Buscar user_preferences separadamente (pode não existir)
      let userPreferences = null
      try {
        const { data: prefsData, error: prefsError } = await supabase
          .from('user_preferences')
          .select('user_id,drink_preferences,food_preferences,music_preferences,vibe_preferences,interests')
          .eq('user_id', userId)
          .maybeSingle()

        if (!prefsError && prefsData) {
          userPreferences = prefsData
        }
      } catch (prefsErr) {
        // Ignorar erros ao buscar preferências - não é crítico
        // ✅ Log sanitizado
        safeLog('warn', '[AuthService] Erro ao buscar user_preferences', prefsErr)
      }

      // Converter location JSONB para formato esperado pelo frontend
      const profileData = {
        ...userData,
        bio: (userData as any).bio || '',
        // Mapear photos[0] para avatar_url
        avatar_url: Array.isArray(userData.photos) && userData.photos.length > 0 
          ? userData.photos[0] 
          : undefined,
        // Extrair interests de preferences
        interests: userPreferences?.interests || 
                   (userData.preferences as any)?.interests || 
                   [],
        location: typeof userData.location === 'object' && userData.location !== null
          ? (userData.location as any).address || 
            (userData.location as any).city || 
            (userData.location as any).formatted_address ||
            userData.location
          : userData.location,
        preferences: userPreferences ? {
          drink_preferences: userPreferences.drink_preferences || [],
          food_preferences: userPreferences.food_preferences || [],
          music_preferences: userPreferences.music_preferences || [],
          vibe_preferences: userPreferences.vibe_preferences || {},
          ...(userData.preferences as any || {}),
        } : (userData.preferences || {}),
      } as UserProfile

      return { data: profileData }
    } catch (error) {
      // ✅ Log sanitizado
      safeLog('error', '[AuthService] getUserProfile exception', error)
      return { error: error instanceof Error ? error.message : 'Failed to get user profile' }
    }
  }

  static async resetPassword(email: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to reset password' }
    }
  }

  static async updatePassword(newPassword: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update password' }
    }
  }

  static async uploadAvatar(userId: string, file: File): Promise<ApiResponse<string>> {
    try {
      const fileName = `${userId}-${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { data: currentUser } = await supabase
        .from('users')
        .select('photos')
        .eq('id', userId)
        .single()

      const existingPhotos = currentUser?.photos || []
      const newPhotos = existingPhotos.length > 0 
        ? [publicUrl, ...existingPhotos.slice(1)] 
        : [publicUrl]

      const { error: updateError } = await supabase
        .from('users')
        .update({ photos: newPhotos })
        .eq('id', userId)

      if (updateError) throw updateError

      return { data: publicUrl }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to upload avatar' }
    }
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
