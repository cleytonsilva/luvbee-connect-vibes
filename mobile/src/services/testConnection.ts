import { checkSupabaseConnection, supabase } from './supabase';

export const runConnectionDiagnostics = async () => {
  
  const isConnected = await checkSupabaseConnection();
  
  if (isConnected) {
    
    // Teste adicional de sessão
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Diagnóstico: Erro ao verificar sessão:', sessionError);
    } else {
    }
  } else {
    console.error('❌ Diagnóstico: FALHA na conexão.');
  }
};
