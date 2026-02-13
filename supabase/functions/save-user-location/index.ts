// @ts-ignore - Deno runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: Save User Location
 * 
 * Salva a interação do usuário com um lugar (like/pass)
 * - Busca ou cria o location na tabela locations
 * - Salva na user_locations com location_id correto
 * - Usa service_role para bypass de RLS
 */

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  try {
    const body = await req.json();
    const { user_id, google_place_id, status, place_data } = body;

    // Validação dos campos obrigatórios
    if (!user_id || !google_place_id || !status) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['user_id', 'google_place_id', 'status']
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validar status
    const validStatuses = ['liked', 'passed', 'saved'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid status',
          validStatuses
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Criar cliente com service_role para bypass de RLS
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================================
    // PASSO 1: Buscar ou criar o location na tabela locations
    // =====================================================================
    
    let location_id: string | null = null;
    
    // 1.1 Tentar encontrar location existente pelo google_place_id
    const { data: existingLocation, error: findError } = await supabase
      .from('locations')
      .select('id, google_place_id')
      .eq('google_place_id', google_place_id)
      .maybeSingle();

    if (findError) {
      console.error('[save-user-location] Error finding location:', findError);
    }

    if (existingLocation?.id) {
      // Location já existe, usar o ID
      location_id = existingLocation.id;
      console.log('[save-user-location] Found existing location:', location_id);
    } else if (place_data) {
      // 1.2 Location não existe, criar novo a partir dos dados do Google Places
      console.log('[save-user-location] Creating new location for:', google_place_id);
      
      const newLocationData = {
        google_place_id: google_place_id,
        name: place_data.name || 'Unknown Location',
        address: place_data.formatted_address || place_data.address || 'Address not available',
        category: place_data.category || place_data.primary_type || place_data.types?.[0] || 'local',
        type: place_data.primary_type || place_data.types?.[0] || 'local',
        latitude: place_data.geometry?.location?.lat || place_data.lat || null,
        longitude: place_data.geometry?.location?.lng || place_data.lng || null,
        rating: place_data.rating || 0,
        price_level: place_data.price_level || null,
        phone: place_data.phone || null,
        website: place_data.website || null,
        photo_url: place_data.photos?.[0]?.photo_reference || null,
        images: place_data.photos?.map((p: any) => p.photo_reference).filter(Boolean) || [],
        opening_hours: place_data.opening_hours || {},
        google_places_data: place_data,
        is_active: true,
        is_verified: false,
        is_curated: false,
      };

      const { data: newLocation, error: createError } = await supabase
        .from('locations')
        .insert(newLocationData)
        .select('id')
        .single();

      if (createError) {
        // Se der erro de unique constraint, tentar buscar novamente
        if (createError.code === '23505') {
          const { data: retryLocation } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', google_place_id)
            .maybeSingle();
          
          if (retryLocation?.id) {
            location_id = retryLocation.id;
            console.log('[save-user-location] Found location after retry:', location_id);
          }
        } else {
          console.error('[save-user-location] Error creating location:', createError);
          // Continuar mesmo sem location_id - a tabela user_locations aceita NULL
        }
      } else if (newLocation?.id) {
        location_id = newLocation.id;
        console.log('[save-user-location] Created new location:', location_id);
      }
    }

    // =====================================================================
    // PASSO 2: Inserir ou atualizar na tabela user_locations
    // =====================================================================
    
    const upsertData: any = {
      user_id: user_id,
      google_place_id: google_place_id,
      status: status,
      place_data: place_data || null,
      updated_at: new Date().toISOString(),
    };

    // Só adicionar location_id se foi encontrado/criado
    if (location_id) {
      upsertData.location_id = location_id;
    }

    const { data, error } = await supabase
      .from('user_locations')
      .upsert(upsertData, { 
        onConflict: 'user_id,google_place_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[save-user-location] Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          details: error.message,
          code: error.code
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // =====================================================================
    // PASSO 3: Se for um 'like', também criar um location_match
    // =====================================================================
    
    if (status === 'liked' && location_id) {
      const { error: matchError } = await supabase
        .from('location_matches')
        .upsert({
          user_id: user_id,
          location_id: location_id,
          status: 'active',
          matched_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,location_id',
          ignoreDuplicates: true
        });

      if (matchError) {
        // Log mas não falhar - location_matches é opcional
        console.warn('[save-user-location] Could not create location_match:', matchError.message);
      } else {
        console.log('[save-user-location] Created location_match for user:', user_id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: data,
        location_id: location_id,
        message: location_id 
          ? 'Location saved with location_id' 
          : 'Location saved without location_id (will be synced later)'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('[save-user-location] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});
