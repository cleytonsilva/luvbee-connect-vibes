// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
  try {
    const body = await req.json()
    const placeId: string = body.place_id || body.placeId || ''
    const photoRef: string | undefined = body.photo_reference || body.photoreference
    const imageUrlInput: string | undefined = body.image_url || body.imageUrl
    const maxWidth: number = Number(body.maxWidth || body.maxwidth || 800)

    if (!placeId || typeof placeId !== 'string') {
      return new Response(JSON.stringify({ error: 'place_id inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Supabase não configurado' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const bucket = 'div'
    const basePath = `places/${placeId}`

    const existing = await supabase.storage.from(bucket).list(basePath)
    if (existing.data && existing.data.length > 0) {
      const filePath = `${basePath}/${existing.data[0].name}`
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      return new Response(JSON.stringify({ imageUrl: publicUrl }), { 
        status: 200, 
        headers: { 
          ...cors, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache por 1 hora para reduzir requisições repetidas
        } 
      })
    }

    let imageBlob: Blob | null = null

    if (imageUrlInput && typeof imageUrlInput === 'string' && imageUrlInput.startsWith('http')) {
      const r = await fetch(imageUrlInput, { headers: { 'Accept': 'image/*' } })
      if (!r.ok) {
        return new Response(JSON.stringify({ error: `Falha ao baixar imagem direta: ${r.status}` }), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
      imageBlob = await r.blob()
    } else {
      let finalPhotoRef = photoRef
      const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!finalPhotoRef) {
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Google Maps API key não configurada' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.set('place_id', placeId)
        detailsUrl.searchParams.set('fields', 'photos')
        detailsUrl.searchParams.set('key', apiKey)
        const dr = await fetch(detailsUrl.toString())
        if (!dr.ok) {
          const txt = await dr.text()
          return new Response(JSON.stringify({ error: `Erro ao obter detalhes: ${dr.status}`, details: txt }), { status: dr.status, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        const dj = await dr.json()
        finalPhotoRef = dj?.result?.photos?.[0]?.photo_reference || undefined
        if (!finalPhotoRef) {
          return new Response(JSON.stringify({ error: 'Sem photo_reference' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
      }

      const oauth = Deno.env.get('GOOGLE_OAUTH_ACCESS_TOKEN')
      if (oauth) {
        const name = `places/${placeId}/photos/${finalPhotoRef}/media`
        const mediaUrl = `https://places.googleapis.com/v1/${name}?maxWidthPx=${Math.min(Math.max(1, maxWidth), 4800)}&skipHttpRedirect=true`
        const mr = await fetch(mediaUrl, { headers: { 'Authorization': `Bearer ${oauth}` } })
        if (mr.ok) {
          const mj = await mr.json()
          if (mj?.photoUri) {
            const pr = await fetch(mj.photoUri)
            if (!pr.ok) {
              return new Response(JSON.stringify({ error: `Falha ao baixar photoUri: ${pr.status}` }), { status: pr.status, headers: { ...cors, 'Content-Type': 'application/json' } })
            }
            imageBlob = await pr.blob()
          }
        }
      }

      if (!imageBlob) {
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Google Maps API key não configurada' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${Math.min(Math.max(1, maxWidth), 4800)}&photoreference=${finalPhotoRef}&key=${apiKey}`
        const pr = await fetch(photoUrl, { headers: { 'Accept': 'image/*' } })
        if (!pr.ok) {
          const txt = await pr.text().catch(() => '')
          return new Response(JSON.stringify({ error: `Erro ao baixar foto: ${pr.status}`, details: txt }), { status: pr.status, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        imageBlob = await pr.blob()
      }
    }

    if (!imageBlob || !(imageBlob.type || '').startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Imagem inválida' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const fileName = `${Date.now()}.jpg`
    const filePath = `${basePath}/${fileName}`
    const file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' })
    const up = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (up.error) {
      if (String(up.error.message || '').includes('exists')) {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
        return new Response(JSON.stringify({ imageUrl: publicUrl }), { 
        status: 200, 
        headers: { 
          ...cors, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache por 1 hora para reduzir requisições repetidas
        } 
      })
      }
      return new Response(JSON.stringify({ error: up.error.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    await supabase.from('cached_place_photos').insert({ place_id: placeId, photo_reference: (typeof photoRef === 'string' ? photoRef : null), storage_path: filePath, public_url: publicUrl })
    return new Response(JSON.stringify({ imageUrl: publicUrl }), { 
      status: 200, 
      headers: { 
        ...cors, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache por 1 hora para reduzir requisições repetidas
      } 
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro interno' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
