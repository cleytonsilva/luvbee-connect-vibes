import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: Get Google Places Photo
 * 
 * Esta função proxy protege a chave da API Google Maps,
 * evitando exposição no bundle JavaScript do frontend.
 * 
 * Uso:
 * const { data } = await supabase.functions.invoke('get-place-photo', {
 *   body: { photoreference: '...', maxwidth: 400 }
 * })
 */

Deno.serve(async (req: Request) => {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const { photoreference, maxwidth = 400 } = await req.json()

    if (!photoreference) {
      return new Response(
        JSON.stringify({ error: 'photoreference é obrigatório' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Obter chave da API do ambiente (configurada como secret no Supabase)
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Fazer requisição para Google Places Photo API
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoreference}&key=${apiKey}`
    
    const response = await fetch(photoUrl)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar foto do Google Places' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar a imagem diretamente
    const imageBlob = await response.blob()
    
    return new Response(imageBlob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

