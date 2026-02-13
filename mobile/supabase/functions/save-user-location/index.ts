// save-user-location/index.ts
// Edge Function para salvar like/pass sem problemas de RLS

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, google_place_id, status, place_data } = await req.json()

    if (!user_id || !google_place_id || !status) {
      return new Response(
        JSON.stringify({ error: 'user_id, google_place_id e status são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Supabase não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar se o lugar já existe
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('google_place_id', google_place_id)
      .maybeSingle()

    let locationId: string

    if (existingLocation) {
      locationId = existingLocation.id
      console.log('✅ Location existente:', locationId)
    } else if (place_data) {
      // Criar novo location
      const { data: newLocation, error: insertError } = await supabase
        .from('locations')
        .insert({
          google_place_id: google_place_id,
          name: place_data.name,
          type: place_data.category || place_data.types?.[0] || 'local',
          address: place_data.formatted_address,
          rating: place_data.rating?.toString() || null,
          price_level: place_data.price_level || null,
          lat: place_data.geometry?.location?.lat?.toString() || null,
          lng: place_data.geometry?.location?.lng?.toString() || null,
          description: place_data.description || null,
          google_place_data: place_data,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('❌ Erro ao criar location:', insertError)
        throw insertError
      }

      locationId = newLocation.id
      console.log('✅ Novo location:', locationId)
    } else {
      return new Response(
        JSON.stringify({ error: 'Lugar não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Salvar like/pass
    const { error: upsertError } = await supabase
      .from('user_locations')
      .upsert({
        user_id: user_id,
        location_id: locationId,
        status: status,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,location_id' })

    if (upsertError) {
      console.error('❌ Erro ao salvar:', upsertError)
      throw upsertError
    }

    console.log(`✅ ${status === 'liked' ? 'Like' : 'Pass'} salvo`)

    return new Response(
      JSON.stringify({ success: true, location_id: locationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
