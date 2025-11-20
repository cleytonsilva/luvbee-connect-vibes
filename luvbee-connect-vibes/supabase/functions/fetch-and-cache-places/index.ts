import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lng, radius = 5000, type = 'normal', force_refresh = false } = await req.json()
    
    if (!lat || !lng) {
      throw new Error('Latitude e longitude são obrigatórias')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // Check if we have recent cache for this area
    if (!force_refresh) {
      const { data: cacheData, error: cacheError } = await supabaseClient
        .rpc('check_search_cache', {
          lat,
          long: lng,
          radius_meters: radius,
          search_type: type,
          max_age_days: 30
        })

      if (cacheError) {
        console.error('Erro ao verificar cache:', cacheError)
      } else if (cacheData) {
        console.log('Cache válido encontrado para esta região')
        return new Response(
          JSON.stringify({ 
            message: 'Cache válido', 
            cached: true,
            places_count: 0 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    // Buscar locais do Google Places API
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!googleApiKey) {
      throw new Error('Google Maps API key não configurada')
    }

    // Definir tipos de lugares baseado no modo
    const placeTypes = type === 'adult' 
      ? ['bar', 'night_club', 'adult_entertainment']
      : ['bar', 'night_club', 'restaurant', 'cafe', 'shopping_mall']

    const allPlaces = []
    
    // Buscar cada tipo de lugar
    for (const placeType of placeTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${placeType}&key=${googleApiKey}&language=pt-BR`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 'OK' && data.results) {
        allPlaces.push(...data.results)
      } else {
        console.warn(`Google API retornou status ${data.status} para tipo ${placeType}`)
      }
      
      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`Encontrados ${allPlaces.length} lugares no Google`)

    // Processar e salvar lugares no banco
    let savedCount = 0
    const errors = []

    for (const place of allPlaces) {
      try {
        // Extrair cidade e estado do endereço
        const addressParts = place.vicinity?.split(',') || []
        const city = addressParts[addressParts.length - 1]?.trim() || 'Desconhecido'
        const state = addressParts[addressParts.length - 2]?.trim() || 'Desconhecido'
        
        // Determinar categoria e se é adulto
        let category = 'bar'
        let is_adult = false
        
        if (place.types) {
          if (place.types.includes('night_club')) {
            category = 'club'
            is_adult = type === 'adult'
          } else if (place.types.includes('bar')) {
            category = 'bar'
          } else if (place.types.includes('restaurant')) {
            category = 'restaurant'
          } else if (place.types.includes('adult_entertainment')) {
            category = 'adult_club'
            is_adult = true
          }
        }

        // Preparar dados para upsert
        const locationData = {
          name: place.name,
          description: place.vicinity || '',
          address: place.vicinity || '',
          city: city,
          state: state,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          type: category,
          is_adult: is_adult,
          google_rating: place.rating || 0,
          place_id: place.place_id,
          photos: place.photos ? place.photos.map(p => p.photo_reference) : [],
          last_synced: new Date().toISOString()
        }

        // Upsert no banco
        const { error: upsertError } = await supabaseClient
          .from('locations')
          .upsert(locationData, {
            onConflict: 'place_id',
            ignoreDuplicates: false
          })

        if (upsertError) {
          errors.push(`Erro ao salvar ${place.name}: ${upsertError.message}`)
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
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
        search_type: type
      })

    if (cacheLogError) {
      console.error('Erro ao registrar cache:', cacheLogError)
    }

    console.log(`Salvos ${savedCount} lugares no banco`)

    return new Response(
      JSON.stringify({ 
        message: 'Busca e cache concluídos',
        cached: false,
        places_count: savedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro na função fetch-and-cache-places:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        cached: false,
        places_count: 0 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})