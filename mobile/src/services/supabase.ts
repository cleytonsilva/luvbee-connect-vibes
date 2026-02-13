import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { AppState } from 'react-native';

import { Platform } from 'react-native';

// Pegar variáveis de ambiente do Expo ou usar fallback
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // Em desenvolvimento, podemos logar um aviso. Em produção, isso deve ser crítico.
  const msg = '❌ Missing Supabase URL or Anon Key. Please configure your .env file or app.json extra.';
  console.error(msg);
  if (!__DEV__) {
    // Em produção, isso pode impedir o app de inicializar corretamente, o que é desejado vs segurança.
    // Pode-se optar por não lançar erro para não crashar imediatamente, mas a funcionalidade será comprometida.
    throw new Error(msg);
  }
}

// Configuração de API Keys do Google Maps por plataforma
export const getGoogleMapsApiKey = (): string | null => {
  const isIOS = Platform.OS === 'ios';

  // Tenta primeiro as variáveis de ambiente
  if (isIOS) {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ||
      Constants.expoConfig?.extra?.googleMapsApiKeyIOS ||
      null;
  } else {
    // Android ou outras plataformas
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ||
      Constants.expoConfig?.extra?.googleMapsApiKeyAndroid ||
      null;
  }
};

// Log para debug (remover em produção)
if (__DEV__) {

  const googleKey = getGoogleMapsApiKey();
}

// Adapter para SecureStore com fallback robusto para AsyncStorage
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Tenta ler do SecureStore primeiro
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue) {
        return secureValue;
      }

      // Se não encontrar, tenta ler do AsyncStorage (caso tenha sido salvo lá por ser muito grande)
      const asyncValue = await AsyncStorage.getItem(key);
      return asyncValue;
    } catch (error) {
      console.warn('Supabase storage adapter getItem error:', error);
      // Fallback final para AsyncStorage em caso de erro no SecureStore
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.error('AsyncStorage fallback failed:', e);
        return null;
      }
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      // SecureStore tem limite de ~2048 bytes
      // Se for muito grande, salva no AsyncStorage
      if (value.length > 2000) {
        if (__DEV__) console.log(`💾 Storing large key ${key} in AsyncStorage (${value.length} chars)`);
        await AsyncStorage.setItem(key, value);
        // Garante que não existe no SecureStore (para evitar duplicidade/confusão)
        await SecureStore.deleteItemAsync(key).catch(() => { });
      } else {
        await SecureStore.setItemAsync(key, value);
        // Garante que não existe no AsyncStorage
        await AsyncStorage.removeItem(key).catch(() => { });
      }
    } catch (error) {
      console.error('Supabase storage adapter setItem error:', error);
      // Tenta salvar no AsyncStorage como fallback de segurança
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.error('AsyncStorage fallback setItem failed:', e);
      }
    }
  },

  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Supabase storage adapter removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Listener para refresh de token quando o app volta para foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Helper melhorado para verificar conexão e autenticação
export const checkSupabaseConnection = async () => {
  const results = {
    network: false,
    auth: false,
    details: ''
  };

  try {
    // 1. Teste de conexão básica (health check via tabela pública ou erro de rede)
    // Tenta pegar a sessão atual para ver se a chave anon é válida
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Auth Service Error:', sessionError.message);
      results.details += `Auth Error: ${sessionError.message}\n`;
    } else {
      results.auth = true;
    }

    // 2. Teste de dados (opcional, depende de permissões)
    // Usamos 'profiles' count como no original, mas não falhamos se for apenas erro de permissão (RLS)
    const { count, error: dbError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (dbError) {
      // Se for erro de permissão, ainda significa que conectou
      if (dbError.code === 'PGRST301' || dbError.code === '42501') {
        results.network = true;
      } else {
        console.error('❌ Database Error:', dbError.message);
        results.details += `DB Error: ${dbError.message}\n`;
        // Se falhar aqui, pode ser que a URL esteja errada ou sem internet
      }
    } else {
      results.network = true;
    }

    if (results.auth || results.network) {
      return true;
    }
    return false;

  } catch (error: any) {
    console.error('❌ Unexpected Connection Error:', error);
    results.details += `Exception: ${error.message}`;
    return false;
  }
};
