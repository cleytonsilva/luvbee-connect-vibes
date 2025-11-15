// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-internal-secret, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
} as const

// Security controls
const INTERNAL_SECRET_HEADER = 'x-internal-secret'
const INTERNAL_ALLOWED_ORIGINS = (Deno.env.get('EDGE_FUNCTION_ALLOWED_ORIGINS') || 'https://luvbee.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const INTERNAL_SECRET = Deno.env.get('EDGE_FUNCTION_INTERNAL_SECRET') || ''
const MAX_IMAGE_BYTES = Number(Deno.env.get('CACHE_PHOTO_MAX_BYTES') || 5 * 1024 * 1024)
const MAX_WIDTH_LIMIT = Number(Deno.env.get('CACHE_PHOTO_MAX_WIDTH') || 1600)

const normalizeOrigin = (rawOrigin: string | null) => {
  if (!rawOrigin) return null
  try {
    return new URL(rawOrigin).origin
  } catch (_error) {
    return rawOrigin
  }
}

const getResponseHeaders = (origin?: string | null) => ({
  ...BASE_CORS_HEADERS,
  'Access-Control-Allow-Origin': origin || INTERNAL_ALLOWED_ORIGINS[0] || 'https://luvbee.app'
})

const buildJsonResponse = (status: number, payload: Record<string, unknown>, origin?: string | null) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...getResponseHeaders(origin), 'Content-Type': 'application/json' }
  })

const resolveAllowedOrigin = (req: Request) => {
  const originHeader = normalizeOrigin(req.headers.get('origin'))
  if (originHeader && INTERNAL_ALLOWED_ORIGINS.includes(originHeader)) {
    return originHeader
  }
  const refererHeader = normalizeOrigin(req.headers.get('referer'))
  if (refererHeader && INTERNAL_ALLOWED_ORIGINS.includes(refererHeader)) {
    return refererHeader
  }
  return null
}

const timingSafeEqual = (a: string, b: string) => {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  if (aBytes.length !== bBytes.length) {
    return false
  }
  return crypto.subtle.timingSafeEqual(aBytes, bBytes)
}

const auditLog = (message: string, metadata: Record<string, unknown> = {}) => {
  const entry = {
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  }
  console.log(JSON.stringify(entry))
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const allowedOrigin = resolveAllowedOrigin(req)
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: getResponseHeaders(allowedOrigin) })
  if (req.method !== 'POST') {
    auditLog('cache-place-photo: método inválido bloqueado', { requestId, method: req.method })
    return buildJsonResponse(405, { error: 'Method not allowed' }, allowedOrigin)
  }

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    auditLog('cache-place-photo: conteúdo rejeitado', { requestId, contentType })
    return buildJsonResponse(415, { error: 'Unsupported Media Type' }, allowedOrigin)
  }

  if (!allowedOrigin) {
    auditLog('cache-place-photo: origem não autorizada', {
      requestId,
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer')
    })
    return buildJsonResponse(403, { error: 'Forbidden' }, allowedOrigin)
  }

  const authHeader = req.headers.get('authorization')
  const providedSecret = req.headers.get(INTERNAL_SECRET_HEADER)

  if (!authHeader && !(INTERNAL_SECRET && providedSecret)) {
    auditLog('cache-place-photo: requisição sem credencial bloqueada', { requestId })
    return buildJsonResponse(401, { error: 'Unauthorized' }, allowedOrigin)
  }

  let secretValid = false
  if (INTERNAL_SECRET && providedSecret) {
    secretValid = await timingSafeEqual(INTERNAL_SECRET, providedSecret)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    auditLog('cache-place-photo: configuração supabase ausente', { requestId })
    return buildJsonResponse(500, { error: 'Supabase não configurado' }, allowedOrigin)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  if (!secretValid && authHeader) {
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      auditLog('cache-place-photo: token vazio recebido', { requestId })
      return buildJsonResponse(401, { error: 'Unauthorized' }, allowedOrigin)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      auditLog('cache-place-photo: token inválido', { requestId, error: authError?.message })
      return buildJsonResponse(401, { error: 'Unauthorized' }, allowedOrigin)
    }
  } else if (!secretValid) {
    auditLog('cache-place-photo: segredo interno inválido', { requestId })
    return buildJsonResponse(401, { error: 'Unauthorized' }, allowedOrigin)
  }

  try {
    const body = await req.json()
    const placeId: string = body.place_id || body.placeId || ''
    const photoRef: string | undefined = body.photo_reference || body.photoreference
    const imageUrlInput: string | undefined = body.image_url || body.imageUrl
    const requestedWidth: number = Number(body.maxWidth || body.maxwidth || 800)
    const maxWidth = Math.min(Math.max(1, requestedWidth), MAX_WIDTH_LIMIT)
    auditLog('cache-place-photo: requisição recebida', { requestId, placeId, photoRef: photoRef || null, maxWidth })

    if (!placeId || typeof placeId !== 'string') {
      return buildJsonResponse(400, { error: 'place_id inválido' }, allowedOrigin)
    }

    const bucket = 'div'
    const basePath = `places/${placeId}`

    const existing = await supabase.storage.from(bucket).list(basePath)
    if (existing.data && existing.data.length > 0) {
      const filePath = `${basePath}/${existing.data[0].name}`
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      return buildJsonResponse(200, { imageUrl: publicUrl }, allowedOrigin)
    }

    let imageBlob: Blob | null = null

    if (imageUrlInput && typeof imageUrlInput === 'string' && imageUrlInput.startsWith('http')) {
      const r = await fetch(imageUrlInput, { headers: { 'Accept': 'image/*' } })
      if (!r.ok) {
        auditLog('cache-place-photo: download direto falhou', { requestId, status: r.status })
        return buildJsonResponse(r.status, { error: `Falha ao baixar imagem direta: ${r.status}` }, allowedOrigin)
      }
      imageBlob = await r.blob()
    } else {
      let finalPhotoRef = photoRef
      const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!finalPhotoRef) {
        if (!apiKey) {
          auditLog('cache-place-photo: google api key ausente', { requestId })
          return buildJsonResponse(500, { error: 'Google Maps API key não configurada' }, allowedOrigin)
        }
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.set('place_id', placeId)
        detailsUrl.searchParams.set('fields', 'photos')
        detailsUrl.searchParams.set('key', apiKey)
        const dr = await fetch(detailsUrl.toString())
        if (!dr.ok) {
          const txt = await dr.text()
          auditLog('cache-place-photo: detalhes place falhou', { requestId, status: dr.status })
          return buildJsonResponse(dr.status, { error: `Erro ao obter detalhes: ${dr.status}`, details: txt }, allowedOrigin)
        }
        const dj = await dr.json()
        finalPhotoRef = dj?.result?.photos?.[0]?.photo_reference || undefined
        if (!finalPhotoRef) {
          auditLog('cache-place-photo: sem photo_reference', { requestId })
          return buildJsonResponse(404, { error: 'Sem photo_reference' }, allowedOrigin)
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
              auditLog('cache-place-photo: falha photoUri', { requestId, status: pr.status })
              return buildJsonResponse(pr.status, { error: `Falha ao baixar photoUri: ${pr.status}` }, allowedOrigin)
            }
            imageBlob = await pr.blob()
          }
        }
      }

      if (!imageBlob) {
        if (!apiKey) {
          auditLog('cache-place-photo: google api key ausente fallback', { requestId })
          return buildJsonResponse(500, { error: 'Google Maps API key não configurada' }, allowedOrigin)
        }
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${finalPhotoRef}&key=${apiKey}`
        const pr = await fetch(photoUrl, { headers: { 'Accept': 'image/*' } })
        if (!pr.ok) {
          const txt = await pr.text().catch(() => '')
          auditLog('cache-place-photo: erro baixar foto', { requestId, status: pr.status })
          return buildJsonResponse(pr.status, { error: `Erro ao baixar foto: ${pr.status}`, details: txt }, allowedOrigin)
        }
        imageBlob = await pr.blob()
      }
    }

    if (!imageBlob || !(imageBlob.type || '').startsWith('image/')) {
      auditLog('cache-place-photo: imagem inválida', { requestId, mime: imageBlob?.type })
      return buildJsonResponse(500, { error: 'Imagem inválida' }, allowedOrigin)
    }

    if (imageBlob.size > MAX_IMAGE_BYTES) {
      auditLog('cache-place-photo: imagem excede limite', { requestId, size: imageBlob.size })
      return buildJsonResponse(413, { error: 'Imagem excede o limite permitido' }, allowedOrigin)
    }

    const fileName = `${Date.now()}.jpg`
    const filePath = `${basePath}/${fileName}`
    const file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' })
    const up = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (up.error) {
      if (String(up.error.message || '').includes('exists')) {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
        auditLog('cache-place-photo: arquivo já existia', { requestId, filePath })
        return buildJsonResponse(200, { imageUrl: publicUrl }, allowedOrigin)
      }
      auditLog('cache-place-photo: upload falhou', { requestId, error: up.error.message })
      return buildJsonResponse(500, { error: up.error.message }, allowedOrigin)
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    await supabase.from('cached_place_photos').insert({ place_id: placeId, photo_reference: (typeof photoRef === 'string' ? photoRef : null), storage_path: filePath, public_url: publicUrl })
    auditLog('cache-place-photo: upload concluído', { requestId, filePath })
    return buildJsonResponse(200, { imageUrl: publicUrl }, allowedOrigin)
  } catch (e) {
    auditLog('cache-place-photo: erro inesperado', { requestId, error: e instanceof Error ? e.message : 'unknown' })
    return buildJsonResponse(500, { error: e instanceof Error ? e.message : 'Erro interno' }, allowedOrigin)
  }
})
