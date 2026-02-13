/**
 * Image Cache Service - LuvBee
 * 
 * Serviço para gerenciar cache de imagens do bucket 'places'
 * Fornece URLs públicas otimizadas para imagens de locais
 */

import { supabase } from '@/integrations/supabase'

export class ImageCacheService {
  private static readonly BUCKET_NAME = 'places'
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas
  
  // Cache em memória
  private static cache = new Map<string, { url: string; timestamp: number }>()

  /**
   * Obtém a URL pública de uma imagem do bucket 'places'
   * @param placeId - ID do local (pode ser UUID ou place_id)
   * @param fileName - Nome do arquivo (opcional, busca o primeiro se não informado)
   * @returns URL pública da imagem ou null se não encontrada
   */
  static async getImageUrl(placeId: string, fileName?: string): Promise<string | null> {
    if (!placeId) return null

    // Verificar cache em memória
    const cacheKey = `${placeId}/${fileName || 'default'}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.url
    }

    try {
      // Se temos fileName específico
      if (fileName) {
        const filePath = `${placeId}/${fileName}`
        const { data } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(filePath)
        
        if (data?.publicUrl) {
          this.cache.set(cacheKey, { url: data.publicUrl, timestamp: Date.now() })
          return data.publicUrl
        }
      }

      // Listar arquivos no diretório do place
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(placeId)

      if (error || !files || files.length === 0) {
        return null
      }

      // Pegar o primeiro arquivo de imagem
      const imageFile = files.find(f => 
        f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
      )

      if (!imageFile) return null

      const filePath = `${placeId}/${imageFile.name}`
      const { data } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        this.cache.set(cacheKey, { url: data.publicUrl, timestamp: Date.now() })
        return data.publicUrl
      }

      return null
    } catch (error) {
      console.error('[ImageCacheService] Error getting image URL:', error)
      return null
    }
  }

  /**
   * Obtém múltiplas URLs de imagens de um local
   * @param placeId - ID do local
   * @param limit - Limite de imagens a retornar
   * @returns Array de URLs públicas
   */
  static async getImageUrls(placeId: string, limit: number = 5): Promise<string[]> {
    if (!placeId) return []

    try {
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(placeId)

      if (error || !files || files.length === 0) {
        return []
      }

      // Filtrar apenas imagens e limitar
      const imageFiles = files
        .filter(f => f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
        .slice(0, limit)

      return imageFiles.map(file => {
        const filePath = `${placeId}/${file.name}`
        const { data } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(filePath)
        return data.publicUrl
      })
    } catch (error) {
      console.error('[ImageCacheService] Error getting image URLs:', error)
      return []
    }
  }

  /**
   * Verifica se existe imagem para um local
   * @param placeId - ID do local
   * @returns true se existe imagem
   */
  static async hasImage(placeId: string): Promise<boolean> {
    if (!placeId) return false

    try {
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(placeId)

      if (error || !files) return false

      return files.some(f => f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
    } catch (error) {
      return false
    }
  }

  /**
   * Limpa o cache em memória
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Invalida o cache de um local específico
   */
  static invalidateCache(placeId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(placeId)) {
        this.cache.delete(key)
      }
    }
  }
}
