
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        let photo_reference = url.searchParams.get('photo_reference')
        let place_id = url.searchParams.get('place_id')
        let maxwidth = url.searchParams.get('maxwidth') || '800'
        
        // Cache Buster (timestamp) to bypass browser cache if needed
        const t = url.searchParams.get('t');

        // Se não veio na URL, tenta pegar do corpo (apenas POST)
        if ((!photo_reference && !place_id) && req.method === 'POST') {
            try {
                const body = await req.json()
                photo_reference = body.photo_reference || body.photoReference
                place_id = body.place_id || body.placeId
                if (body.maxwidth || body.maxWidth) maxwidth = body.maxwidth || body.maxWidth
            } catch (e) {
                // Corpo vazio ou inválido, ignora
            }
        }

        console.log(`[cache-place-photo] Request: place_id=${place_id}, photo_ref=${photo_reference ? 'provided' : 'missing'}`)

        // 1. Setup Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[cache-place-photo] Supabase env vars missing')
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: {
                headers: { Authorization: req.headers.get('Authorization')! }
            }
        })

        // Validar usuário autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Check Cache in Database (Fast Path)
        if (place_id) {
            const { data: location } = await supabase
                .from('locations')
                .select('image_storage_path')
                .eq('place_id', place_id) // Assuming place_id column matches
                .single()

            if (location?.image_storage_path) {
                const { data: { publicUrl } } = supabase.storage
                    .from('places')
                    .getPublicUrl(location.image_storage_path)
                
                console.log(`[cache-place-photo] Cache Hit! Redirecting to: ${location.image_storage_path}`)
                
                // Redirect to storage URL
                return new Response(null, {
                    status: 307,
                    headers: {
                        ...corsHeaders,
                        'Location': publicUrl,
                        'Cache-Control': 'public, max-age=3600'
                    }
                })
            }
        }

        // 3. Prepare to Fetch from Google
        // @ts-ignore
        const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Google API Key not configured' }), { status: 500, headers: corsHeaders })
        }

        // If we have place_id but no photo_reference, fetch it first
        if (place_id && !photo_reference) {
            console.log(`[cache-place-photo] Fetching details for place_id: ${place_id}`)
            // Try New API (V1)
            const placeDetailsUrl = `https://places.googleapis.com/v1/places/${place_id}?fields=photos&key=${apiKey}`
            const placeResponse = await fetch(placeDetailsUrl)

            if (placeResponse.ok) {
                const placeData = await placeResponse.json()
                if (placeData?.photos && placeData.photos.length > 0) {
                    photo_reference = placeData.photos[0].name
                }
            } else {
                // Fallback Legacy
                const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=photos&key=${apiKey}`
                const legacyRes = await fetch(legacyUrl)
                if (legacyRes.ok) {
                    const legacyData = await legacyRes.json()
                    if (legacyData.result?.photos?.length > 0) {
                        photo_reference = legacyData.result.photos[0].photo_reference
                    }
                }
            }
        }

        if (!photo_reference) {
             return new Response(
                JSON.stringify({ error: 'Photo not found', details: 'No photo_reference provided and could not find one via place_id' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4. Fetch Image from Google
        let googleUrl = '';
        const maxHeight = url.searchParams.get('maxheight') || maxwidth;

        if (photo_reference.startsWith('places/')) {
            googleUrl = `https://places.googleapis.com/v1/${photo_reference}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxwidth}&key=${apiKey}`
        } else if (photo_reference.startsWith('http')) {
            googleUrl = photo_reference
        } else {
            googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&maxheight=${maxHeight}&photoreference=${photo_reference}&key=${apiKey}`
        }

        console.log(`[cache-place-photo] Fetching from Google...`)
        const googleRes = await fetch(googleUrl)

        if (googleRes.status !== 200 && googleRes.status !== 302) {
             const errorText = await googleRes.text();
             return new Response(JSON.stringify({ error: 'Google API Error', details: errorText }), { status: 400, headers: corsHeaders })
        }

        const blob = await googleRes.blob()
        const contentType = googleRes.headers.get('content-type') || 'image/jpeg'
        const ext = contentType.split('/')[1] || 'jpg'
        
        // 5. Upload to Supabase Storage
        if (place_id) {
            const fileName = `${place_id}/primary.${ext}` // Use fixed name 'primary' to easily overwrite/find
            console.log(`[cache-place-photo] Uploading to storage: ${fileName}`)
            
            const { error: uploadError } = await supabase.storage
                .from('places')
                .upload(fileName, blob, {
                    contentType: contentType,
                    upsert: true
                })

            if (uploadError) {
                console.warn('[cache-place-photo] Storage upload failed:', uploadError)
            } else {
                // 6. Update Database
                const { error: dbError } = await supabase
                    .from('locations')
                    .update({ image_storage_path: fileName })
                    .eq('place_id', place_id)

                // Also update venues if needed
                 await supabase
                    .from('venues')
                    .update({ image_storage_path: fileName })
                    .eq('google_place_id', place_id)
                
                if (dbError) {
                     console.warn('[cache-place-photo] DB update failed:', dbError)
                } else {
                    console.log('[cache-place-photo] Cache updated successfully')
                }
            }
        }

        // 7. Return Image
        return new Response(blob, {
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        })

    } catch (error) {
        console.error('[cache-place-photo] Internal Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
