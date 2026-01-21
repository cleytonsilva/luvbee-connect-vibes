
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import postgres from 'https://deno.land/x/postgresjs/mod.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    
    if (!query) {
       return new Response(JSON.stringify({ error: 'Query required' }), { status: 400, headers: corsHeaders })
    }

    // @ts-ignore
    const connectionString = Deno.env.get('SUPABASE_DB_URL')
    if (!connectionString) {
        throw new Error('SUPABASE_DB_URL not set')
    }

    // Use max: 1 to allow unsafe transactions and simple script execution
    const sql = postgres(connectionString, { max: 1 })
    
    const result = await sql.unsafe(query)
    
    await sql.end()

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
