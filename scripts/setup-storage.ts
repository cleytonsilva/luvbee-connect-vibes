import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

/**
 * Script para criar buckets de Storage no Supabase
 * Execute: npm run setup:storage
 */

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

// Usar service key se disponível, senão usar anon key
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
)

const buckets = [
  {
    name: 'avatars',
    public: true,
    description: 'Imagens de perfil dos usuários',
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    name: 'locations',
    public: true,
    description: 'Imagens de estabelecimentos',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    name: 'public',
    public: true,
    description: 'Assets públicos da aplicação',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  }
]

async function createBuckets() {
  console.log('📦 Criando buckets de Storage...\n')

  for (const bucket of buckets) {
    try {
      // Verificar se o bucket já existe
      const { data: existingBuckets } = await supabase.storage.listBuckets()
      const exists = existingBuckets?.some(b => b.name === bucket.name)

      if (exists) {
        console.log(`✅ Bucket "${bucket.name}" já existe`)
        continue
      }

      // Criar bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      })

      if (error) {
        console.error(`❌ Erro ao criar bucket "${bucket.name}":`, error.message)
        
        // Se for erro de permissão, tentar criar via API REST
        if (error.message.includes('permission') || error.message.includes('RLS')) {
          console.log(`⚠️  Tentando criar "${bucket.name}" via API REST...`)
          // Nota: Para criar buckets via API REST, precisa de service_role key
          if (!supabaseServiceKey) {
            console.log('   ⚠️  Service key não configurada. Crie manualmente no Dashboard.')
          }
        }
      } else {
        console.log(`✅ Bucket "${bucket.name}" criado com sucesso`)
        console.log(`   - Público: ${bucket.public ? 'Sim' : 'Não'}`)
        console.log(`   - Tamanho máximo: ${bucket.fileSizeLimit / 1024 / 1024}MB`)
      }
    } catch (error) {
      console.error(`❌ Erro inesperado ao criar bucket "${bucket.name}":`, error)
    }
  }

  console.log('\n📋 Listando buckets existentes...')
  const { data: allBuckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('❌ Erro ao listar buckets:', listError.message)
    return false
  }

  if (allBuckets && allBuckets.length > 0) {
    console.log(`\n✅ Total de buckets: ${allBuckets.length}`)
    allBuckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
    })
  } else {
    console.log('\n⚠️  Nenhum bucket encontrado')
    console.log('💡 Crie os buckets manualmente no Dashboard do Supabase:')
    console.log('   https://app.supabase.com/project/[project-id]/storage/buckets')
  }

  return true
}

createBuckets().then(success => {
  if (!success) {
    console.log('\n💡 Dica: Se os buckets não foram criados automaticamente,')
    console.log('   crie-os manualmente no Dashboard do Supabase.')
    console.log('   Settings > Storage > New bucket')
  }
  process.exit(success ? 0 : 1)
})

