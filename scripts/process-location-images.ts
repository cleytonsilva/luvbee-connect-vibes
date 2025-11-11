/**
 * Script para processar imagens usando Edge Function do Supabase
 * 
 * Usa a Edge Function process-location-image que já tem a API key configurada
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_KEY devem estar configurados no .env.local')
  process.exit(1)
}

// Criar cliente Supabase com service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

/**
 * Processa imagens de todos os locais sem foto usando Edge Function
 */
async function processAllLocationImages() {
  console.log('🚀 Iniciando processamento de imagens dos locais via Edge Function...\n')

  try {
    // Primeiro, limpar URLs inválidas do Google Places
    console.log('🧹 Limpando URLs inválidas do Google Places...')
    const { error: updateError, count } = await supabase
      .from('locations')
      .update({ image_url: '' })
      .like('image_url', '%PhotoService.GetPhoto%')
      .select('id', { count: 'exact', head: true })
    
    if (updateError) {
      console.warn('⚠️  Aviso ao limpar URLs inválidas:', updateError.message)
    } else {
      console.log(`✅ ${count || 0} URLs inválidas limpas\n`)
    }

    // Buscar locais sem imagem salva
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, place_id, type')
      .or('image_url.is.null,image_url.eq.,image_url.not.like.*supabase.co/storage*')

    if (error) {
      console.error('❌ Erro ao buscar locais:', error.message)
      return
    }

    if (!locations || locations.length === 0) {
      console.log('✅ Nenhum local sem foto encontrado!')
      return
    }

    console.log(`📋 Encontrados ${locations.length} locais sem foto\n`)

    let processed = 0
    let errors = 0
    let skipped = 0

    // Processar em lotes de 3
    const batchSize = 3
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize)
      
      console.log(`\n📦 Processando lote ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, locations.length)} de ${locations.length})...`)

      await Promise.all(
        batch.map(async (location) => {
          try {
            // Verificar se já tem imagem salva
            const { data: existingLocation } = await supabase
              .from('locations')
              .select('image_url')
              .eq('id', location.id)
              .single()

            if (existingLocation?.image_url && existingLocation.image_url.includes('supabase.co/storage')) {
              skipped++
              console.log(`  ⏭️  ${location.name} - Já tem imagem`)
              return
            }

            // Chamar Edge Function para processar imagem
            if (location.place_id) {
              console.log(`  🔍 ${location.name} - Processando via Edge Function...`)
              
              const { data, error: functionError } = await supabase.functions.invoke('process-location-image', {
                body: {
                  locationId: location.id,
                  googlePlaceId: location.place_id,
                },
              })

              if (functionError) {
                errors++
                console.log(`  ❌ ${location.name} - Erro na Edge Function: ${functionError.message}`)
                return
              }

              if (data?.error) {
                errors++
                console.log(`  ❌ ${location.name} - ${data.error}`)
              } else if (data?.imageUrl) {
                processed++
                console.log(`  ✅ ${location.name} - Foto salva!`)
              } else {
                errors++
                console.log(`  ⚠️  ${location.name} - Nenhuma foto encontrada`)
              }
            } else {
              errors++
              console.log(`  ⚠️  ${location.name} - Sem place_id, não é possível buscar foto`)
            }
          } catch (error) {
            errors++
            console.error(`  ❌ ${location.name} - Erro:`, error instanceof Error ? error.message : error)
          }
        })
      )

      // Aguardar entre lotes
      if (i + batchSize < locations.length) {
        console.log('  ⏳ Aguardando 2 segundos antes do próximo lote...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ Processamento concluído!')
    console.log(`   Processados: ${processed}`)
    console.log(`   Pulados (já tinha foto): ${skipped}`)
    console.log(`   Erros/Sem foto: ${errors}`)
    console.log(`   Total: ${locations.length}`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  }
}

// Executar
processAllLocationImages().catch(console.error)
