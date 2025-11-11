import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

/**
 * Script completo para aplicar migrações e configurar Supabase
 * Execute: npm run db:migrate
 */

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.log('\nPor favor, configure as seguintes variáveis no arquivo .env.local:')
  console.log('VITE_SUPABASE_URL=https://[project-id].supabase.co')
  console.log('VITE_SUPABASE_ANON_KEY=[anon-key]')
  process.exit(1)
}

// Usar service key se disponível, senão usar anon key
const supabase = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkMigrationStatus() {
  console.log('🔍 Verificando status da migração...\n')
  
  const expectedTables = [
    'users', 'user_preferences', 'locations', 'location_matches',
    'people_matches', 'chats', 'messages', 'check_ins',
    'location_categories', 'favorites', 'reviews', 'audit_logs'
  ]
  
  const existingTables: string[] = []
  const missingTables: string[] = []
  
  for (const table of expectedTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1)
      if (error && error.code === 'PGRST116') {
        missingTables.push(table)
      } else {
        existingTables.push(table)
      }
    } catch {
      missingTables.push(table)
    }
  }
  
  return { existingTables, missingTables }
}

async function checkStorageBuckets() {
  console.log('\n📦 Verificando Storage Buckets...\n')
  
  const { data: buckets, error } = await supabase.storage.listBuckets()
  
  if (error) {
    console.error('❌ Erro ao verificar buckets:', error.message)
    return { existing: [], missing: ['avatars', 'locations', 'public'] }
  }
  
  const bucketNames = buckets?.map(b => b.name) || []
  const expectedBuckets = ['avatars', 'locations', 'public']
  const existing = expectedBuckets.filter(b => bucketNames.includes(b))
  const missing = expectedBuckets.filter(b => !bucketNames.includes(b))
  
  existing.forEach(b => console.log(`   ✅ Bucket "${b}" existe`))
  missing.forEach(b => console.log(`   ❌ Bucket "${b}" não existe`))
  
  return { existing, missing }
}

async function checkRealtimeTables() {
  console.log('\n🔔 Verificando Realtime...\n')
  
  // Não podemos verificar Realtime via API, apenas informar
  console.log('   💡 Realtime precisa ser habilitado manualmente via SQL Editor')
  console.log('   📋 Tabelas que precisam de Realtime:')
  console.log('      - messages')
  console.log('      - people_matches')
  console.log('      - location_matches')
  console.log('      - chats')
  
  return { needsSetup: true }
}

async function main() {
  console.log('🚀 Iniciando processo de migração do Supabase\n')
  console.log('=' .repeat(60))
  
  // 1. Verificar tabelas
  const { existingTables, missingTables } = await checkMigrationStatus()
  
  console.log('\n📊 Status das Tabelas:')
  console.log(`   ✅ Existentes: ${existingTables.length}/${existingTables.length + missingTables.length}`)
  
  if (missingTables.length > 0) {
    console.log(`   ❌ Faltando: ${missingTables.length}`)
    console.log('\n⚠️  AÇÃO NECESSÁRIA:')
    console.log('   Aplique a migração via SQL Editor:')
    console.log('   1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new')
    console.log('   2. Copie o conteúdo de: supabase/migrations/20250127000000_create_core_tables.sql')
    console.log('   3. Cole e execute no SQL Editor\n')
  } else {
    console.log('   ✅ Todas as tabelas estão criadas!\n')
  }
  
  // 2. Verificar Storage
  const { existing: existingBuckets, missing: missingBuckets } = await checkStorageBuckets()
  
  if (missingBuckets.length > 0) {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:')
    console.log('   Crie os buckets de Storage:')
    console.log('   1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets')
    console.log('   2. Clique em "New bucket"')
    missingBuckets.forEach(bucket => {
      console.log(`   3. Crie o bucket "${bucket}" (público)`)
    })
    console.log('')
  } else {
    console.log('\n   ✅ Todos os buckets estão criados!\n')
  }
  
  // 3. Verificar Realtime
  await checkRealtimeTables()
  
  console.log('\n⚠️  AÇÃO NECESSÁRIA:')
  console.log('   Habilite Realtime via SQL Editor:')
  console.log('   1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new')
  console.log('   2. Execute o script: supabase/sql/enable-realtime.sql\n')
  
  // 4. Resumo final
  console.log('=' .repeat(60))
  console.log('\n📋 RESUMO:\n')
  
  if (missingTables.length === 0 && missingBuckets.length === 0) {
    console.log('✅ Migração básica completa!')
    console.log('⚠️  Apenas Realtime precisa ser configurado manualmente.\n')
  } else {
    console.log('⚠️  Ações pendentes:')
    if (missingTables.length > 0) {
      console.log(`   - Aplicar migração SQL (${missingTables.length} tabelas faltando)`)
    }
    if (missingBuckets.length > 0) {
      console.log(`   - Criar buckets de Storage (${missingBuckets.length} buckets faltando)`)
    }
    console.log('   - Habilitar Realtime\n')
  }
  
  console.log('📚 Para mais informações, consulte:')
  console.log('   - MIGRATION_GUIDE.md')
  console.log('   - SUPABASE_MANUAL_SETUP.md\n')
}

main().catch(error => {
  console.error('❌ Erro:', error)
  process.exit(1)
})
