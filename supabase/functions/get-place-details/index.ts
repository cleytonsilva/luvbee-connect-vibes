// @ts-ignore - Deno runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: Get Google Places Details
 * 
 * Esta função proxy protege a chave da API Google Maps,
 * evitando exposição no bundle JavaScript do frontend e problemas de CORS.
 * 
 * Suporta POST (body):
 * POST: { place_id: '...', fields: ['photos'] }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  // Permitir apenas POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    let body: any
    try {
      body = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Body inválido ou ausente', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { place_id, fields = ['photos'] } = body

    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter chave da API do ambiente (configurada como secret no Supabase)
    // @ts-ignore - Deno.env is available in Deno runtime
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construir URL da API do Google Places
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', place_id)
    url.searchParams.set('fields', Array.isArray(fields) ? fields.join(',') : fields)
    url.searchParams.set('key', apiKey)

    // Fazer requisição para Google Places API
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          error_message: data.error_message || 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retornar apenas os dados do resultado
    return new Response(
      JSON.stringify({ data: data.result || {} }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

