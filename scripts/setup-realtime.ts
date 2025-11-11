import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

/**
 * Script para verificar e configurar Realtime
 * Execute: npm run setup:realtime
 */

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const tablesForRealtime = [
  'messages',
  'people_matches',
  'location_matches',
  'chats'
]

async function checkRealtime() {
  console.log('🔔 Verificando configuração do Realtime...\n')

  // Teste básico de conexão Realtime
  console.log('📋 Teste 1: Testando conexão Realtime...')
  const testChannel = supabase.channel('realtime-test')
  
  try {
    const subscribeResult = await testChannel.subscribe()
    
    if (subscribeResult === 'SUBSCRIBED') {
      console.log('✅ Realtime está habilitado e funcionando')
      await testChannel.unsubscribe()
    } else {
      console.log('⚠️  Realtime pode não estar habilitado')
      console.log('   Status:', subscribeResult)
    }
  } catch (error) {
    console.error('❌ Erro ao testar Realtime:', error)
  }

  console.log('\n💡 Para habilitar Realtime nas tabelas:')
  console.log('   1. Acesse o Dashboard do Supabase')
  console.log('   2. Vá em Database > Replication')
  console.log('   3. Habilite Realtime para as seguintes tabelas:')
  tablesForRealtime.forEach(table => {
    console.log(`      - ${table}`)
  })

  console.log('\n📝 Ou execute via SQL:')
  console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE messages;')
  console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE people_matches;')
  console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE location_matches;')
  console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE chats;')

  return true
}

checkRealtime().then(() => {
  process.exit(0)
})

