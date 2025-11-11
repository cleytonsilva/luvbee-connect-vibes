import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

/**
 * Script de teste de conexão com Supabase
 * Execute: npm run test:supabase
 */

// Carregar variáveis de ambiente do .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.log('\nPor favor, configure as seguintes variáveis no arquivo .env.local:')
  console.log('VITE_SUPABASE_URL=https://[project-id].supabase.co')
  console.log('VITE_SUPABASE_ANON_KEY=[anon-key]')
  process.exit(1)
}

console.log('🔌 Testando conexão com Supabase...')
console.log(`URL: ${supabaseUrl}`)
console.log(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // Teste 1: Verificar autenticação
    console.log('\n📋 Teste 1: Verificando autenticação...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log('⚠️  Nenhuma sessão ativa (esperado se não estiver logado)')
    } else {
      console.log('✅ Autenticação OK')
    }

    // Teste 2: Verificar conexão com banco de dados
    console.log('\n📋 Teste 2: Verificando conexão com banco de dados...')
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (dbError) {
      console.error('❌ Erro ao conectar ao banco:', dbError.message)
      console.log('\n💡 Possíveis causas:')
      console.log('   - Tabela "users" não existe ainda')
      console.log('   - RLS (Row Level Security) bloqueando acesso')
      console.log('   - Credenciais incorretas')
      return false
    }
    
    console.log('✅ Conexão com banco de dados OK')

    // Teste 3: Verificar storage
    console.log('\n📋 Teste 3: Verificando Storage...')
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    
    if (storageError) {
      console.error('❌ Erro ao acessar Storage:', storageError.message)
      return false
    }
    
    console.log('✅ Storage OK')
    console.log(`   Buckets disponíveis: ${buckets.length}`)
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
    })

    // Teste 4: Verificar Realtime
    console.log('\n📋 Teste 4: Verificando Realtime...')
    const channel = supabase.channel('test-connection')
    const subscribeResult = await channel.subscribe()
    
    if (subscribeResult === 'SUBSCRIBED') {
      console.log('✅ Realtime OK')
      await channel.unsubscribe()
    } else {
      console.log('⚠️  Realtime pode não estar habilitado')
    }

    console.log('\n✅ Todos os testes passaram! Conexão com Supabase configurada corretamente.')
    return true

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return false
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1)
})
