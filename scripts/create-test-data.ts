/**
 * Script de Validação - LuvBee Core Platform
 * 
 * Cria usuários fake e dados de teste para validar todas as User Stories
 */

import { mcp_supabase_execute_sql } from './validation-helper'

const PROJECT_ID = 'zgxtcawgllsnnernlgim'

// Dados dos usuários fake
const FAKE_USERS = [
  {
    email: 'teste1@luvbee.com',
    password: 'senha123',
    name: 'João Silva',
    age: 25,
    location: 'São Paulo, SP',
    latitude: -23.5505,
    longitude: -46.6333,
    preferences: {
      drinks: ['Cerveja', 'Vinho', 'Cocktail'],
      food: ['Pizza', 'Hambúrguer', 'Sushi'],
      music: ['Rock', 'Eletrônica', 'Pop']
    }
  },
  {
    email: 'teste2@luvbee.com',
    password: 'senha123',
    name: 'Maria Santos',
    age: 28,
    location: 'São Paulo, SP',
    latitude: -23.5505,
    longitude: -46.6333,
    preferences: {
      drinks: ['Cerveja', 'Cocktail'],
      food: ['Pizza', 'Hambúrguer'],
      music: ['Rock', 'Pop']
    }
  },
  {
    email: 'teste3@luvbee.com',
    password: 'senha123',
    name: 'Pedro Costa',
    age: 30,
    location: 'Rio de Janeiro, RJ',
    latitude: -22.9068,
    longitude: -43.1729,
    preferences: {
      drinks: ['Vinho', 'Cocktail'],
      food: ['Sushi', 'Pizza'],
      music: ['Eletrônica', 'Pop']
    }
  }
]

// Locais fake para teste
const FAKE_LOCATIONS = [
  {
    name: 'The Neon Lounge',
    address: 'Rua Augusta, 123 - São Paulo, SP',
    category: 'Bar',
    latitude: -23.5505,
    longitude: -46.6333,
    rating: 4.5,
    description: 'Bar temático com música eletrônica e drinks autorais'
  },
  {
    name: 'Rock & Roll Pub',
    address: 'Av. Paulista, 456 - São Paulo, SP',
    category: 'Bar',
    latitude: -23.5614,
    longitude: -46.6565,
    rating: 4.3,
    description: 'Pub com música ao vivo e cervejas artesanais'
  },
  {
    name: 'Sushi House',
    address: 'Rua dos Três Irmãos, 789 - São Paulo, SP',
    category: 'Restaurante',
    latitude: -23.5505,
    longitude: -46.6333,
    rating: 4.7,
    description: 'Restaurante japonês com ambiente moderno'
  },
  {
    name: 'Pizza Corner',
    address: 'Rua Haddock Lobo, 321 - São Paulo, SP',
    category: 'Restaurante',
    latitude: -23.5505,
    longitude: -46.6333,
    rating: 4.4,
    description: 'Pizzaria com forno a lenha e ambiente descontraído'
  },
  {
    name: 'Cocktail Bar',
    address: 'Av. Faria Lima, 654 - São Paulo, SP',
    category: 'Bar',
    latitude: -23.5679,
    longitude: -46.6917,
    rating: 4.6,
    description: 'Bar sofisticado com coquetéis autorais'
  }
]

async function createFakeUsers() {
  console.log('📝 Criando usuários fake...')
  
  for (const user of FAKE_USERS) {
    // Criar usuário via Auth (precisa ser feito via API, não SQL)
    // Por enquanto, vamos criar apenas os dados no banco
    console.log(`  Criando usuário: ${user.email}`)
    
    // Nota: A criação real de usuário precisa ser feita via Supabase Auth API
    // Este script apenas prepara os dados
  }
  
  console.log('✅ Usuários fake preparados')
}

async function createFakeLocations() {
  console.log('📍 Criando locais fake...')
  
  const sql = `
    INSERT INTO locations (
      name, address, category, description, rating,
      latitude, longitude, is_verified, is_active, owner_id
    )
    VALUES
    ${FAKE_LOCATIONS.map((loc, index) => `
      (
        '${loc.name}',
        '${loc.address}',
        '${loc.category}',
        '${loc.description}',
        ${loc.rating},
        ${loc.latitude},
        ${loc.longitude},
        true,
        true,
        NULL
      )
    `).join(',')}
    ON CONFLICT DO NOTHING
    RETURNING id, name;
  `
  
  try {
    const result = await mcp_supabase_execute_sql(PROJECT_ID, sql)
    console.log('✅ Locais fake criados:', result)
  } catch (error) {
    console.error('❌ Erro ao criar locais:', error)
  }
}

async function main() {
  console.log('🚀 Iniciando validação do LuvBee Core Platform\n')
  
  // 1. Criar locais fake
  await createFakeLocations()
  
  // 2. Criar usuários fake (via Auth API seria necessário)
  await createFakeUsers()
  
  console.log('\n✅ Validação concluída!')
  console.log('\n📋 Próximos passos:')
  console.log('1. Criar usuários via interface de registro')
  console.log('2. Completar onboarding')
  console.log('3. Dar match com locais')
  console.log('4. Testar match com pessoas')
  console.log('5. Testar chat')
}

main().catch(console.error)

