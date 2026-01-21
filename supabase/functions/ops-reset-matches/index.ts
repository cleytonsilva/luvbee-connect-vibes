
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔄 Cleaning up location matches and rejections...')

    // Clear location_matches
    const { error: matchesError, count: matchesCount } = await supabaseClient
      .from('location_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (matchesError) {
      console.error('❌ Error clearing location_matches:', matchesError.message)
      throw matchesError
    }

    // Clear location_rejections
    const { error: rejectionsError, count: rejectionsCount } = await supabaseClient
      .from('location_rejections')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (rejectionsError) {
      console.error('❌ Error clearing location_rejections:', rejectionsError.message)
      throw rejectionsError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Reset successful', 
        details: 'Cleared location_matches and location_rejections' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
