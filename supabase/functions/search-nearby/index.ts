// @ts-ignore - Deno runtime types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// @ts-ignore - serve is available in Deno runtime
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    let body: any
    try {
      const bodyText = await req.text()
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Body vazio' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      body = JSON.parse(bodyText)
    } catch (error) {
      console.error('[search-nearby] Erro ao parsear body:', error)
      return new Response(
        JSON.stringify({ error: 'Body inválido ou ausente', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { latitude, longitude, radius = 5000, type, keyword } = body

    // Log para debug (sem dados sensíveis)
    console.log('[search-nearby] Request recebido:', {
      hasLatitude: latitude !== undefined,
      hasLongitude: longitude !== undefined,
      radius,
      type,
      hasKeyword: keyword !== undefined
    })

    // Validar tipos e valores
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude são obrigatórios', received: { latitude, longitude } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const latNum = Number(latitude)
    const lngNum = Number(longitude)

    if (isNaN(latNum) || isNaN(lngNum)) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude devem ser números válidos', received: { latitude, longitude, latNum, lngNum } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (latNum < -90 || latNum > 90) {
      return new Response(
        JSON.stringify({ error: 'Latitude deve estar entre -90 e 90', received: latNum }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (lngNum < -180 || lngNum > 180) {
      return new Response(
        JSON.stringify({ error: 'Longitude deve estar entre -180 e 180', received: lngNum }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore - Deno.env is available in Deno runtime
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir URL da API
    const url = new URL(`${GOOGLE_PLACES_API_BASE}/nearbysearch/json`)
    url.searchParams.set('location', `${latNum},${lngNum}`)
    url.searchParams.set('radius', Math.max(1, Math.min(50000, Number(radius) || 5000)).toString())
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
