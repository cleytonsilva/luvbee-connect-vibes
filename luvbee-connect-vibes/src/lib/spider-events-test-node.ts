import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase para Node.js
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.log('Variáveis necessárias:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// Testar se a Edge Function spider-events existe e está funcionando
async function testSpiderEventsFunction() {
  try {
    console.log('🧪 Testando Edge Function spider-events...')
    
    // Testar com dados de São Paulo
    const { data, error } = await supabase.functions.invoke('spider-events', {
      body: { 
        lat: -23.5505, 
        lng: -46.6333, 
        city: 'sao-paulo', 
        state: 'sp' 
      }
    })

    if (error) {
      console.error('❌ Erro ao invocar spider-events:', error)
      
      // Tentar identificar o tipo de erro
      if (error.message?.includes('not found')) {
        console.error('🕷️ A função spider-events não foi encontrada. É necessário implantá-la.')
        return { success: false, error: 'FUNCTION_NOT_FOUND' }
      }
      
      if (error.message?.includes('403')) {
        console.error('🔒 Erro de permissão. Verificar SERVICE_ROLE_KEY.')
        return { success: false, error: 'PERMISSION_DENIED' }
      }
      
      return { success: false, error: error.message }
    }

    console.log('✅ spider-events funcionando!')
    console.log('📊 Resultado:', data)
    
    return { success: true, data }
    
  } catch (error) {
    console.error('💥 Erro crítico ao testar spider-events:', error)
    return { success: false, error: error.message }
  }
}

// Verificar permissões do banco de dados
async function checkDatabasePermissions() {
  try {
    console.log('🔍 Verificando permissões do banco...')
    
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
      image_url: 'https://example.com/image.jpg',
      price_level: 2,
      rating: 4.5,
      peak_hours: [0, 0, 0, 0, 0] // Array de 5 elementos obrigatório
    }
    
    const { data, error } = await supabase
      .from('locations')
      .insert([testLocation])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Erro ao inserir na tabela locations:', error)
      
      if (error.code === '42501') { // permission denied
        console.error('🔒 Permissão negada para inserir em locations. Verificar RLS policies.')
        return { success: false, error: 'PERMISSION_DENIED' }
      }
      
      return { success: false, error: error.message }
    }
    
    console.log('✅ Inserção na tabela locations funcionando!')
    
    // Limpar teste
    if (data?.id) {
      await supabase.from('locations').delete().eq('id', data.id)
      console.log('🧹 Teste limpo')
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('💥 Erro ao verificar permissões:', error)
    return { success: false, error: error.message }
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes do sistema de eventos...\n')
  
  // Testar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:')
  console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ Configurado' : '❌ Faltando'}`)
  console.log(`- SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Configurado' : '❌ Faltando'}\n`)
  
  // Testar permissões do banco
  const permResult = await checkDatabasePermissions()
  if (!permResult.success) {
    console.error('❌ Falha nas permissões do banco de dados')
    process.exit(1)
  }
  
  // Testar Edge Function
  console.log('\n🧪 Testando Edge Function spider-events...')
  const functionResult = await testSpiderEventsFunction()
  
  if (functionResult.success) {
    console.log('✅ Todos os testes passaram!')
    console.log('📊 Eventos encontrados:', functionResult.data?.length || 0)
    
    if (functionResult.data?.length > 0) {
      console.log('\n📍 Primeiros eventos:')
      functionResult.data.slice(0, 3).forEach((event: any, index: number) => {
        console.log(`${index + 1}. ${event.name} - ${event.date} - ${event.location}`)
      })
    }
  } else {
    console.error('❌ Teste falhou:', functionResult.error)
    
    if (functionResult.error === 'FUNCTION_NOT_FOUND') {
      console.log('\n📋 Próximos passos:')
      console.log('1. Acesse o Supabase Dashboard')
      console.log('2. Vá para Edge Functions')
      console.log('3. Clique em "Create a new function"')
      console.log('4. Nome: spider-events')
      console.log('5. Cole o código de supabase/functions/spider-events/index.ts')
      console.log('6. Deploy a função')
    }
  }
}

// Executar se chamado diretamente
runTests().catch(console.error)

export { testSpiderEventsFunction, checkDatabasePermissions }