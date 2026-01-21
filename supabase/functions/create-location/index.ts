import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar cliente Supabase com service role para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar token do usuário
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obter dados do body
    const locationData = await req.json()

    // Validar campos obrigatórios com mensagem mais detalhada
    const missingFields = []
    if (!locationData.name) missingFields.push('name')
    if (!locationData.address) missingFields.push('address')
    if (!locationData.type) missingFields.push('type')
    if (locationData.lat === undefined || locationData.lat === null) missingFields.push('lat')
    if (locationData.lng === undefined || locationData.lng === null) missingFields.push('lng')

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          received: {
            name: locationData.name,
            address: locationData.address,
            type: locationData.type,
            lat: locationData.lat,
            lng: locationData.lng,
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se já existe por place_id
    if (locationData.place_id) {
      const { data: existing } = await supabaseAdmin
        .from('locations')
        .select('*')
        .eq('place_id', locationData.place_id)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ data: existing }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Criar local
    const { data, error } = await supabaseAdmin
      .from('locations')
      .insert({
        name: locationData.name,
        address: locationData.address,
        type: locationData.type,
        place_id: locationData.place_id || null,
        lat: Number(locationData.lat),
        lng: Number(locationData.lng),
        city: locationData.city || null, // Cidade extraída do endereço
        state: locationData.state || null, // Estado extraído do endereço
        rating: locationData.rating ? Number(locationData.rating) : 0,
        price_level: locationData.price_level ? Number(locationData.price_level) : 1,
        image_url: locationData.image_url || '',
        peak_hours: locationData.peak_hours || [0, 0, 0, 0, 0],
        google_rating: locationData.google_rating ? Number(locationData.google_rating) : null,
        google_place_data: locationData.google_place_data || null,
        is_active: true, // IMPORTANTE: Sempre ativar locais recém-criados
      })
      .select('*')
      .single()

    if (error) {
      // Se já existe (unique constraint), buscar o existente
      if (error.code === '23505' && locationData.place_id) {
        const { data: existing } = await supabaseAdmin
          .from('locations')
          .select('*')
          .eq('place_id', locationData.place_id)
          .maybeSingle()

        if (existing) {
          return new Response(
            JSON.stringify({ data: existing }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
