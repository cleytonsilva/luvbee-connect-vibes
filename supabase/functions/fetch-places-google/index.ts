import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface GooglePlaceV1 {
  id: string
  displayName?: { text: string; languageCode: string }
  formattedAddress?: string
  priceLevel?: string // "PRICE_LEVEL_UNSPECIFIED", "PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"
  rating?: number
  userRatingCount?: number
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
  }>
  editorialSummary?: { text: string; languageCode: string }
  types?: string[]
}

interface MinimalPlaceCard {
  place_id: string
  name: string
  rating: number
  user_ratings_total: number
  vicinity: string
  photo_reference?: string // Stores the resource name (places/PLACE_ID/photos/PHOTO_ID)
  is_open: boolean
  types: string[]
  lat: number
  lng: number
  description?: string
  price_level?: number
}

// @ts-ignore
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { lat, lng, radius = 5000, type } = body

    // Log para debug
    console.log('[fetch-places-google] Request recebido (New API):', {
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

    // Obter chave da API do Google
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
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

    // Definir tipos incluídos (Included Types)
    // Se o usuário passou 'type', tentamos mapear ou usar o padrão "Vibe"
    let includedTypes: string[] = ['night_club', 'bar', 'restaurant', 'cafe', 'park', 'art_gallery']
    
    if (type && type.includes('solo')) {
        // Exemplo de ajuste para modo solo se necessário, ou manter a lista ampla e filtrar depois
        // Mas o prompt pede categorias específicas: Wine bars, Speakeasies, etc.
        // A API aceita tipos genéricos. Vamos manter a lista ampla do prompt.
    }

    // Buscar lugares
    const places = await fetchPlacesNewApi(
      latNum,
      lngNum,
      radius,
      includedTypes,
      apiKey
    )

    console.log(`[fetch-places-google] Total de lugares encontrados (filtro >= 4.0): ${places.length}`)

    // Persistir em cache híbrido (venues + locations)
    let savedCount = 0
    const errors: string[] = []

    for (const place of places) {
      try {
        // 1. Upsert em venues (tabela principal)
        const venueData = {
          google_place_id: place.place_id,
          name: place.name,
          description: place.description || place.vicinity || '',
          address: place.vicinity || '',
          city: extractCityFromAddress(place.vicinity),
          state: extractStateFromAddress(place.vicinity),
          latitude: place.lat,
          longitude: place.lng,
          category: mapTypesToCategory(place.types),
          is_adult: isAdultCategory(place.types),
          photos: place.photo_reference ? [place.photo_reference] : [],
          source: 'google_places_v1',
          google_place_data: place as any,
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

        // 2. Upsert em locations (para compatibilidade)
        const locationData = {
          name: place.name,
          address: place.vicinity || '',
          category: mapTypesToCategory(place.types),
          type: mapTypesToCategory(place.types), // Legado
          description: place.description || place.vicinity || '',
          city: extractCityFromAddress(place.vicinity),
          state: extractStateFromAddress(place.vicinity),
          lat: place.lat,
          lng: place.lng,
          google_rating: place.rating,
          google_user_ratings_total: place.user_ratings_total,
          place_id: place.place_id,
          photos: place.photo_reference ? [place.photo_reference] : [],
          is_adult: isAdultCategory(place.types),
          price_level: place.price_level,
          google_place_data: place as any,
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
        errors.push(`Erro ao processar ${place.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Registrar cache desta busca
    await supabaseClient
      .from('search_cache_logs')
      .insert({
        latitude: latNum,
        longitude: lngNum,
        radius_meters: radius,
        search_type: includedTypes.join('|')
      })

    return new Response(
      JSON.stringify({ 
        data: places,
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

async function fetchPlacesNewApi(
  lat: number,
  lng: number,
  radius: number,
  includedTypes: string[],
  apiKey: string
): Promise<MinimalPlaceCard[]> {
  const places: MinimalPlaceCard[] = []
  const maxPages = 1 // New API returns up to 20 results per page. Let's start with 1 page to save budget.
  
  // New API Payload
  const requestBody = {
    includedTypes: includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng
        },
        radius: Math.max(1, Math.min(50000, radius))
      }
    },
    // rankPreference: "POPULARITY" // Optional, depends on what we want. Distance is default? No, usually RELEVANCE.
    // New API supports 'POPULARITY' or 'DISTANCE'. 
    // Prompt says: "Ordene, se possível, por popularity ou rating."
    rankPreference: "POPULARITY" 
  }

  console.log('[fetch-places-google] Calling Google Places API (v1)...')

  try {
    const response = await fetch(GOOGLE_PLACES_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field Masking para otimizar budget
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.editorialSummary,places.types,places.location'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[fetch-places-google] Google API error: ${response.status} - ${errorText}`)
      throw new Error(`Google API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.places && data.places.length > 0) {
      for (const place of data.places as GooglePlaceV1[]) {
        // Curadoria Automática: minRating 4.0
        if ((place.rating || 0) < 4.0) {
            continue
        }

        const minimalPlace: MinimalPlaceCard = {
          place_id: place.id,
          name: place.displayName?.text || 'Desconhecido',
          rating: place.rating || 0,
          user_ratings_total: place.userRatingCount || 0,
          vicinity: place.formattedAddress || '',
          photo_reference: place.photos?.[0]?.name, // Resource Name (places/.../photos/...)
          is_open: true, // New API doesn't always return open_now in the basic fields without extra cost/fieldmask, assuming open or relying on other logic
          types: place.types || [],
          // @ts-ignore - place.location exists because we requested it in FieldMask
          lat: place.location?.latitude || 0, 
          // @ts-ignore
          lng: place.location?.longitude || 0,
          description: place.editorialSummary?.text || '',
          price_level: mapPriceLevel(place.priceLevel)
        }
        
        places.push(minimalPlace)
      }
    }

  } catch (error) {
    console.error('[fetch-places-google] Erro ao buscar lugares:', error)
  }

  return places
}

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

function extractCityFromAddress(address?: string): string {
  if (!address) return 'Desconhecido'
  const parts = address.split(',')
  // Heuristic: "Rua X, 123 - Bairro, Cidade - Estado"
  // Usually the second to last part is City, or City - State
  if (parts.length >= 2) {
      const cityState = parts[parts.length - 2].trim() // "Cidade - UF" or just "Cidade"
      // Try to split by hyphen if exists
      if (cityState.includes('-')) {
          return cityState.split('-')[0].trim()
      }
      return cityState
  }
  return 'Desconhecido'
}

function extractStateFromAddress(address?: string): string {
    if (!address) return 'Desconhecido'
    const parts = address.split(',')
    if (parts.length >= 1) {
        // Usually the last part contains the state or Country
        // Ex: "São Paulo - SP, 01000-000, Brasil" -> parts[last] is Brasil
        // Let's try to find a 2-letter state code in the address
        const match = address.match(/\b[A-Z]{2}\b/)
        if (match) return match[0]
    }
    return 'Desconhecido'
}

function mapTypesToCategory(types: string[]): string {
  if (!types || types.length === 0) return 'bar'
  
  if (types.includes('night_club')) return 'club'
  if (types.includes('bar')) return 'bar'
  if (types.includes('restaurant')) return 'restaurant'
  if (types.includes('cafe')) return 'cafe'
  if (types.includes('art_gallery')) return 'culture'
  if (types.includes('park')) return 'park'
  
  return 'bar'
}

function isAdultCategory(types: string[]): boolean {
  if (!types || types.length === 0) return false
  return types.includes('night_club') || types.includes('adult_entertainment')
}
