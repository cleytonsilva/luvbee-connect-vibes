/**
 * Image Storage Service - Gerenciar download e salvamento de imagens
 * Baixa imagens do Google Places API e salva no Supabase Storage
 */

import { supabase } from '@/integrations/supabase'
import { GooglePlacesService } from './google-places.service'
import type { ApiResponse } from '@/types/app.types'

export class ImageStorageService {
  private static readonly BUCKET_NAME = 'locations'
  private static readonly MAX_WIDTH = 800 // Largura máxima para otimização
  private static readonly MAX_HEIGHT = 600 // Altura máxima para otimização

  /**
   * Baixa uma imagem de uma URL e retorna como Blob
   */
  private static async downloadImage(url: string): Promise<Blob> {
    try {
      // Se for URL completa do Google Places (vinda da biblioteca JavaScript), usar diretamente
      if (url.includes('maps.googleapis.com/maps/api/place/photo')) {
        // URL já está completa e válida (vinda da biblioteca JS)
        // Tentar usar diretamente primeiro
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
            },
            mode: 'cors',
          })
          
          if (response.ok) {
            const blob = await response.blob()
            if (blob.type.startsWith('image/')) {
              return blob
            }
          }
        } catch (error) {
          // Se falhar, tentar extrair photo_reference e usar método específico
          console.warn('[ImageStorageService] Direct fetch failed, trying photo_reference method:', error)
        }
        
        // Tentar extrair photo_reference da URL como fallback
        try {
          const urlObj = new URL(url)
          const photoReference = urlObj.searchParams.get('photoreference')
          const maxWidth = urlObj.searchParams.get('maxwidth') || '800'
          
          if (photoReference) {
            const result = await GooglePlacesService.downloadPhoto(photoReference, parseInt(maxWidth))
            if (result.error) {
              throw new Error(result.error)
            }
            if (result.data) {
              return result.data
            }
          }
        } catch (error) {
          console.warn('[ImageStorageService] Photo reference method also failed:', error)
        }
      }

      // Se for photo_reference (string que não é URL), usar GooglePlacesService
      if (!url.startsWith('http') && url.length > 20) {
        const result = await GooglePlacesService.downloadPhoto(url, this.MAX_WIDTH)
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.data) {
          return result.data
        }
      }

      // Para outras URLs, usar fetch normal
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
    } catch (error) {
      throw new Error(`Error downloading image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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

      // Baixar imagem (photoReference pode ser URL completa ou photo_reference)
      console.log('[ImageStorageService] Downloading image from Google Places...')
      const imageBlob = await this.downloadImage(photoReference)

      // Gerar nome do arquivo
      const fileName = this.generateFileName(locationId)
      const filePath = `${locationId}/${fileName}`

      // Converter Blob para File
      const imageFile = this.blobToFile(imageBlob, fileName)

      // Upload para Supabase Storage
      console.log('[ImageStorageService] Uploading to Supabase Storage...')
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false, // Não sobrescrever se já existir
          contentType: 'image/jpeg'
        })

      if (uploadError) {
        // Se arquivo já existe, obter URL existente
        if (uploadError.message?.includes('already exists') || uploadError.statusCode === '409') {
          const { data: { publicUrl } } = supabase.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(filePath)
          
          // Atualizar banco de dados
          await this.updateLocationImageUrl(locationId, publicUrl)
          return { data: publicUrl }
        }
        throw uploadError
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      // Atualizar campo image_url na tabela locations
      await this.updateLocationImageUrl(locationId, publicUrl)

      console.log('[ImageStorageService] Image saved successfully:', publicUrl)
      return { data: publicUrl }
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
    try {
      // Se já existe imagem salva, retornar
      const existingUrl = await this.getLocationImageUrl(locationId)
      if (existingUrl && existingUrl.includes('supabase.co/storage')) {
        return { data: existingUrl }
      }

      // Se tem URL do Google mas é formato incorreto (PhotoService.GetPhoto), limpar
      if (existingUrl && existingUrl.includes('PhotoService.GetPhoto')) {
        console.warn('[ImageStorageService] Invalid Google Places URL format detected, will reprocess')
        await this.updateLocationImageUrl(locationId, '')
      }

      // Chamar Edge Function do Supabase para processar imagem server-side
      const { data, error } = await supabase.functions.invoke('process-location-image', {
        body: {
          locationId,
          googlePlaceId,
          photoReference,
        },
      })

      if (error) {
        console.error('[ImageStorageService] Edge Function error:', error)
        return {
          error: error.message || 'Failed to process location image via Edge Function'
        }
      }

      if (data?.error) {
        return { error: data.error }
      }

      if (data?.imageUrl) {
        return { data: data.imageUrl }
      }

      return { error: 'Resposta inválida da Edge Function' }
    } catch (error) {
      console.error('[ImageStorageService] Error processing location image:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to process location image'
      }
    }
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

