import { supabase } from '../integrations/supabase.ts';

// Testar se a Edge Function spider-events existe e está funcionando
export async function testSpiderEventsFunction() {
  try {
    console.log('🧪 Testando Edge Function spider-events...');
    
    // Testar com dados de São Paulo
    const { data, error } = await supabase.functions.invoke('spider-events', {
      body: { 
        lat: -23.5505, 
        lng: -46.6333, 
        city: 'sao-paulo', 
        state: 'sp' 
      }
    });

    if (error) {
      console.error('❌ Erro ao invocar spider-events:', error);
      
      // Tentar identificar o tipo de erro
      if (error.message?.includes('not found')) {
        console.error('🕷️ A função spider-events não foi encontrada. É necessário implantá-la.');
        return { success: false, error: 'FUNCTION_NOT_FOUND' };
      }
      
      if (error.message?.includes('403')) {
        console.error('🔒 Erro de permissão. Verificar SERVICE_ROLE_KEY.');
        return { success: false, error: 'PERMISSION_DENIED' };
      }
      
      return { success: false, error: error.message };
    }

    console.log('✅ spider-events funcionando!');
    console.log('📊 Resultado:', data);
    
    return { success: true, data };
    
  } catch (error) {
    console.error('💥 Erro crítico ao testar spider-events:', error);
    return { success: false, error: error.message };
  }
}

// Testar se as variáveis de ambiente estão configuradas
export function checkEnvironmentVariables() {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GOOGLE_MAPS_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Variáveis de ambiente faltando:', missingVars);
    return false;
  }
  
  console.log('✅ Todas as variáveis de ambiente necessárias estão configuradas');
  return true;
}

// Verificar permissões do banco de dados
export async function checkDatabasePermissions() {
  try {
    console.log('🔍 Verificando permissões do banco...');
    
    // Testar inserção na tabela locations (como o spider-events faria)
    const testLocation = {
      name: 'Test Location',
      address: 'Test Address',
      city: 'sao-paulo',
      state: 'sp',
      type: 'event',
      source_id: 'test_12345',
      lat: -23.5505,
      lng: -46.6333,
      is_active: true
    };
    
    const { data, error } = await supabase
      .from('locations')
      .insert([testLocation])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao inserir na tabela locations:', error);
      
      if (error.code === '42501') { // permission denied
        console.error('🔒 Permissão negada para inserir em locations. Verificar RLS policies.');
        return { success: false, error: 'PERMISSION_DENIED' };
      }
      
      return { success: false, error: error.message };
    }
    
    console.log('✅ Inserção na tabela locations funcionando!');
    
    // Limpar teste
    if (data?.id) {
      await supabase.from('locations').delete().eq('id', data.id);
      console.log('🧹 Teste limpo');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('💥 Erro ao verificar permissões:', error);
    return { success: false, error: error.message };
  }
}