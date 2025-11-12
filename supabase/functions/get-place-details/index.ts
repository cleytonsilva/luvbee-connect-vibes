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

    // Validação rigorosa do place_id
    if (!place_id || typeof place_id !== 'string' || place_id.trim() === '') {
      console.error('[get-place-details] place_id inválido:', {
        place_id,
        type: typeof place_id,
        isEmpty: place_id === '',
        isWhitespace: place_id && place_id.trim() === '',
        receivedBody: body
      })
      return new Response(
        JSON.stringify({ 
          error: 'place_id é obrigatório e deve ser uma string não vazia',
          received: body 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter chave da API do ambiente (configurada como secret no Supabase)
    // Suporta tanto GOOGLE_MAPS_API_KEY quanto GOOGLE_MAPS_BACKEND_KEY
    // @ts-ignore - Deno.env is available in Deno runtime
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) {
      console.error('[get-place-details] Google Maps API key não configurada. Verifique as variáveis GOOGLE_MAPS_BACKEND_KEY ou GOOGLE_MAPS_API_KEY')
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key não configurada',
          details: 'Configure GOOGLE_MAPS_BACKEND_KEY ou GOOGLE_MAPS_API_KEY nas variáveis de ambiente do Supabase'
        }),
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
    console.log('[get-place-details] Buscando detalhes do Google Places:', {
      place_id,
      fields: Array.isArray(fields) ? fields.join(',') : fields,
      apiKeyPrefix: apiKey.substring(0, 10) + '...' // Log parcial da chave para debug
    })

    let response: Response
    let data: any

    try {
      response = await fetch(url.toString())
      
      // Verificar se a resposta HTTP foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[get-place-details] Erro HTTP do Google Places:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        return new Response(
          JSON.stringify({ 
            error: `Erro HTTP ao chamar Google Places API: ${response.status} ${response.statusText}`,
            details: errorText
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      data = await response.json()
    } catch (fetchError) {
      console.error('[get-place-details] Erro ao fazer requisição para Google Places:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      })
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao conectar com Google Places API',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log completo da resposta do Google para debug
    console.log('[get-place-details] Resposta completa do Google Places:', {
      status: data.status,
      hasResult: !!data.result,
      error_message: data.error_message,
      error_message_details: data.error_message ? data.error_message : 'Nenhum erro reportado',
      resultKeys: data.result ? Object.keys(data.result) : []
    })

    // Se o Google retornar um erro (ex: chave inválida, API desligada, quota excedida)
    if (data.status !== 'OK') {
      // Log detalhado do erro do Google no Supabase (visível nos logs do dashboard)
      console.error('[get-place-details] Erro do Google Places API:', {
        status: data.status,
        error_message: data.error_message,
        error_message_details: data.error_message || 'Mensagem de erro não fornecida pelo Google',
        fullResponse: JSON.stringify(data, null, 2)
      })

      // Retornar o erro real do Google para o frontend
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          error_message: data.error_message || 'Erro desconhecido do Google Places API',
          status: data.status,
          // Incluir detalhes adicionais se disponíveis
          ...(data.error_message ? { details: data.error_message } : {})
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Retornar apenas os dados do resultado
    console.log('[get-place-details] Sucesso! Retornando dados do Google Places')
    return new Response(
      JSON.stringify({ data: data.result || {} }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Log completo do erro não tratado (crash da função)
    console.error('[get-place-details] Erro não tratado (crash da função):', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Verifique os logs da Edge Function no Supabase Dashboard para mais detalhes'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

