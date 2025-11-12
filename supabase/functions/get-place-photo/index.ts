// @ts-ignore - Deno runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: Get Google Places Photo
 * 
 * Esta função proxy protege a chave da API Google Maps,
 * evitando exposição no bundle JavaScript do frontend.
 * 
 * Suporta GET (query params) e POST (body):
 * GET: /functions/v1/get-place-photo?photoreference=...&maxwidth=400
 * POST: { photoreference: '...', maxwidth: 400 }
 */

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
      }
    })
  }

  // Permitir GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    let photoreference: string
    let maxwidth: number = 400

    if (req.method === 'GET') {
      // Obter parâmetros da query string
      const url = new URL(req.url)
      photoreference = url.searchParams.get('photoreference') || ''
      const maxwidthParam = url.searchParams.get('maxwidth')
      if (maxwidthParam) {
        maxwidth = parseInt(maxwidthParam, 10) || 400
      }
    } else {
      // Obter parâmetros do body (POST)
      const body = await req.json()
      photoreference = body.photoreference || ''
      maxwidth = body.maxwidth || 400
    }

    if (!photoreference) {
      return new Response(
        JSON.stringify({ error: 'photoreference é obrigatório' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
          }
        }
      )
    }

    // Obter chave da API do ambiente (configurada como secret no Supabase)
    // Suporta tanto GOOGLE_MAPS_BACKEND_KEY quanto GOOGLE_MAPS_API_KEY
    // @ts-ignore - Deno.env is available in Deno runtime
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) {
      console.error('[get-place-photo] Google Maps API key não configurada. Verifique as variáveis GOOGLE_MAPS_BACKEND_KEY ou GOOGLE_MAPS_API_KEY')
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key não configurada',
          details: 'Configure GOOGLE_MAPS_BACKEND_KEY ou GOOGLE_MAPS_API_KEY nas variáveis de ambiente do Supabase'
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
          }
        }
      )
    }

    // Fazer requisição para Google Places Photo API
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoreference}&key=${apiKey}`
    
    console.log('[get-place-photo] Buscando foto do Google Places:', {
      photoreference: photoreference.substring(0, 20) + '...',
      maxwidth,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    })
    
    const response = await fetch(photoUrl)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      console.error('[get-place-photo] Erro ao buscar foto:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar foto do Google Places',
          details: `HTTP ${response.status}: ${response.statusText}`
        }),
        { 
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
          }
        }
      )
    }

    // Retornar a imagem diretamente
    const imageBlob = await response.blob()
    
    return new Response(imageBlob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
      }
    })
  } catch (error) {
    console.error('[get-place-photo] Erro não tratado:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
        }
      }
    )
  }
})

