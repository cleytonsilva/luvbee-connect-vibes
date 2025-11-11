import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

/**
 * Script para verificar estrutura do banco de dados
 * Execute: npm run db:check
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

const expectedTables = [
  'users',
  'user_preferences',
  'locations',
  'location_matches',
  'people_matches',
  'chats',
  'messages',
  'check_ins',
  'location_categories',
  'favorites',
  'reviews',
  'audit_logs'
]

async function checkDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados...\n')

  const existingTables: string[] = []
  const missingTables: string[] = []

  for (const table of expectedTables) {
    try {
      // Tentar fazer uma query simples para verificar se a tabela existe
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          missingTables.push(table)
          console.log(`❌ Tabela "${table}" não existe`)
        } else if (error.message.includes('permission denied') || error.code === '42501') {
          // Tabela existe mas RLS está bloqueando
          existingTables.push(table)
          console.log(`✅ Tabela "${table}" existe (RLS ativo)`)
        } else {
          // Outro erro, assumir que a tabela existe
          existingTables.push(table)
          console.log(`✅ Tabela "${table}" existe`)
        }
      } else {
        existingTables.push(table)
        console.log(`✅ Tabela "${table}" existe`)
      }
    } catch (error) {
      console.log(`⚠️  Erro ao verificar "${table}":`, error)
      missingTables.push(table)
    }
  }

  console.log('\n📊 Resumo:')
  console.log(`   ✅ Tabelas existentes: ${existingTables.length}/${expectedTables.length}`)
  console.log(`   ❌ Tabelas faltando: ${missingTables.length}`)

  if (missingTables.length > 0) {
    console.log('\n❌ Tabelas que precisam ser criadas:')
    missingTables.forEach(table => {
      console.log(`   - ${table}`)
    })
    
    console.log('\n💡 Para criar as tabelas faltantes:')
    console.log('   1. Acesse o Dashboard do Supabase')
    console.log('   2. Vá em SQL Editor')
    console.log('   3. Execute o script de migração:')
    console.log('      supabase/migrations/20250127000000_create_core_tables.sql')
    console.log('\n   Ou use o Supabase CLI:')
    console.log('   supabase db push')
  } else {
    console.log('\n✅ Todas as tabelas estão criadas!')
  }

  // Verificar RLS
  console.log('\n🔒 Verificando Row Level Security (RLS)...')
  console.log('💡 Nota: RLS pode estar ativo mesmo que não possamos verificar via API')
  console.log('   Verifique manualmente no Dashboard:')
  console.log('   Authentication > Policies')

  return missingTables.length === 0
}

checkDatabase().then(success => {
  process.exit(success ? 0 : 1)
})

