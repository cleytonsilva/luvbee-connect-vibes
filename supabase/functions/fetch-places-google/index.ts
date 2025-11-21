import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface PlaceResult {
  place_id: string
  name: string
  rating?: number
  user_ratings_total?: number
  vicinity?: string
  photos?: Array<{
    photo_reference: string
    width: number
    height: number
  }>
  opening_hours?: {
    open_now?: boolean
  }
  business_status?: string
  types?: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

interface MinimalPlaceCard {
  place_id: string
  name: string
  rating: number
  user_ratings_total: number
  vicinity: string
  photo_reference?: string
  is_open: boolean
  types: string[]
  lat: number
  lng: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { lat, lng, radius = 5000, type = 'bar|night_club|restaurant' } = body

    // Log para debug (sem dados sensíveis)
    console.log('[fetch-places-google] Request recebido:', {
      hasLat: lat !== undefined,
      hasLng: lng !== undefined,
      radius,
      type
    })

    // Validar entrada
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const latNum = Number(lat)
    const lngNum = Number(lng)

    if (isNaN(latNum) || isNaN(lngNum)) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude devem ser números válidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (latNum < -90 || latNum > 90) {
      return new Response(
        JSON.stringify({ error: 'Latitude deve estar entre -90 e 90' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (lngNum < -180 || lngNum > 180) {
      return new Response(
        JSON.stringify({ error: 'Longitude deve estar entre -180 e 180' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter chave da API do Google
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada', details: 'Configure GOOGLE_MAPS_BACKEND_KEY nas variáveis de ambiente do Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // Processar tipos (pode ser combinado com |)
    const types = type.split('|').filter(t => t.trim())
    const allPlaces: MinimalPlaceCard[] = []
    const seenPlaceIds = new Set<string>()

    // Buscar cada tipo com paginação
    for (const placeType of types) {
      const typePlaces = await fetchPlacesWithPagination(
        latNum,
        lngNum,
        radius,
        placeType.trim(),
        apiKey,
        seenPlaceIds
      )
      allPlaces.push(...typePlaces)
      
      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`[fetch-places-google] Total de lugares únicos encontrados: ${allPlaces.length}`)

    // Persistir em cache híbrido (venues + locations)
    let savedCount = 0
    const errors: string[] = []

    for (const place of allPlaces) {
      try {
        // 1. Upsert em venues (tabela principal)
        const venueData = {
          google_place_id: place.place_id,
          name: place.name,
          description: place.vicinity || '',
          address: place.vicinity || '',
          city: extractCityFromVicinity(place.vicinity),
          state: extractStateFromVicinity(place.vicinity),
          latitude: place.lat,
          longitude: place.lng,
          category: mapTypesToCategory(place.types),
          is_adult: isAdultCategory(place.types),
          photos: place.photo_reference ? [place.photo_reference] : [],
          source: 'google',
          updated_at: new Date().toISOString()
        }

        const { error: venueError } = await supabaseClient
          .from('venues')
          .upsert(venueData, {
            onConflict: 'google_place_id',
            ignoreDuplicates: false
          })

        if (venueError) {
          errors.push(`Erro ao salvar venue ${place.name}: ${venueError.message}`)
          continue
        }

        // 2. Upsert em locations (para compatibilidade com hook atual)
        const locationData = {
          name: place.name,
          address: place.vicinity || '',
          category: mapTypesToCategory(place.types),
          type: mapTypesToCategory(place.types),
          description: place.vicinity || '',
          city: extractCityFromVicinity(place.vicinity),
          state: extractStateFromVicinity(place.vicinity),
          lat: place.lat,
          lng: place.lng,
          google_rating: place.rating,
          place_id: place.place_id,
          photos: place.photo_reference ? [place.photo_reference] : [],
          is_adult: isAdultCategory(place.types),
          last_synced: new Date().toISOString()
        }

        const { error: locationError } = await supabaseClient
          .from('locations')
          .upsert(locationData, {
            onConflict: 'place_id',
            ignoreDuplicates: false
          })

        if (locationError) {
          errors.push(`Erro ao salvar location ${place.name}: ${locationError.message}`)
        } else {
          savedCount++
        }

      } catch (error) {
        errors.push(`Erro ao processar ${place.name}: ${error.message}`)
      }
    }

    // Registrar cache desta busca
    const { error: cacheLogError } = await supabaseClient
      .from('search_cache_logs')
      .insert({
        latitude: latNum,
        longitude: lngNum,
        radius_meters: radius,
        search_type: types.join('|')
      })

    if (cacheLogError) {
      console.error('Erro ao registrar cache:', cacheLogError)
    }

    console.log(`[fetch-places-google] Salvos ${savedCount} lugares no banco`)

    return new Response(
      JSON.stringify({ 
        data: allPlaces,
        saved_count: savedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[fetch-places-google] Erro na função:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function fetchPlacesWithPagination(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  apiKey: string,
  seenPlaceIds: Set<string>
): Promise<MinimalPlaceCard[]> {
  const places: MinimalPlaceCard[] = []
  let nextPageToken: string | undefined = undefined
  let pageCount = 0
  const maxPages = 3 // Máximo 3 páginas (60 lugares) por tipo

  do {
    pageCount++
    
    // Construir URL da API
    const url = new URL(`${GOOGLE_PLACES_API_BASE}/nearbysearch/json`)
    url.searchParams.set('location', `${lat},${lng}`)
    url.searchParams.set('radius', Math.max(1, Math.min(50000, radius)).toString())
    url.searchParams.set('type', type)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('language', 'pt-BR')

    if (nextPageToken) {
      url.searchParams.set('pagetoken', nextPageToken)
      // Aguardar 2 segundos antes de usar o next_page_token (requisito da Google API)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`[fetch-places-google] Buscando página ${pageCount} para tipo ${type}`)

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 'ZERO_RESULTS') {
        console.log(`[fetch-places-google] ZERO_RESULTS para tipo ${type}`)
        break
      }

      if (data.status !== 'OK') {
        console.error(`[fetch-places-google] Google API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
        break
      }

      if (data.results && data.results.length > 0) {
        for (const result of data.results) {
          if (!seenPlaceIds.has(result.place_id)) {
            seenPlaceIds.add(result.place_id)
            
            const minimalPlace: MinimalPlaceCard = {
              place_id: result.place_id,
              name: result.name,
              rating: result.rating || 0,
              user_ratings_total: result.user_ratings_total || 0,
              vicinity: result.vicinity || '',
              photo_reference: result.photos?.[0]?.photo_reference,
              is_open: result.opening_hours?.open_now ?? (result.business_status === 'OPERATIONAL'),
              types: result.types || [],
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            }
            
            places.push(minimalPlace)
          }
        }
      }

      nextPageToken = data.next_page_token
      
      // Parar se não há mais páginas ou atingiu o limite
      if (!nextPageToken || pageCount >= maxPages) {
        break
      }

    } catch (error) {
      console.error(`[fetch-places-google] Erro ao buscar página ${pageCount}:`, error)
      break
    }
  } while (nextPageToken && pageCount < maxPages)

  console.log(`[fetch-places-google] Encontrados ${places.length} lugares únicos para tipo ${type}`)
  return places
}

function extractCityFromVicinity(vicinity?: string): string {
  if (!vicinity) return 'Desconhecido'
  const parts = vicinity.split(',')
  return parts[parts.length - 1]?.trim() || 'Desconhecido'
}

function extractStateFromVicinity(vicinity?: string): string {
  if (!vicinity) return 'Desconhecido'
  const parts = vicinity.split(',')
  return parts[parts.length - 2]?.trim() || 'Desconhecido'
}

function mapTypesToCategory(types: string[]): string {
  if (!types || types.length === 0) return 'bar'
  
  if (types.includes('night_club')) return 'club'
  if (types.includes('bar')) return 'bar'
  if (types.includes('restaurant')) return 'restaurant'
  if (types.includes('cafe')) return 'cafe'
  if (types.includes('shopping_mall')) return 'shopping'
  
  return 'bar'
}

function isAdultCategory(types: string[]): boolean {
  if (!types || types.length === 0) return false
  return types.includes('night_club') || types.includes('adult_entertainment')
}