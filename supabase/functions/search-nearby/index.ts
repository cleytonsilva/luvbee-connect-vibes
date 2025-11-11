import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const { latitude, longitude, radius = 5000, type, keyword } = await req.json()

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir URL da API
    const url = new URL(`${GOOGLE_PLACES_API_BASE}/nearbysearch/json`)
    url.searchParams.set('location', `${latitude},${longitude}`)
    url.searchParams.set('radius', radius.toString())
    url.searchParams.set('key', apiKey)

    if (type) {
      url.searchParams.set('type', type)
    }

    if (keyword) {
      url.searchParams.set('keyword', keyword)
    }

    // Fazer requisição para Google Places API
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: data.results || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
