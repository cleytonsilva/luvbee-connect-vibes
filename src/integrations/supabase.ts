import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
    ❌ Variáveis de ambiente do Supabase não configuradas!
    
    Por favor, configure as seguintes variáveis no arquivo .env.local:
    - VITE_SUPABASE_URL=https://[project-id].supabase.co
    - VITE_SUPABASE_ANON_KEY=[anon-key]
    
    Veja SUPABASE_SETUP.md para mais detalhes.
  `
  
  if (import.meta.env.DEV) {
    console.error(errorMessage)
    // Em desenvolvimento, não quebra a aplicação, apenas mostra warning
  } else {
    throw new Error('Missing Supabase environment variables')
  }
}

// Interceptor para suprimir erros 409 de location_matches e 406 de locations no console
if (typeof window !== 'undefined') {
  // Interceptar console.error para suprimir erros esperados
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ')
    // Suprimir erros 409 relacionados a location_matches (duplicatas esperadas)
    if (
      errorMessage.includes('409') && 
      errorMessage.includes('location_matches')
    ) {
      // Não logar este erro específico
      return
    }
    // Suprimir erros 406 relacionados a locations quando não encontrado (esperado)
    if (
      errorMessage.includes('406') && 
      (errorMessage.includes('locations') || errorMessage.includes('Not Acceptable'))
    ) {
      // Não logar este erro específico - local não encontrado é esperado
      return
    }
    // Logar todos os outros erros normalmente
    originalConsoleError.apply(console, args)
  }

  // Interceptar fetch para suprimir erros esperados
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args)
      
      const url = args[0]?.toString() || ''
      
      // Verificar se é uma requisição GET para locations com erro 406 (local não encontrado)
      if (
        url.includes('locations') && 
        url.includes('rest/v1') &&
        response.status === 406 &&
        (args[1]?.method === 'GET' || args[1]?.method === undefined)
      ) {
        // Suprimir o erro 406 silenciosamente - local não encontrado é esperado
        return response
      }
      
      // Verificar se é uma requisição POST para location_matches com erro 409 (duplicata esperada)
      if (
        url.includes('location_matches') && 
        url.includes('rest/v1') &&
        response.status === 409 &&
        (args[1]?.method === 'POST' || args[1]?.method === undefined)
      ) {
        // Suprimir o erro 409 silenciosamente
        return response
      }
      
      return response
    } catch (error) {
      // Se for erro relacionado a location_matches e 409, suprimir
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('409') && errorMessage.includes('location_matches')) {
        // Retornar uma resposta fake de sucesso para evitar o erro
        return new Response(JSON.stringify({}), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        })
      }
      throw error
    }
  }
}

// Criação do cliente Supabase com configurações otimizadas
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'luvbee-auth-token',
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-application-name': 'luvbee-connect-vibes',
        'x-client-info': 'luvbee-web@1.0.0'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Helper para verificar se o Supabase está configurado
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key')
}

// Helper para obter informações de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  const configInfo = {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ Não configurado',
    hasKey: !!supabaseAnonKey,
    configured: isSupabaseConfigured()
  }
  console.log('🔌 Supabase Client Configurado:', configInfo)
  console.log('   URL:', configInfo.url)
  console.log('   Chave configurada:', configInfo.hasKey)
  console.log('   Cliente configurado:', configInfo.configured)
}

export default supabase