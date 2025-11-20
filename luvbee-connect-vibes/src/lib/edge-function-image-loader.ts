/**
 * Helper para carregar imagens de Edge Functions com autenticação
 * 
 * Como tags <img> não podem enviar headers de autenticação,
 * esta função faz fetch com autenticação e retorna um blob URL
 */

const imageBlobCache = new Map<string, string>()

/**
 * Carrega uma imagem de uma Edge Function com autenticação
 * Retorna um blob URL que pode ser usado em tags <img>
 */
export async function loadEdgeFunctionImage(
  edgeFunctionUrl: string,
  options?: {
    maxRetries?: number
    cache?: boolean
  }
): Promise<string> {
  const { maxRetries = 3, cache = true } = options || {}

  // Verificar cache primeiro
  if (cache && imageBlobCache.has(edgeFunctionUrl)) {
    return imageBlobCache.get(edgeFunctionUrl)!
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[loadEdgeFunctionImage] Supabase URL ou chave não configurada')
    return '/placeholder-location.jpg'
  }

  // Se a URL já é completa, usar diretamente
  let fullUrl = edgeFunctionUrl
  if (!edgeFunctionUrl.startsWith('http')) {
    fullUrl = `${supabaseUrl}${edgeFunctionUrl.startsWith('/') ? '' : '/'}${edgeFunctionUrl}`
  }

  // Tentar fazer fetch com retry
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401 && attempt < maxRetries - 1) {
          // Aguardar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        console.error(`[loadEdgeFunctionImage] Erro ao carregar imagem: ${response.status} ${response.statusText}`)
        return '/placeholder-location.jpg'
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Armazenar no cache se solicitado
      if (cache) {
        imageBlobCache.set(edgeFunctionUrl, blobUrl)
      }

      return blobUrl
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('[loadEdgeFunctionImage] Erro ao carregar imagem após tentativas:', error)
        return '/placeholder-location.jpg'
      }
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  return '/placeholder-location.jpg'
}

/**
 * Limpa o cache de blob URLs
 * Útil para liberar memória quando necessário
 */
export function clearImageBlobCache(): void {
  // Revogar todas as URLs de blob antes de limpar o cache
  imageBlobCache.forEach(blobUrl => {
    URL.revokeObjectURL(blobUrl)
  })
  imageBlobCache.clear()
}

/**
 * Gera URL da Edge Function com autenticação para uso em tags <img>
 * NOTA: Esta função retorna uma URL que requer autenticação.
 * Para tags <img>, use loadEdgeFunctionImage() que retorna blob URL.
 * 
 * Para casos onde você precisa passar a URL diretamente (com autenticação),
 * você pode usar esta função que adiciona o apikey como query parameter.
 * ATENÇÃO: Isso expõe a chave anon na URL, mas é aceitável pois é a chave pública.
 */
export function getEdgeFunctionImageUrl(
  functionPath: string,
  params: Record<string, string | number>
): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error('[getEdgeFunctionImageUrl] Supabase URL não configurada')
    return '/placeholder-location.jpg'
  }

  const url = new URL(`${supabaseUrl}${functionPath.startsWith('/') ? '' : '/'}${functionPath}`)
  
  // Adicionar parâmetros
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  // Adicionar apikey como query parameter (aceitável pois é chave pública)
  if (supabaseAnonKey) {
    url.searchParams.set('apikey', supabaseAnonKey)
  }

  return url.toString()
}

