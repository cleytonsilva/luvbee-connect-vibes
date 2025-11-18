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
