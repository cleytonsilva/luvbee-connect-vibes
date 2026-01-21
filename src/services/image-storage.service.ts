/**
 * Image Storage Service - Gerenciar download e salvamento de imagens
 * Baixa imagens do Google Places API e salva no Supabase Storage
 */

import { supabase } from '@/integrations/supabase'
import { GooglePlacesService } from './google-places.service'
import type { ApiResponse } from '@/types/app.types'
import { invokeCachePlacePhoto } from '@/lib/cache-place-photo-helper'

export class ImageStorageService {
  private static readonly BUCKET_NAME = 'locations'
  private static readonly MAX_WIDTH = 800 // Largura máxima para otimização
  private static readonly MAX_HEIGHT = 600 // Altura máxima para otimização

  /**
   * Baixa uma imagem de uma URL e retorna como Blob
   */
  private static async downloadImage(url: string): Promise<Blob> {
    // Deprecated: Agora usamos Edge Functions para evitar CORS
    // Mantido apenas para URLs que não são do Google Places
    if (!url.includes('google') && !url.includes('googleapis')) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
          },
          mode: 'cors',
        })

        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()

        if (!blob.type.startsWith('image/')) {
          throw new Error('Resposta não é uma imagem válida')
        }

        return blob
      } catch (e) {
        throw new Error(`Error downloading image: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    throw new Error('Direct Google Image download is not supported client-side due to CORS. Use saveLocationImageFromGoogle instead.')
  }

  /**
   * Converte Blob para File
   */
  private static blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' })
  }

  /**
   * Gera nome único para arquivo baseado no locationId
   */
  private static generateFileName(locationId: string): string {
    // Usar hash do locationId para garantir nome único
    const hash = locationId.replace(/-/g, '').substring(0, 16)
    return `${hash}-${Date.now()}.jpg`
  }

  /**
   * Verifica se a imagem já existe no storage para um local
   */
  static async getLocationImageUrl(locationId: string): Promise<string | null> {
    try {
      // Buscar na tabela locations o campo image_url
      const { data, error } = await supabase
        .from('locations')
        .select('image_url')
        .eq('id', locationId)
        .single()

      if (error) {
        console.warn('[ImageStorageService] Error getting location image_url:', error)
        return null
      }

      // Verificar se a URL é do Supabase Storage
      if (data?.image_url && data.image_url.includes('supabase.co/storage')) {
        return data.image_url
      }

      return null
    } catch (error) {
      console.error('[ImageStorageService] Error in getLocationImageUrl:', error)
      return null
    }
  }

  /**
   * Baixa imagem do Google Places e salva no Supabase Storage
   * photoReference pode ser URL completa (da biblioteca JS) ou photo_reference string (da REST API)
   */
  static async saveLocationImageFromGoogle(
    locationId: string,
    photoReference: string
  ): Promise<ApiResponse<string>> {
    try {
      // Verificar se já existe imagem salva
      const existingUrl = await this.getLocationImageUrl(locationId)
      if (existingUrl && existingUrl.includes('supabase.co/storage')) {
        console.log('[ImageStorageService] Image already exists for location:', locationId)
        return { data: existingUrl }
      }

      // Usar Edge Function para baixar e salvar (CORS-safe)
      console.log('[ImageStorageService] Calling Edge Function cache-place-photo...')

      // Se for URL, tentar extrair photo_reference se possível, ou passar URL
      let cleanPhotoReference = photoReference
      if (photoReference.includes('google')) {
        // Tentar extrair photoreference da query string
        try {
          const url = new URL(photoReference)
          const ref = url.searchParams.get('photoreference')
          if (ref) cleanPhotoReference = ref
        } catch { }
      }

      // A Edge Function aceita { place_id, photo_reference } OU { place_id, image_url }
      // Se tivermos apenas locationId (UUID), precisamos do place_id do Google
      // Vamos buscar o place_id associado a este locationId
      const { data: location } = await supabase.from('locations').select('place_id').eq('id', locationId).single()

      if (!location?.place_id) {
        return { error: 'Location has no place_id' }
      }

      // Opções para a Edge Function
      const options: any = { maxWidth: 800 }

      // Sempre usar cleanPhotoReference se disponível
      if (cleanPhotoReference && !cleanPhotoReference.startsWith('http')) {
        options.photoReference = cleanPhotoReference
      } else {
        // Se ainda for URL, tentamos passar como fallback, mas a preferência é o photox_reference limpo
        // Se não conseguimos extrair, deixamos vazio para a Edge Function tentar buscar pelo place_id
        console.warn('[ImageStorageService] Could not extract photo_reference from URL. Edge function will try fallback lookup.')
      }

      // Chamar Edge Function via helper
      const result = await invokeCachePlacePhoto(location.place_id, options)

      if (result.success && result.imageUrl) {
        // Atualizar campo image_url na tabela locations (a Edge function já faz, mas garantimos aqui)
        await this.updateLocationImageUrl(locationId, result.imageUrl)
        return { data: result.imageUrl }
      }

      return { error: result.error || 'Failed to save image via Edge Function' }

    } catch (error) {
      console.error('[ImageStorageService] Error saving location image:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to save location image'
      }
    }
  }

  /**
   * Atualiza o campo image_url na tabela locations
   */
  private static async updateLocationImageUrl(locationId: string, imageUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ image_url: imageUrl })
        .eq('id', locationId)

      if (error) {
        console.error('[ImageStorageService] Error updating location image_url:', error)
        throw error
      }
    } catch (error) {
      console.error('[ImageStorageService] Error in updateLocationImageUrl:', error)
      throw error
    }
  }

  /**
   * Processa e salva imagem para um local usando Edge Function do Supabase
   * Resolve problemas CORS e mantém API key segura no servidor
   */
  static async processLocationImage(
    locationId: string,
    googlePlaceId?: string,
    photoReference?: string
  ): Promise<ApiResponse<string>> {
    // Redirecionar para saveLocationImageFromGoogle que agora usa Edge Function
    if (googlePlaceId) {
      // Se temos googlePlaceId, podemos tentar a rota principal
      // Mas aqui os parâmetros são diferentes. Vamos adaptar.
      return this.saveLocationImageFromGoogle(locationId, photoReference || '')
    }
    return { error: 'Missing googlePlaceId' }
  }

  /**
   * Remove imagem do storage (opcional, para limpeza)
   */
  static async deleteLocationImage(locationId: string): Promise<ApiResponse<void>> {
    try {
      // Buscar arquivos do local no storage
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(locationId)

      if (listError) {
        console.warn('[ImageStorageService] Error listing files:', listError)
        return { error: listError.message }
      }

      // Deletar todos os arquivos do local
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${locationId}/${file.name}`)
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filePaths)

        if (deleteError) {
          console.error('[ImageStorageService] Error deleting files:', deleteError)
          return { error: deleteError.message }
        }
      }

      // Limpar campo image_url na tabela
      await this.updateLocationImageUrl(locationId, '')

      return { data: undefined }
    } catch (error) {
      console.error('[ImageStorageService] Error deleting location image:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to delete location image'
      }
    }
  }
}
