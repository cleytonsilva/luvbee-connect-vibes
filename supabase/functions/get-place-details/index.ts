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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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
      console.error('[get-place-details] Erro ao parsear body:', error)
      return new Response(
        JSON.stringify({ error: 'Body inválido ou ausente', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-place-details] Body recebido:', JSON.stringify(body))

    const { place_id, fields = ['photos'] } = body

    if (!place_id) {
      console.error('[get-place-details] place_id ausente no body')
      return new Response(
        JSON.stringify({ error: 'place_id é obrigatório', received: body }),
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
    console.log('[get-place-details] Buscando detalhes do Google Places para place_id:', place_id)
    const response = await fetch(url.toString())
    const data = await response.json()

    console.log('[get-place-details] Resposta do Google Places:', { status: data.status, hasResult: !!data.result })

    if (data.status !== 'OK') {
      console.error('[get-place-details] Erro do Google Places:', data.status, data.error_message)
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

