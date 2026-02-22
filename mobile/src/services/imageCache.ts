// imageCache.ts - Serviço de cache de imagens no Supabase Storage
// Quando uma imagem é buscada do Google Places, ela é salva no Storage
// e reutilizada nas próximas vezes (sem custo adicional)

import { supabase, getGoogleMapsApiKey } from './supabase';
import { Platform } from 'react-native';

// ===========================================
// CONFIGURAÇÃO
// ===========================================

const STORAGE_BUCKET = 'places'; // Bucket já existente no projeto
const CACHE_DAYS = 30; // Tempo de vida do cache em dias

// ===========================================
// TIPOS
// ===========================================

interface CachedImage {
  id: string;
  place_id: string;
  photo_reference: string;
  storage_path: string;
  public_url: string;
  created_at: string;
  expires_at: string;
}

// Cache em memória para evitar múltiplas requisições durante a sessão
const memoryCache: Map<string, string> = new Map();
const pendingRequests: Map<string, Promise<string | null>> = new Map();

// ===========================================
// FUNÇÕES AUXILIARES
// ===========================================

/**
 * Gera um hash consistente para o photo_reference
 */
function generateImageHash(photoReference: string): string {
  let hash = 0;
  for (let i = 0; i < photoReference.length; i++) {
    const char = photoReference.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Gera o nome do arquivo baseado no place_id e photo_reference
 */
function generateFileName(placeId: string, photoReference: string): string {
  const hash = generateImageHash(photoReference);
  const cleanPlaceId = placeId.replace(/[^a-zA-Z0-9]/g, '_');
  return `${cleanPlaceId}_${hash}.jpg`;
}

/**
 * Verifica se o bucket existe (o bucket 'places' já deve estar criado)
 */
async function ensureBucketExists(): Promise<boolean> {
  try {
    // O bucket 'places' já existe no projeto
    // Apenas verificamos se conseguimos acessá-lo
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', {
      limit: 1
    });

    if (error) {
      console.error('Erro ao acessar bucket:', error);
      console.warn('⚠️ Verifique se o bucket "places" existe e está configurado como público');
      return false;
    }

    return true;

  } catch (error) {
    console.error('Erro ao verificar bucket:', error);
    return false;
  }
}

// ===========================================
// FUNÇÕES PRINCIPAIS
// ===========================================

/**
 * Busca imagem cacheada no banco de dados
 */
async function getCachedImageFromDB(placeId: string, photoReference: string): Promise<CachedImage | null> {
  try {
    const { data, error } = await supabase
      .from('cached_images')
      .select('*')
      .eq('place_id', placeId)
      .eq('photo_reference', photoReference)
      .single();

    if (error || !data) {
      return null;
    }

    // Verifica se o cache expirou
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Remove do cache (assíncrono, não espera)
      deleteCachedImage(data.id, data.storage_path);
      return null;
    }

    return data as CachedImage;

  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    return null;
  }
}

/**
 * Salva imagem no cache (banco + storage)
 */
async function saveImageToCache(
  placeId: string,
  photoReference: string,
  imageBlob: Blob
): Promise<CachedImage | null> {
  try {
    // Gera nome do arquivo
    const fileName = generateFileName(placeId, photoReference);
    const filePath = `${fileName}`;

    // Upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      return null;
    }

    // Pega a URL pública
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Calcula data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DAYS);

    // Salva no banco
    const { data, error: dbError } = await supabase
      .from('cached_images')
      .insert([{
        place_id: placeId,
        photo_reference: photoReference,
        storage_path: filePath,
        public_url: publicUrl,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar no DB:', dbError);
      // Remove do storage se falhou no DB
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return null;
    }

    return data as CachedImage;

  } catch (error) {
    console.error('Erro ao salvar no cache:', error);
    return null;
  }
}

/**
 * Remove imagem do cache
 */
async function deleteCachedImage(id: string, storagePath: string): Promise<void> {
  try {
    // Remove do storage
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

    // Remove do banco
    await supabase.from('cached_images').delete().eq('id', id);

  } catch (error) {
    console.error('Erro ao remover cache:', error);
  }
}

// ===========================================
// FUNÇÃO PRINCIPAL: OBTER IMAGEM COM CACHE
// ===========================================

/**
 * Obtém a URL de uma imagem de lugar (com cache em memória e deduplicação)
 * 
 * Fluxo:
 * 1. Verifica cache em memória (mais rápido)
 * 2. Se já tem requisição pendente, aguarda ela
 * 3. Verifica cache DB (Supabase cached_images)
 * 4. Se não existe, busca do Google via Edge Function
 */
export async function getPlaceImageUrl(
  placeId: string,
  photoReference: string,
  maxWidth: number = 600
): Promise<string | null> {
  const cacheKey = `${placeId}:${photoReference.substring(0, 20)}`;

  // 1. Verifica cache em memória (instantâneo)
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    return memoryCached;
  }

  // 2. Se já tem requisição pendente para essa imagem, aguarda ela
  const pendingRequest = pendingRequests.get(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  // 3. Cria uma nova requisição e a registra
  const fetchPromise = (async (): Promise<string | null> => {
    try {
      // Verifica cache DB
      const cached = await getCachedImageFromDB(placeId, photoReference);
      if (cached) {
        memoryCache.set(cacheKey, cached.public_url);
        return cached.public_url;
      }

      // Busca do Google via Edge Function

      const { data, error } = await supabase.functions.invoke('get-place-photo', {
        body: {
          photoreference: photoReference,
          maxwidth: maxWidth
        }
      });

      if (error || !data) {
        if (error) {
          console.error('Erro ao buscar imagem (Edge Function):', error.message || error);
        }

        // Fallback: Tentativa de usar a chave de API pública do Frontend diretamente
        const frontendApiKey = getGoogleMapsApiKey();
        if (frontendApiKey) {
          console.warn('⚠️ Usando Fallback Direto da API do Google Maps para a imagem (Key específica do dispositivo).');
          return getGoogleDirectImageUrl(photoReference, frontendApiKey, maxWidth);
        }

        return null;
      }

      // Usar image_data como data URI ou image_url
      let imageUrl: string | null = null;

      if (data.image_data && data.content_type) {
        imageUrl = `data:${data.content_type};base64,${data.image_data}`;
      } else if (data.image_url) {
        imageUrl = data.image_url;
      }

      if (imageUrl) {
        // Salva no cache em memória
        memoryCache.set(cacheKey, imageUrl);
      }

      return imageUrl;

    } catch (error) {
      console.error('Erro em getPlaceImageUrl:', error);
      return null;
    } finally {
      // Remove da lista de pendentes quando terminar
      pendingRequests.delete(cacheKey);
    }
  })();

  // Registra a requisição como pendente
  pendingRequests.set(cacheKey, fetchPromise);

  return fetchPromise;
}

/**
 * Pré-carrega imagens de múltiplos lugares (útil para lista)
 */
export async function preloadPlaceImages(
  places: Array<{ place_id: string; photos?: Array<{ photo_reference?: string; name?: string }> }>
): Promise<void> {
  const promises = places
    .filter(p => p.photos && p.photos.length > 0)
    .map(async (place) => {
      const photoRef = place.photos![0].photo_reference || place.photos![0].name;
      if (photoRef) {
        // Não espera o resultado, apenas dispara o cache em background
        getPlaceImageUrl(place.place_id, photoRef).catch(() => { });
      }
    });

  await Promise.all(promises);
}

/**
 * Limpa todo o cache de imagens (útil para manutenção)
 */
export async function clearImageCache(): Promise<boolean> {
  try {
    // Lista todos os arquivos no bucket
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list();

    if (listError) {
      console.error('Erro ao listar arquivos:', listError);
      return false;
    }

    if (files && files.length > 0) {
      const fileNames = files.map(f => f.name);

      // Remove todos os arquivos
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(fileNames);

      if (removeError) {
        console.error('Erro ao remover arquivos:', removeError);
        return false;
      }
    }

    // Limpa o banco
    const { error: dbError } = await supabase
      .from('cached_images')
      .delete()
      .neq('id', '0'); // Remove todos

    if (dbError) {
      console.error('Erro ao limpar DB:', dbError);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return false;
  }
}

// ===========================================
// FALLBACK: URLs do Google diretas (sem cache)
// ===========================================

/**
 * Retorna URL direta do Google (se tivermos uma API key no cliente - NÃO RECOMENDADO)
 * Use apenas como último recurso
 */
export function getGoogleDirectImageUrl(
  photoReference: string,
  apiKey: string,
  maxWidth: number = 600
): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}

export default {
  getPlaceImageUrl,
  preloadPlaceImages,
  clearImageCache,
  getGoogleDirectImageUrl
};
