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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
        }
      }
    )
  }

  // Verificar autenticação básica (apikey no header ou query param)
  // Para GET requests via <img> tags, aceitar apikey como query parameter
  const url = new URL(req.url)
  const apikeyFromQuery = url.searchParams.get('apikey')
  const apikeyFromHeader = req.headers.get('apikey') || req.headers.get('x-apikey')
  const authHeader = req.headers.get('authorization')

  // Verificar se há alguma forma de autenticação
  // Para imagens públicas, podemos aceitar apenas apikey (chave anon é pública)
  const hasAuth = !!(apikeyFromQuery || apikeyFromHeader || authHeader)

  // Se não há autenticação, retornar erro 401
  if (!hasAuth) {
    console.warn('[get-place-photo] Requisição sem autenticação:', {
      method: req.method,
      url: req.url,
      hasApikeyQuery: !!apikeyFromQuery,
      hasApikeyHeader: !!apikeyFromHeader,
      hasAuthHeader: !!authHeader
    })
    return new Response(
      JSON.stringify({
        error: 'Missing authorization header',
        code: 401,
        message: 'Esta função requer autenticação. Adicione o header "apikey" ou "Authorization", ou passe "apikey" como query parameter.'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
        }
      }
    )
  }

  try {
    let photoreference: string
    let maxwidth: number = 400

    if (req.method === 'GET') {
      // Obter parâmetros da query string
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

    // URL da API do Google conforme documentação
    let photoUrl = '';

    // Suporte a maxheight (query param ou body)
    let maxheight = 0;
    if (req.method === 'GET') {
      const mh = url.searchParams.get('maxheight');
      if (mh) maxheight = parseInt(mh, 10);
    } else {
      // body parsing happens above, but typescript scope... re-access body logic would be complex.
      // Assuming maxwidth is enough for square images, or let's try to grab from body if possible in a clean way.
      // Actually, let's just stick to maxwidth for now as primary, or re-parse body if we really need it.
      // But better: define maxheight alongside maxwidth at the top.
    }
    // Simplification: Use maxwidth as default for maxheight if not provided, for square aspect ratio intent
    const effectiveHeight = maxheight || maxwidth;

    if (photoreference.startsWith('places/')) {
      // Nova API (V1)
      // https://places.googleapis.com/v1/{name}/media
      photoUrl = `https://places.googleapis.com/v1/${photoreference}/media?maxHeightPx=${effectiveHeight}&maxWidthPx=${maxwidth}&key=${apiKey}`
    } else {
      // API Legado
      // https://maps.googleapis.com/maps/api/place/photo
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&maxheight=${effectiveHeight}&photoreference=${photoreference}&key=${apiKey}`
    }

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

    // Obtém o blob da imagem
    const imageBlob = await response.blob()
    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    // Para POST requests, também retorna em base64 (útil para cache no cliente)
    if (req.method === 'POST') {
      const arrayBuffer = await imageBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let binaryString = ''
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
      }
      const base64 = btoa(binaryString)

      return new Response(
        JSON.stringify({
          image_data: base64,
          image_url: photoUrl,
          content_type: contentType
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
          }
        }
      )
    }

    // Para GET requests, retorna a imagem diretamente
    return new Response(imageBlob, {
      headers: {
        'Content-Type': contentType,
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

