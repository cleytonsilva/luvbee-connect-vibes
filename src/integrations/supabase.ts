import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production'
  const errorMessage = `
    ❌ Variáveis de ambiente do Supabase não configuradas!
    
    ${isProduction 
      ? `🔴 PRODUÇÃO (Vercel): Configure no Vercel Console:
      1. Acesse: https://vercel.com/dashboard
      2. Selecione projeto: luvbee-connect-vibes
      3. Settings → Environment Variables
      4. Adicione:
         - VITE_SUPABASE_URL=https://zgxtcawgllsnnernlgim.supabase.co
         - VITE_SUPABASE_ANON_KEY=[sua-chave-anon]
      5. Faça Redeploy
      
      Veja: VERCEL_ENV_SETUP.md para guia completo.`
      : `💻 DESENVOLVIMENTO: Configure no arquivo .env.local:
      - VITE_SUPABASE_URL=https://zgxtcawgllsnnernlgim.supabase.co
      - VITE_SUPABASE_ANON_KEY=[sua-chave-anon]`
    }
  `
  
  if (import.meta.env.DEV) {
    console.error(errorMessage)
    // Em desenvolvimento, não quebra a aplicação, apenas mostra warning
  } else {
    throw new Error(`Missing Supabase environment variables. ${isProduction ? 'Configure no Vercel Console → Settings → Environment Variables' : 'Configure no arquivo .env.local'}`)
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

const storageKey = 'luvbee-auth-token'
const sanitizePersistedSession = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const refreshToken = parsed?.currentSession?.refresh_token || parsed?.refresh_token
    const accessToken = parsed?.currentSession?.access_token || parsed?.access_token
    if (!refreshToken || !accessToken) {
      window.localStorage.removeItem(storageKey)
      supabase.auth.signOut()
    }
  } catch {
    try { window.localStorage.removeItem(storageKey) } catch {}
  }
}

sanitizePersistedSession()

supabase.auth.onAuthStateChange((_event, session) => {
  if (typeof window === 'undefined') return
  if (!session) {
    try { window.localStorage.removeItem(storageKey) } catch {}
  }
})

// Helper para verificar se o Supabase está configurado
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key')
}

// Helper para obter informações de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  const alreadyLogged = typeof window !== 'undefined' && (window as any).__supabaseLogged
  if (!alreadyLogged) {
    const configInfo = {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ Não configurado',
      hasKey: !!supabaseAnonKey,
      configured: isSupabaseConfigured()
    }
    console.debug('🔌 Supabase:', configInfo)
    if (typeof window !== 'undefined') {
      ;(window as any).__supabaseLogged = true
    }
  }
}

export default supabase
