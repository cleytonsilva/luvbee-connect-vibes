// search-nearby-expandido/index.ts
// Edge Function melhorada com busca múltipla para expandir categorias

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'

const GOOGLE_PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'
const GOOGLE_PLACES_TEXT_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Categorias por tipo de Google (Nearby Search)
const CATEGORIES_BY_TYPE = {
  // Vida Noturna
  nightlife: [
    'night_club',
    'bar',
    'pub',
    'liquor_store',
    'cocktail_bar',
    'wine_bar',
    'beer_bar',
    'karaoke_bar',
    'comedy_club',
    'dance_hall',
    'disco_club',
    'salsa_club',
    'live_music_venue',
    'jazz_club',
    'speakeasy',
  ],

  // Cultura e Arte
  culture: [
    'museum',
    'art_gallery',
    'cultural_center',
    'performing_arts_theater',
    'movie_theater',
    'auditorium',
    'amphitheater',
    'concert_hall',
    'opera_house',
    'library',
    'archive',
  ],

  // Entretenimento
  entertainment: [
    'amusement_park',
    'aquarium',
    'bowling_alley',
    'casino',
    'game_arcade',
    'miniature_golf_course',
    'pool_hall',
    'zoo',
    'botanical_garden',
    'observation_deck',
    'planetarium',
    'stadium',
    'arena',
    'events_venue',
  ],

  // Comida e Bebida (refinado)
  dining: [
    'restaurant',
    'cafe',
    'bakery',
    'ice_cream_shop',
    'juice_bar',
    'tea_house',
    'coffee_shop',
    'brunch_restaurant',
    'fine_dining_restaurant',
    'tapas_restaurant',
    'bistro',
    'brewpub',
  ],
};

// Keywords para Text Search (busca mais abrangente)
const KEYWORDS_BY_CATEGORY = [
  // Bares e Pubs
  { keyword: 'bar pub cervejaria', category: 'bar', vibe: 'party' },
  { keyword: 'buteco boteco', category: 'bar', vibe: 'casual' },
  { keyword: 'wine bar vinho', category: 'bar', vibe: 'date' },
  { keyword: 'cocktail bar drinks', category: 'bar', vibe: 'trendy' },
  { keyword: 'rooftop bar terraço', category: 'bar', vibe: 'trendy' },

  // Baladas e Noite
  { keyword: 'nightclub balada boate', category: 'nightclub', vibe: 'party' },
  { keyword: 'dança festa noite', category: 'nightclub', vibe: 'party' },
  { keyword: 'after hours', category: 'nightclub', vibe: 'party' },

  // Música ao Vivo
  { keyword: 'live music música ao vivo', category: 'live_music', vibe: 'party' },
  { keyword: 'show concerto apresentação', category: 'live_music', vibe: 'party' },
  { keyword: 'samba pagode roda', category: 'live_music', vibe: 'culture' },
  { keyword: 'forró sertanejo', category: 'live_music', vibe: 'culture' },
  { keyword: 'rock bar música', category: 'live_music', vibe: 'alternative' },
  { keyword: 'jazz blues', category: 'live_music', vibe: 'sophisticated' },
  { keyword: 'karaoke cantar', category: 'karaoke', vibe: 'party' },

  // Comédia
  { keyword: 'stand up comedy comédia', category: 'comedy_club', vibe: 'casual' },
  { keyword: 'clube de comédia humor', category: 'comedy_club', vibe: 'casual' },
  { keyword: 'open mic', category: 'comedy_club', vibe: 'alternative' },

  // Cultura
  { keyword: 'museum museu exposição', category: 'museum', vibe: 'culture' },
  { keyword: 'galeria de arte', category: 'art_gallery', vibe: 'culture' },
  { keyword: 'centro cultural', category: 'cultural_center', vibe: 'culture' },
  { keyword: 'exposição arte', category: 'art_gallery', vibe: 'culture' },

  // Teatro e Cinema
  { keyword: 'teatro theater peça', category: 'theater', vibe: 'culture' },
  { keyword: 'cinema filme', category: 'movie_theater', vibe: 'casual' },
  { keyword: 'show apresentação teatral', category: 'theater', vibe: 'culture' },
  { keyword: 'opera ballet', category: 'performing_arts_theater', vibe: 'sophisticated' },

  // Entretenimento
  { keyword: 'sinuca bilhar snooker', category: 'pool_hall', vibe: 'casual' },
  { keyword: 'bowling boliche', category: 'bowling_alley', vibe: 'casual' },
  { keyword: ' Arcade fliperama games', category: 'game_arcade', vibe: 'casual' },
  { keyword: 'escape room', category: 'amusement_park', vibe: 'trendy' },
  { keyword: 'parque diversão', category: 'amusement_park', vibe: 'family' },

  // Brasileiríssimos
  { keyword: 'samba de raiz', category: 'live_music', vibe: 'culture' },
  { keyword: 'bar de esquina', category: 'bar', vibe: 'casual' },
  { keyword: 'bar do zé', category: 'bar', vibe: 'casual' },
  { keyword: 'baião de dois nordestino', category: 'restaurant', vibe: 'culture' },
  { keyword: 'café com música', category: 'cafe', vibe: 'chill' },
  { keyword: 'vinil discos', category: 'bar', vibe: 'alternative' },

  // Bibliotecas e Leitura
  { keyword: 'biblioteca library leitura', category: 'library', vibe: 'intellectual' },
  { keyword: 'sala de leitura', category: 'library', vibe: 'intellectual' },
];

// Lista negra global
const EXCLUDED_TYPES = [
  "fast_food_restaurant",
  "meal_takeaway",
  "meal_delivery",
  "sandwich_shop",
  "gas_station",
  "atm",
  "bank",
  "pharmacy",
  "supermarket",
  "shopping_mall",
  "gym",
  "convenience_store",
  "car_repair",
  "laundry",
  "parking",
  "playground",
  "park",
  "school",
  "hospital",
  "church",
  "cemetery",
  "government_office",
  "post_office",
  "police",
  "transit_station",
];

// ==========================================
// INTERFACES
// ==========================================

interface GooglePlaceV1 {
  id: string
  displayName?: { text: string; languageCode: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  priceLevel?: string
  rating?: number
  userRatingCount?: number
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
  }>
  editorialSummary?: { text: string; languageCode: string }
  generativeSummary?: { overview: { text: string; languageCode: string } }
  types?: string[]
  primaryType?: string
  location?: {
    latitude: number
    longitude: number
  }
  regularOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  nationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  businessStatus?: string
  liveMusic?: boolean
  servesBeer?: boolean
  servesWine?: boolean
  servesCocktails?: boolean
  goodForGroups?: boolean
  outdoorSeating?: boolean
}

interface AppGooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: { lat: number; lng: number }
  }
  photos?: Array<{
    photo_reference: string
    width: number
    height: number
  }>
  rating?: number
  user_ratings_total?: number
  price_level?: number
  types?: string[]
  primary_type?: string
  description?: string
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  website?: string
  google_maps_uri?: string
  business_status?: string
  features?: {
    live_music?: boolean
    serves_beer?: boolean
    serves_wine?: boolean
    serves_cocktails?: boolean
    good_for_groups?: boolean
    outdoor_seating?: boolean
  }
  // Campos adicionais do Luvbee
  category?: string
  vibes?: string[]
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function mapPriceLevel(level?: string): number {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return 0
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    default: return 0
  }
}

function mapGooglePlaceToAppPlace(place: GooglePlaceV1): AppGooglePlace {
  const description = place.generativeSummary?.overview?.text ||
    place.editorialSummary?.text ||
    `${place.types?.[0] || 'Local'} • ${place.rating} ⭐`

  // Determinar categoria principal
  let category = 'other'
  if (place.types?.includes('night_club')) category = 'nightclub'
  else if (place.types?.includes('bar') || place.types?.includes('pub')) category = 'bar'
  else if (place.types?.includes('museum')) category = 'museum'
  else if (place.types?.includes('art_gallery')) category = 'art_gallery'
  else if (place.types?.includes('movie_theater') || place.types?.includes('performing_arts_theater')) category = 'theater'
  else if (place.types?.includes('live_music_venue') || place.liveMusic) category = 'live_music'
  else if (place.types?.includes('comedy_club')) category = 'comedy_club'
  else if (place.types?.includes('library')) category = 'library'

  // Determinar vibes
  const vibes: string[] = []
  if (place.types?.includes('night_club') || place.types?.includes('dance_hall')) vibes.push('party')
  if (place.types?.includes('wine_bar') || place.types?.includes('cocktail_bar')) vibes.push('sophisticated')
  if (place.types?.includes('pub') || place.types?.includes('beer_bar')) vibes.push('casual')
  if (place.types?.includes('museum') || place.types?.includes('art_gallery')) vibes.push('culture')
  if (place.types?.includes('library')) vibes.push('intellectual')
  if (place.liveMusic) vibes.push('live_music')
  if (place.goodForGroups) vibes.push('groups')

  return {
    place_id: place.id,
    name: place.displayName?.text || 'Desconhecido',
    formatted_address: place.formattedAddress || place.shortFormattedAddress || '',
    geometry: {
      location: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
      }
    },
    photos: place.photos?.map(p => ({
      photo_reference: p.name,
      width: p.widthPx,
      height: p.heightPx,
    })) || [],
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    price_level: mapPriceLevel(place.priceLevel),
    types: place.types,
    primary_type: place.primaryType,
    description,
    opening_hours: place.regularOpeningHours ? {
      open_now: place.regularOpeningHours.openNow,
      weekday_text: place.regularOpeningHours.weekdayDescriptions,
    } : undefined,
    website: place.websiteUri,
    google_maps_uri: place.googleMapsUri,
    business_status: place.businessStatus,
    features: {
      live_music: place.liveMusic,
      serves_beer: place.servesBeer,
      serves_wine: place.servesWine,
      serves_cocktails: place.servesCocktails,
      good_for_groups: place.goodForGroups,
      outdoor_seating: place.outdoorSeating,
    },
    category,
    vibes,
  }
}

function applyQualityFilters(place: GooglePlaceV1): boolean {
  // 1. Rating mínimo
  if (!place.rating || place.rating < 4.0) return false

  // 2. Mínimo de reviews
  if (!place.userRatingCount || place.userRatingCount < 10) return false

  // 3. Deve estar operacional
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return false

  // 4. Deve ter fotos
  if (!place.photos || place.photos.length === 0) return false

  // 5. Deve ter endereço
  if (!place.formattedAddress && !place.shortFormattedAddress) return false

  return true
}

function removeDuplicatePlaces(places: AppGooglePlace[]): AppGooglePlace[] {
  const seen = new Set<string>()
  return places.filter(place => {
    if (seen.has(place.place_id)) return false
    seen.add(place.place_id)
    return true
  })
}

function sortByRelevance(places: AppGooglePlace[]): AppGooglePlace[] {
  return places.sort((a, b) => {
    // Prioridade: rating alto + muitas reviews
    const scoreA = (a.rating || 0) * Math.log10((a.user_ratings_total || 1) + 1)
    const scoreB = (b.rating || 0) * Math.log10((b.user_ratings_total || 1) + 1)
    return scoreB - scoreA
  })
}

// ==========================================
// BUSCAS NA API GOOGLE
// ==========================================

async function searchNearbyByTypes(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number,
  types: string[],
  language: string = 'en'
): Promise<GooglePlaceV1[]> {
  const requestBody = {
    includedTypes: types,
    excludedTypes: EXCLUDED_TYPES,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: Math.min(radius, 50000),
      }
    },
    rankPreference: 'POPULARITY',
    languageCode: language,
  }

  const response = await fetch(GOOGLE_PLACES_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.editorialSummary,places.generativeSummary,places.types,places.primaryType,places.location,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.liveMusic,places.servesBeer,places.servesWine,places.servesCocktails,places.goodForGroups,places.outdoorSeating,places.shortFormattedAddress',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    console.error(`[searchNearbyByTypes] Error: ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.places || []
}

async function searchByText(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number,
  keyword: string,
  language: string = 'en'
): Promise<GooglePlaceV1[]> {
  const requestBody = {
    textQuery: keyword,
    locationBias: {
      circle: {
        center: { latitude, longitude },
        radius: Math.min(radius, 50000),
      }
    },
    maxResultCount: 10,
    languageCode: language,
  }

  const response = await fetch(GOOGLE_PLACES_TEXT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.editorialSummary,places.generativeSummary,places.types,places.primaryType,places.location,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.liveMusic,places.servesBeer,places.servesWine,places.servesCocktails,places.goodForGroups,places.outdoorSeating,places.shortFormattedAddress',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    console.error(`[searchByText] Error: ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.places || []
}

// ==========================================
// HANDLER PRINCIPAL
// ==========================================

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar Autenticação (JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase para validar o token
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Obter usuário logado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      latitude,
      longitude,
      radius = 5000,
      vibe_category,
      category, // filtro específico
      search_mode = 'combined', // 'nearby' | 'text' | 'combined'
      language = 'en'
    } = body

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[search-nearby] Modo: ${search_mode}, Local: ${latitude},${longitude}, Raio: ${radius}, Lang: ${language}`)

    let allPlaces: GooglePlaceV1[] = []

    // ESTRATÉGIA 1: Busca por tipos (Nearby Search)
    if (search_mode === 'nearby' || search_mode === 'combined') {
      let typesToSearch: string[] = []

      if (vibe_category === 'nightlife' || category === 'bar' || category === 'nightclub') {
        typesToSearch = CATEGORIES_BY_TYPE.nightlife
      } else if (vibe_category === 'culture' || category === 'museum' || category === 'theater') {
        typesToSearch = CATEGORIES_BY_TYPE.culture
      } else if (vibe_category === 'entertainment') {
        typesToSearch = CATEGORIES_BY_TYPE.entertainment
      } else {
        // Buscar tudo
        typesToSearch = [
          ...CATEGORIES_BY_TYPE.nightlife,
          ...CATEGORIES_BY_TYPE.culture,
          ...CATEGORIES_BY_TYPE.entertainment,
        ]
      }

      // Dividir em chunks de 50 tipos (limite da API)
      const chunks = []
      for (let i = 0; i < typesToSearch.length; i += 50) {
        chunks.push(typesToSearch.slice(i, i + 50))
      }

      // Buscar paralelamente
      const nearbyResults = await Promise.all(
        chunks.map(chunk => searchNearbyByTypes(apiKey, latitude, longitude, radius, chunk, language))
      )

      allPlaces = allPlaces.concat(nearbyResults.flat())
      console.log(`[search-nearby] Nearby results: ${allPlaces.length}`)
    }

    // ESTRATÉGIA 2: Busca por texto (Text Search)
    if (search_mode === 'text' || search_mode === 'combined') {
      // Selecionar keywords baseado na categoria
      let keywordsToSearch = KEYWORDS_BY_CATEGORY

      if (category === 'bar') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'bar')
      } else if (category === 'nightclub') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'nightclub')
      } else if (category === 'live_music') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'live_music')
      } else if (category === 'museum') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'museum')
      } else if (category === 'theater') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'theater')
      } else if (category === 'comedy_club') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'comedy_club')
      } else if (category === 'library') {
        keywordsToSearch = KEYWORDS_BY_CATEGORY.filter(k => k.category === 'library')
      }

      // Limitar a 5 keywords por busca para economizar quota
      const selectedKeywords = keywordsToSearch.slice(0, 5)

      const textResults = await Promise.all(
        selectedKeywords.map(k => searchByText(apiKey, latitude, longitude, radius, k.keyword, language))
      )

      allPlaces = allPlaces.concat(textResults.flat())
      console.log(`[search-nearby] Text search results: ${textResults.flat().length}`)
    }

    console.log(`[search-nearby] Total antes de filtros: ${allPlaces.length}`)

    // ==========================================
    // APLICAR FILTROS DE QUALIDADE
    // ==========================================

    const filteredPlaces = allPlaces.filter(applyQualityFilters)
    console.log(`[search-nearby] Total após filtros: ${filteredPlaces.length}`)

    // ==========================================
    // MAPEAR PARA FORMATO DO APP
    // ==========================================

    let appPlaces = filteredPlaces.map(mapGooglePlaceToAppPlace)

    // Remover duplicados
    appPlaces = removeDuplicatePlaces(appPlaces)

    // Ordenar por relevância
    appPlaces = sortByRelevance(appPlaces)

    // Limitar a 60 resultados
    appPlaces = appPlaces.slice(0, 60)

    console.log(`[search-nearby] Resultados finais: ${appPlaces.length}`)

    return new Response(
      JSON.stringify({
        data: appPlaces,
        meta: {
          total: appPlaces.length,
          search_mode,
          radius,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[search-nearby] Erro:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
