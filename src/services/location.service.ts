import { supabase } from '../integrations/supabase'
import type { LocationData, LocationFilter, ApiResponse, PaginationOptions } from '../types/app.types'
import { ImageStorageService } from './image-storage.service'

export class LocationService {
  static async getLocations(filter?: LocationFilter, pagination?: PaginationOptions): Promise<ApiResponse<LocationData[]>> {
    try {
      let query = supabase
        .from('locations')
        .select('id,name,address,type,category,lat,lng,rating,price_level,image_url,photo_url,description,images,phone,website,opening_hours,created_at,updated_at,is_active,is_verified,owner_id')

      if (filter) {
        if (filter.category) {
          // A tabela locations usa 'type' (não 'category')
          query = query.eq('type', filter.category)
        }
        if (filter.search) {
          query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
        }
        // Remover filtro is_active se a coluna não existir
        // if (filter.isActive !== undefined) {
        //   query = query.eq('is_active', filter.isActive)
        // }
      }

      if (pagination) {
        const orderBy = pagination.offset !== undefined ? 'created_at' : (pagination as any).orderBy || 'created_at'
        const order = (pagination as any).order || 'desc'
        query = query
          .range(pagination.offset || 0, (pagination.offset || 0) + (pagination.limit || 10) - 1)
          .order(orderBy, { ascending: order === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error

      return { data: data as LocationData[] }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get locations' }
    }
  }

  /**
   * Busca um local por ID (UUID) ou place_id (Google Places)
   */
  static async getLocationById(id: string): Promise<ApiResponse<LocationData>> {
    try {
      // Verificar se é UUID ou place_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      
      let query = supabase
        .from('locations')
        .select('*')
      
      if (isUUID) {
        query = query.eq('id', id)
      } else {
        // Assumir que é place_id
        query = query.eq('place_id', id)
      }
      
      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return { error: 'Local não encontrado' }
      }

      return { data: data as LocationData }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get location' }
    }
  }

  static async createLocation(locationData: Partial<LocationData>): Promise<ApiResponse<LocationData>> {
    try {
      // Validar campos obrigatórios
      if (!locationData.name || !locationData.address || !locationData.category) {
        return { error: 'Campos obrigatórios: name, address, category' }
      }

      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: locationData.name,
          address: locationData.address,
          category: locationData.category,
          description: locationData.description,
          images: locationData.images,
          rating: locationData.rating || 0,
          phone: locationData.phone,
          website: locationData.website,
          opening_hours: locationData.opening_hours,
          location: locationData.location,
          owner_id: locationData.owner_id,
          is_verified: locationData.is_verified || false,
          is_active: locationData.is_active !== undefined ? locationData.is_active : true,
        } as any)
        .select('*')
        .single()

      if (error) throw error

      return { data: data as LocationData }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create location' }
    }
  }

  static async updateLocation(id: string, locationData: Partial<LocationData>): Promise<ApiResponse<LocationData>> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update(locationData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      return { data: data as LocationData }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update location' }
    }
  }

  static async deleteLocation(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete location' }
    }
  }

  static async getNearbyLocations(lat: number, lng: number, radius: number = 5000): Promise<ApiResponse<LocationData[]>> {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_nearby_locations', {
          user_lat: lat,
          user_lng: lng,
          radius_meters: radius
        })

      if (error) {
        console.error('[LocationService] get_nearby_locations error:', error)
        // Se a função não existe, fornecer mensagem mais útil
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          return { 
            error: 'Função get_nearby_locations não encontrada. Por favor, execute a migração: supabase/migrations/20250128000000_add_get_nearby_locations_function.sql'
          }
        }
        throw error
      }

      // Mapear dados retornados pela função RPC para o formato LocationData
      const locations: LocationData[] = (data || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        category: loc.type || loc.category || 'outro', // Mapear type para category
        description: loc.description || undefined,
        images: loc.image_url ? [loc.image_url] : undefined,
        rating: Number(loc.rating) || Number(loc.google_rating) || 0,
        phone: undefined, // Não retornado pela função
        website: undefined, // Não retornado pela função
        opening_hours: undefined, // Não retornado pela função
        location: {
          lat: Number(loc.lat),
          lng: Number(loc.lng),
        },
        owner_id: undefined, // Não retornado pela função
        is_verified: false, // Não retornado pela função
        is_active: true, // Assumir que se retornou, está ativo
        created_at: loc.created_at,
        updated_at: loc.updated_at,
        // Campos adicionais que podem ser úteis
        ...(loc.price_level && { price_level: loc.price_level }),
        ...(loc.image_url && { image_url: loc.image_url }),
        ...(loc.place_id && { place_id: loc.place_id }),
        ...(loc.distance_meters && { distance_meters: Number(loc.distance_meters) }),
      }))

      // Processamento de imagens temporariamente desabilitado devido a problemas com Edge Function
      // TODO: Reabilitar após corrigir problema de 404 na Edge Function
      // this.processLocationImagesInBackground(locations)

      return { data: locations }
    } catch (error) {
      console.error('[LocationService] getNearbyLocations exception:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get nearby locations' }
    }
  }

  /**
   * Processa imagens de locais em background usando LocationImageScraper
   * Busca fotos de múltiplas fontes (Google Places, Instagram, Unsplash)
   */
  private static async processLocationImagesInBackground(locations: LocationData[]): Promise<void> {
    // Importar dinamicamente para evitar dependência circular
    const { LocationImageScraper } = await import('./location-image-scraper.service')
    
    // Processar apenas os primeiros 10 locais para não sobrecarregar
    const locationsToProcess = locations.slice(0, 10)
    
    locationsToProcess.forEach(async (location) => {
      try {
        // Verificar se já tem imagem salva no Supabase Storage
        const existingUrl = await ImageStorageService.getLocationImageUrl(location.id)
        
        if (existingUrl && existingUrl.includes('supabase.co/storage')) {
          // Já tem imagem salva, não precisa processar
          return
        }

        // Processar usando scraper (busca múltiplas fontes)
        LocationImageScraper.processAndSaveLocationImages(location.id).catch(err => {
          console.warn(`[LocationService] Failed to process image for location ${location.id}:`, err)
        })
      } catch (error) {
        // Ignorar erros no processamento em background
        console.warn(`[LocationService] Error processing image for location ${location.id}:`, error)
      }
    })
  }

  static async checkIn(locationId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          location_id: locationId,
          user_id: userId
        })

      if (error) throw error

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to check in' }
    }
  }

  static async addToFavorites(locationId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Usar location_matches como favoritos (já que tabela favorites não existe)
      const result = await this.createLocationMatch(userId, locationId)
      if (result.error) {
        return { error: result.error }
      }
      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to add to favorites' }
    }
  }

  static async removeFromFavorites(locationId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Usar location_matches como favoritos (já que tabela favorites não existe)
      const result = await this.removeLocationMatch(userId, locationId)
      if (result.error) {
        return { error: result.error }
      }
      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to remove from favorites' }
    }
  }

  static async getUserFavorites(userId: string): Promise<ApiResponse<LocationData[]>> {
    try {
      // Usar location_matches como favoritos (já que tabela favorites não existe)
      // location_matches.location_id é TEXT (pode ser UUID ou place_id)
      const { data: matches, error } = await supabase
        .from('location_matches')
        .select('location_id')
        .eq('user_id', userId)

      if (error) {
        console.warn('[LocationService] getUserFavorites error:', error)
        return { data: [] }
      }

      if (!matches || matches.length === 0) {
        return { data: [] }
      }

      // location_id pode ser UUID ou place_id (TEXT)
      // Tentar buscar por ambos
      const locationIds = matches.map(m => m.location_id).filter(Boolean)
      if (locationIds.length === 0) {
        return { data: [] }
      }

      // Separar UUIDs e place_ids
      const uuids = locationIds.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      const placeIds = locationIds.filter(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

      const locations: LocationData[] = []

      // Buscar por UUIDs
      if (uuids.length > 0) {
        const { data: uuidLocations, error: uuidError } = await supabase
          .from('locations')
          .select('id,name,address,type,place_id,lat,lng,rating,price_level,image_url,peak_hours,google_rating,google_place_data,created_at,updated_at,is_active,is_verified,owner_id')
          .in('id', uuids)

        if (!uuidError && uuidLocations) {
          locations.push(...(uuidLocations as LocationData[]))
        }
      }

      // Buscar por place_ids
      if (placeIds.length > 0) {
        const { data: placeLocations, error: placeError } = await supabase
          .from('locations')
          .select('id,name,address,type,place_id,lat,lng,rating,price_level,image_url,peak_hours,google_rating,google_place_data,created_at,updated_at,is_active,is_verified,owner_id')
          .in('place_id', placeIds)

        if (!placeError && placeLocations) {
          locations.push(...(placeLocations as LocationData[]))
        }
      }

      return { data: locations }
    } catch (error) {
      console.warn('[LocationService] getUserFavorites error:', error)
      return { data: [] }
    }
  }

  static async addReview(locationId: string, userId: string, rating: number, comment?: string): Promise<ApiResponse<void>> {
    try {
      // Tabela reviews não existe, retornar erro silencioso
      console.warn('[LocationService] addReview: Tabela reviews não existe')
      return { error: 'Funcionalidade de reviews não disponível' }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to add review' }
    }
  }

  static async getCategories(): Promise<ApiResponse<any[]>> {
    try {
      // Tentar buscar da tabela, mas se não existir ou tiver erro, usar categorias padrão
      const { data, error } = await supabase
        .from('location_categories')
        .select('id,name,color,is_active')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.warn('[LocationService] getCategories error:', error)
        // Se a tabela não existe ou erro, retornar categorias padrão
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '42703' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('404') || error.message?.includes('column')) {
          console.warn('[LocationService] location_categories table not found or missing columns, using default categories')
          return { 
            data: [
              { id: 'bar', name: 'Bar', icon: '🍺', color: '#FF6B6B' },
              { id: 'restaurant', name: 'Restaurante', icon: '🍽️', color: '#4ECDC4' },
              { id: 'club', name: 'Balada', icon: '🎵', color: '#95E1D3' },
              { id: 'pub', name: 'Pub', icon: '🍻', color: '#F38181' },
              { id: 'lounge', name: 'Lounge', icon: '🥃', color: '#AA96DA' },
            ]
          }
        }
        throw error
      }

      // Adicionar ícones padrão se não vierem do banco
      const categories = (data || []).map(cat => ({
        ...cat,
        icon: cat.icon || '📍'
      }))

      return { data: categories }
    } catch (error) {
      console.error('[LocationService] getCategories error:', error)
      // Retornar categorias padrão em caso de erro
      return { 
        data: [
          { id: 'bar', name: 'Bar', icon: '🍺', color: '#FF6B6B' },
          { id: 'restaurant', name: 'Restaurante', icon: '🍽️', color: '#4ECDC4' },
          { id: 'club', name: 'Balada', icon: '🎵', color: '#95E1D3' },
          { id: 'pub', name: 'Pub', icon: '🍻', color: '#F38181' },
          { id: 'lounge', name: 'Lounge', icon: '🥃', color: '#AA96DA' },
        ]
      }
    }
  }

  // ============================================
  // Location Matches (Core Loop 1)
  // ============================================

  /**
   * Cria um match com um local (quando usuário dá like)
   */
  static async createLocationMatch(userId: string, locationId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se já existe match antes de tentar inserir (evita erro 409)
      const existingMatch = await this.hasLocationMatch(userId, locationId)
      if (existingMatch) {
        // Se já existe, apenas atualizar matched_at e status para active
        const updateData: any = {
          matched_at: new Date().toISOString(),
          status: 'active'
        }

        const { error: updateError } = await supabase
          .from('location_matches' as any)
          .update(updateData)
          .eq('user_id', userId)
          .eq('location_id', locationId)

        if (updateError) {
          // Se erro por status não existir, tentar sem status
          if (updateError.message?.includes('status') || updateError.code === '42703') {
            const { error: retryUpdateError } = await supabase
              .from('location_matches' as any)
              .update({ matched_at: new Date().toISOString() } as any)
              .eq('user_id', userId)
              .eq('location_id', locationId)

            if (retryUpdateError) {
              // Tentar com UUID se location_id for place_id
              const locationResult = await this.getLocationByPlaceId(locationId)
              if (locationResult.data?.id && locationResult.data.id !== locationId) {
                const { error: uuidUpdateError } = await supabase
                  .from('location_matches' as any)
                  .update({ matched_at: new Date().toISOString() } as any)
                  .eq('user_id', userId)
                  .eq('location_id', locationResult.data.id)

                if (uuidUpdateError) {
                  // Se ainda erro, tratar como sucesso silencioso (já existe)
                  return { data: undefined }
                }
              } else {
                // Se ainda erro, tratar como sucesso silencioso (já existe)
                return { data: undefined }
              }
            }
          } else {
            // Se erro de update, tratar como sucesso silencioso (já existe)
            return { data: undefined }
          }
        }
        return { data: undefined }
      }

      const insertData: any = {
        user_id: userId,
        location_id: locationId, // location_id é TEXT, pode ser UUID ou place_id
        matched_at: new Date().toISOString(),
        status: 'active'
      }

      // Tentar inserir primeiro (com supressão silenciosa de erro 409)
      const { error: insertError } = await supabase
        .from('location_matches' as any)
        .insert(insertData)

      // Se não houve erro, sucesso
      if (!insertError) {
        return { data: undefined }
      }

      // Verificar se é erro de conflito (409) ou violação de constraint única (23505)
      const isConflictError = 
        insertError.code === '23505' || 
        insertError.code === 'PGRST301' ||
        insertError.status === 409 ||
        insertError.message?.includes('409') || 
        insertError.message?.includes('Conflict') ||
        insertError.message?.includes('duplicate') ||
        insertError.message?.includes('unique constraint') ||
        insertError.message?.includes('already exists')

      if (isConflictError) {
        // Se já existe, apenas atualizar o registro existente
        const updateData: any = {
          matched_at: new Date().toISOString(),
          status: 'active'
        }

        const { error: updateError } = await supabase
          .from('location_matches' as any)
          .update(updateData)
          .eq('user_id', userId)
          .eq('location_id', locationId)

        if (updateError) {
          // Se erro por coluna status não existir, tentar sem status
          if (updateError.message?.includes('status') || updateError.code === '42703') {
            const { error: retryUpdateError } = await supabase
              .from('location_matches' as any)
              .update({ matched_at: new Date().toISOString() } as any)
              .eq('user_id', userId)
              .eq('location_id', locationId)

            if (retryUpdateError) {
              // Tentar com UUID se location_id for place_id
              const locationResult = await this.getLocationByPlaceId(locationId)
              if (locationResult.data?.id && locationResult.data.id !== locationId) {
                const { error: uuidUpdateError } = await supabase
                  .from('location_matches' as any)
                  .update({ matched_at: new Date().toISOString() } as any)
                  .eq('user_id', userId)
                  .eq('location_id', locationResult.data.id)

                if (uuidUpdateError) {
                  // Se ainda erro, tratar como sucesso silencioso (já existe)
                  return { data: undefined }
                }
              } else {
                // Se ainda erro, tratar como sucesso silencioso (já existe)
                return { data: undefined }
              }
            }
          } else {
            // Se erro de update, tratar como sucesso silencioso (já existe)
            return { data: undefined }
          }
        }
        return { data: undefined }
      }

      // Se erro por coluna status não existir, tentar inserir sem status
      if (insertError.message?.includes('status') || insertError.code === '42703') {
        const { error: retryInsertError } = await supabase
          .from('location_matches' as any)
          .insert({
            user_id: userId,
            location_id: locationId,
            matched_at: new Date().toISOString()
          })

        if (retryInsertError) {
          // Se ainda erro de conflito, tratar como sucesso
          const isRetryConflictError = 
            retryInsertError.code === '23505' || 
            retryInsertError.code === 'PGRST301' ||
            retryInsertError.status === 409 ||
            retryInsertError.message?.includes('409') || 
            retryInsertError.message?.includes('Conflict') ||
            retryInsertError.message?.includes('duplicate') ||
            retryInsertError.message?.includes('unique constraint') ||
            retryInsertError.message?.includes('already exists')

          if (isRetryConflictError) {
            return { data: undefined }
          }
          throw retryInsertError
        }
        return { data: undefined }
      }

      // Se não é erro de conflito nem de status, lançar o erro
      throw insertError
    } catch (error) {
      // Capturar qualquer erro de conflito que possa ter escapado
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isConflictError = 
        errorMessage.includes('409') || 
        errorMessage.includes('Conflict') ||
        errorMessage.includes('23505') ||
        errorMessage.includes('duplicate') ||
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('PGRST301')

      if (isConflictError) {
        // Conflito significa que já existe, então é sucesso silencioso
        return { data: undefined }
      }

      return { error: errorMessage }
    }
  }

  /**
   * Cria um registro de rejeição de local (para cálculo de taxa de rejeição)
   */
  static async createLocationRejection(userId: string, locationId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se já existe rejeição para evitar duplicatas
      const { data: existing } = await supabase
        .from('location_rejections' as any)
        .select('id')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .maybeSingle()

      if (existing) {
        // Já existe, não precisa criar novamente
        return { data: undefined }
      }

      const { error } = await supabase
        .from('location_rejections' as any)
        .insert({
          user_id: userId,
          location_id: locationId, // Pode ser UUID ou place_id
        })

      if (error) {
        // Se erro por tabela não existir, ignorar silenciosamente
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return { data: undefined }
        }
        throw error
      }

      return { data: undefined }
    } catch (error) {
      // Ignorar erros silenciosamente se a tabela não existir ainda
      return { data: undefined }
    }
  }

  /**
   * Remove um match com um local (quando usuário dá dislike)
   */
  static async removeLocationMatch(userId: string, locationId: string): Promise<ApiResponse<void>> {
    try {
      // Tentar atualizar status primeiro
      const { error: updateError } = await supabase
        .from('location_matches' as any)
        .update({ status: 'inactive' } as any) // Usar 'inactive' para marcar como rejeitado
        .eq('user_id', userId)
        .eq('location_id', locationId)

      // Se erro por coluna status não existir, deletar o registro
      if (updateError && (updateError.message?.includes('status') || updateError.code === '42703')) {
        const { error: deleteError } = await supabase
          .from('location_matches' as any)
          .delete()
          .eq('user_id', userId)
          .eq('location_id', locationId)

        if (deleteError) throw deleteError
        return { data: undefined }
      }

      if (updateError) throw updateError

      return { data: undefined }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to remove location match' }
    }
  }

  /**
   * Filtra place_ids que o usuário ainda não curtiu (usando função RPC no backend)
   */
  static async filterUnmatchedLocations(
    userId: string,
    placeIds: string[]
  ): Promise<ApiResponse<string[]>> {
    try {
      if (!placeIds || placeIds.length === 0) {
        return { data: [] }
      }

      const { data, error } = await supabase.rpc('filter_unmatched_locations', {
        p_user_id: userId,
        p_place_ids: placeIds,
      })

      if (error) {
        return { error: error.message || 'Failed to filter unmatched locations' }
      }

      // A função retorna um array de objetos com place_id
      const filteredPlaceIds = (data || []).map((item: any) => item.place_id).filter(Boolean)
      
      return { data: filteredPlaceIds }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to filter unmatched locations' }
    }
  }

  /**
   * Busca todos os matches ativos do usuário com locais
   */
  static async getUserLocationMatches(userId: string): Promise<ApiResponse<any[]>> {
    try {
      // Buscar location_matches primeiro (sem join porque location_id é TEXT e não há foreign key)
      const { data: matches, error: matchesError } = await supabase
        .from('location_matches' as any)
        .select('*')
        .eq('user_id', userId)
        .order('matched_at', { ascending: false })

      if (matchesError) {
        console.error('[LocationService] getUserLocationMatches error:', matchesError)
        return { error: matchesError.message || 'Failed to get location matches' }
      }

      if (!matches || matches.length === 0) {
        return { data: [] }
      }

      // Filtrar por status se a coluna existir
      const activeMatches = matches.filter((match: any) => {
        if (match.status === undefined) return true
        return match.status === 'active' || match.status === 'accepted'
      })

      // Buscar locations separadamente
      // location_id pode ser UUID (como string) ou place_id do Google
      const locationIds = activeMatches
        .map((match: any) => match.location_id)
        .filter((id: string) => id) // Remover nulls/undefined

      if (locationIds.length === 0) {
        return { data: activeMatches.map((match: any) => ({ ...match, location: null })) }
      }

      // Tentar buscar por UUID primeiro (se location_id for UUID)
      const uuidIds = locationIds.filter((id: string) => {
        // Verificar se é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      })

      let locationsMap: Map<string, any> = new Map()

      if (uuidIds.length > 0) {
        // Buscar locations em lotes se necessário (Supabase tem limite de 100 itens no .in())
        const batchSize = 100
        for (let i = 0; i < uuidIds.length; i += batchSize) {
          const batch = uuidIds.slice(i, i + batchSize)
          const { data: locations, error: locationsError } = await supabase
            .from('locations')
            .select('id,name,address,type,place_id,lat,lng,rating,price_level,image_url,peak_hours,google_rating,google_place_data,created_at,updated_at,is_active,is_verified,owner_id')
            .in('id', batch)

          if (locationsError) {
            console.warn('[LocationService] Error fetching locations batch:', locationsError)
            continue
          }

          if (locations) {
            locations.forEach((loc: any) => {
              locationsMap.set(loc.id, loc)
            })
          }
        }
      }

      // Combinar matches com locations
      const result = activeMatches.map((match: any) => {
        const location = locationsMap.get(match.location_id) || null
        return {
          ...match,
          location
        }
      })

      return { data: result }
    } catch (error) {
      console.error('[LocationService] getUserLocationMatches exception:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get user location matches' }
    }
  }

  /**
   * Verifica se o usuário já deu match com um local
   * Aceita tanto UUID quanto place_id como locationId
   */
  static async hasLocationMatch(userId: string, locationId: string): Promise<boolean> {
    try {
      // Verificar se é UUID ou place_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId)
      
      // Tentar buscar diretamente por location_id (pode ser UUID ou place_id)
      const { data: directData, error: directError } = await supabase
        .from('location_matches' as any)
        .select('id, status')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .maybeSingle()
      
      // Se erro 406, pode ser problema com place_id, tentar buscar por UUID do location
      if (directError && (directError.code === 'PGRST116' || directError.message?.includes('406') || directError.message?.includes('Not Acceptable'))) {
        // Se não é UUID e deu erro, tentar buscar location primeiro
        if (!isUUID) {
          const locationResult = await this.getLocationByPlaceId(locationId)
          if (locationResult.data) {
            // Tentar buscar match usando UUID do location
            const { data: uuidData, error: uuidError } = await supabase
              .from('location_matches' as any)
              .select('id, status')
              .eq('user_id', userId)
              .eq('location_id', locationResult.data.id)
              .maybeSingle()
            
            if (!uuidError && uuidData) {
              // Se tem coluna status, verificar se está ativo
              if (uuidData.status !== undefined) {
                return uuidData.status === 'active' || uuidData.status === 'accepted'
              }
              return true
            }
          }
        }
        // Se erro 406 e não encontrou, retornar false (não há match)
        return false
      }
      
      if (!directError && directData) {
        // Se tem coluna status, verificar se está ativo
        if (directData.status !== undefined) {
          return directData.status === 'active' || directData.status === 'accepted'
        }
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Busca locais próximos que o usuário ainda não deu match
   */
  static async getUnmatchedNearbyLocations(
    userId: string,
    lat: number,
    lng: number,
    radius: number = 5000
  ): Promise<ApiResponse<LocationData[]>> {
    try {
      // Primeiro, buscar locais próximos
      const nearbyResult = await this.getNearbyLocations(lat, lng, radius)
      if (nearbyResult.error || !nearbyResult.data) {
        return nearbyResult
      }

      // Buscar matches do usuário
      const matchesResult = await this.getUserLocationMatches(userId)
      if (matchesResult.error) {
        return matchesResult
      }

      const matchedLocationIds = new Set(
        (matchesResult.data || []).map((match: any) => match.location_id || match.location?.id)
      )

      // Filtrar locais que o usuário ainda não deu match
      const unmatchedLocations = nearbyResult.data.filter(
        location => !matchedLocationIds.has(location.id)
      )

      return { data: unmatchedLocations }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get unmatched nearby locations' }
    }
  }

  /**
   * Busca local por place_id do Google Places
   */
  static async getLocationByPlaceId(placeId: string): Promise<ApiResponse<LocationData>> {
    try {
      // Usar RPC ou query direta com tratamento de erro 406
      const { data, error } = await supabase
        .from('locations')
        .select('id,name,address,type,place_id,lat,lng,rating,price_level,image_url,peak_hours,google_rating,google_place_data,created_at,updated_at,is_active,is_verified,owner_id')
        .eq('place_id', placeId)
        .maybeSingle() // Usar maybeSingle ao invés de single para evitar erro se não encontrar

      if (error) {
        // Erro 406 (Not Acceptable) geralmente significa que não encontrou ou problema de RLS
        // Tratar como "não encontrado" e não logar como erro crítico
        if (error.code === 'PGRST116' || error.status === 406 || error.message?.includes('406')) {
          // Local não encontrado - isso é esperado e não é um erro crítico
          return { error: 'Local não encontrado' }
        }
        // Outros erros devem ser logados
        console.warn('[LocationService] Erro ao buscar local por place_id:', error)
        throw error
      }

      if (!data) {
        return { error: 'Local não encontrado' }
      }

      return { data: data as LocationData }
    } catch (error) {
      // Se erro 406, tratar como não encontrado (não é erro crítico)
      if (error instanceof Error && (error.message?.includes('406') || error.message?.includes('Not Acceptable'))) {
        return { error: 'Local não encontrado' }
      }
      return { error: error instanceof Error ? error.message : 'Failed to get location by place_id' }
    }
  }

  /**
   * Cria um local no banco a partir de um GooglePlace/Location
   * Usa Edge Function para bypass RLS (usuários não podem inserir diretamente)
   */
  static async createLocationFromGooglePlace(location: any): Promise<ApiResponse<LocationData>> {
    try {
      // Determinar tipo baseado na categoria
      let type = 'bar' // Tipo padrão
      if (location.category === 'balada') {
        type = 'night_club'
      } else if (location.category === 'restaurante') {
        type = 'restaurant'
      } else if (location.category === 'bar') {
        type = 'bar'
      } else if (location.category === 'casa_de_show') {
        type = 'bar' // Usar bar como fallback
      }

      // Verificar se já existe
      const existing = await this.getLocationByPlaceId(location.place_id)
      if (existing.data) {
        return existing
      }

      // Preparar dados conforme estrutura real da tabela
      const locationData: any = {
        name: location.name,
        address: location.address || location.formatted_address || 'Endereço não disponível',
        type: type,
        place_id: location.place_id,
        lat: Number(location.location?.lat || location.location?.latitude || 0),
        lng: Number(location.location?.lng || location.location?.longitude || 0),
        rating: location.rating ? Number(location.rating) : 0,
        price_level: location.price_level ? Number(location.price_level) : 1,
        image_url: location.images?.[0] || '',
        peak_hours: [0, 0, 0, 0, 0], // Array obrigatório de 5 elementos
        google_rating: location.rating ? Number(location.rating) : null,
        google_place_data: {
          types: location.types,
          phone: location.phone || location.phone_number,
          website: location.website,
          opening_hours: location.opening_hours,
        },
      }

      // Validar dados antes de enviar
      if (!locationData.name || !locationData.address || !locationData.type || 
          locationData.lat === undefined || locationData.lng === undefined || 
          isNaN(locationData.lat) || isNaN(locationData.lng)) {
        return { 
          error: `Dados inválidos: name=${locationData.name}, address=${locationData.address}, type=${locationData.type}, lat=${locationData.lat}, lng=${locationData.lng}` 
        }
      }

      // Usar Edge Function para criar local (bypass RLS)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return { error: 'Usuário não autenticado' }
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(locationData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        
        // Log detalhado do erro para debug
        console.error('[LocationService] Erro ao criar local:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          locationData: {
            name: locationData.name,
            address: locationData.address,
            type: locationData.type,
            lat: locationData.lat,
            lng: locationData.lng,
            place_id: locationData.place_id,
          }
        })
        
        // Se a Edge Function não estiver disponível (404), tentar criar diretamente com RLS
        if (response.status === 404 || response.status === 0) {
          // Tentar criar diretamente (pode falhar por RLS, mas vamos tentar)
      const { data: directData, error: directError } = await supabase
            .from('locations')
            .insert(locationData)
            .select('id,name,address,type,place_id,lat,lng,rating,price_level,image_url,peak_hours,google_rating,google_place_data,created_at,updated_at,is_active,is_verified,owner_id')
            .single()
          
          if (directError) {
            return { error: `Edge Function não disponível e criação direta falhou: ${directError.message}` }
          }
          
          return { data: directData as LocationData }
        }
        
        return { error: errorData.error || `Erro ao criar local: ${response.statusText}` }
      }

      const result = await response.json()
      
      // Se já existe, buscar o existente
      if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
        return await this.getLocationByPlaceId(location.place_id)
      }

      if (result.error) {
        return { error: result.error }
      }

      return { data: result.data as LocationData }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create location from Google Place' }
    }
  }
}
