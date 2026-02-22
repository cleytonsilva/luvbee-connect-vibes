import { supabase, getGoogleMapsApiKey } from './supabase';
import { getDeterministicImage } from './images';

// ===========================================
// CHAVE DO GOOGLE MAPS (apenas para busca, não para fotos)
// ===========================================

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// ===========================================
// TIPOS DO GOOGLE PLACES
// ===========================================

export interface GooglePlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  photos?: GooglePlacePhoto[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  primary_type?: string;
  description?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  website?: string;
  google_maps_uri?: string;
  business_status?: string;
  category?: string;
  vibes?: string[];
  features?: {
    live_music?: boolean;
    serves_beer?: boolean;
    serves_wine?: boolean;
    serves_cocktails?: boolean;
    good_for_groups?: boolean;
    outdoor_seating?: boolean;
  };
}

export interface LocationWithStats {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  address: string;
  rating: string | null;
  price_level: number | null;
  lat: string | null;
  lng: string | null;
  description: string | null;
  distance?: string;
  matchCount?: number;
  likedAt?: string;
  category?: string;
  vibe?: string;
  peopleCount?: number;
  is_active?: boolean;
  google_place_id?: string;
  // Dados de fotos do Google Places para carregamento dinâmico
  photos?: Array<{ photo_reference?: string; name?: string }>;
  photoReference?: string; // Photo reference principal para carregamento rápido
  _googlePlaceData?: any; // Dados brutos do Google Places para persistência
}

// ===========================================
// BUSCAR CONTAGEM DE LIKES EM BATCH
// ===========================================

async function batchGetLikesCount(placeIds: string[]): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  if (placeIds.length === 0) return countMap;

  try {
    const { data, error } = await supabase
      .from('user_locations')
      .select('google_place_id')
      .in('google_place_id', placeIds)
      .eq('status', 'liked');

    if (error || !data) return countMap;

    data.forEach(row => {
      const current = countMap.get(row.google_place_id) || 0;
      countMap.set(row.google_place_id, current + 1);
    });
  } catch (error) {
    console.warn('⚠️ Erro ao buscar contagem de likes:', error);
  }

  return countMap;
}

// ===========================================
// BUSCAR LUGARES VIA EDGE FUNCTION
// ===========================================

export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  category?: string,
  userId?: string
): Promise<LocationWithStats[]> {
  try {
    let filteredPlaces: GooglePlace[] = [];

    try {
      const { data, error } = await supabase.functions.invoke('search-nearby', {
        body: {
          latitude,
          longitude,
          radius,
          category,
          search_mode: 'combined',
          language: 'pt-BR',
        },
      });

      if (error) {
        console.warn('⚠️ Erro na edge function:', error);
      } else if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        filteredPlaces = data.data;
      }
    } catch (e) {
      console.warn('⚠️ Falha ao buscar da nuvem:', e);
    }

    // FALLBACK DIRETO DO CELULAR (Evita o erro de API Key de Web/Servidor)
    if (filteredPlaces.length === 0) {
      console.warn('⚠️ 0 lugares no backend. Tentando Busca Direta (Fallback Mobile)...');
      const fallbackApiKey = getGoogleMapsApiKey();

      if (!fallbackApiKey) {
        console.warn('❌ API Key de iOS/Android não configurada no env local para fallback.');
        return [];
      }

      const query = category || 'estabelecimentos';
      const fallbackUrl = `https://places.googleapis.com/v1/places:searchText`;

      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': fallbackApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.types,places.primaryType,places.location',
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: Math.min(radius, 50000), // Max allowed API radius
            }
          },
          maxResultCount: 20,
          languageCode: 'pt-BR',
        })
      });

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error('❌ Erro no Fallback do Google API:', errorText);
      } else {
        const fbData = await fallbackResponse.json();
        if (fbData.places) {
          filteredPlaces = fbData.places.map((p: any) => ({
            place_id: p.id,
            name: p.displayName?.text || 'Sem Nome',
            formatted_address: p.formattedAddress || '',
            geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
            photos: p.photos?.map((photo: any) => ({ photo_reference: photo.name, width: photo.widthPx, height: photo.heightPx })),
            rating: p.rating,
            user_ratings_total: p.userRatingCount,
            types: p.types,
            primary_type: p.primaryType,
            description: `${p.primaryType || 'Local'} • ${p.rating || '?'} ⭐ via Fallback`
          }));
        }
      }
    }

    if (filteredPlaces.length === 0) {
      console.warn('⚠️ Nenhum lugar encontrado após backend e fallback.');
      return [];
    }

    // Se tiver userId, filtrar locais que o usuário já interagiu (liked/passed/blocked)
    if (userId) {
      const { data: userInteractions } = await supabase
        .from('user_locations')
        .select('google_place_id')
        .eq('user_id', userId);

      if (userInteractions && userInteractions.length > 0) {
        const interactedPlaceIds = new Set(userInteractions.map(i => i.google_place_id));
        filteredPlaces = filteredPlaces.filter((p: GooglePlace) => !interactedPlaceIds.has(p.place_id));
      }
    }

    // Buscar contagem real de likes por lugar (batch query)
    const placeIds = filteredPlaces.map((p: GooglePlace) => p.place_id).filter(Boolean);
    const likesCountMap = await batchGetLikesCount(placeIds);

    // Mapear para o formato do app com imagens de placeholder
    return filteredPlaces.map((place: GooglePlace) => {
      const categoryType = place.category || place.primary_type || place.types?.[0] || 'default';

      // Usar imagem determinística baseada no place_id (mesmo lugar = mesma imagem)
      const imageUrl = getDeterministicImage(place.place_id, categoryType);

      return {
        id: place.place_id,
        google_place_id: place.place_id,
        name: place.name,
        type: place.category || place.primary_type || place.types?.[0] || 'local',
        image_url: imageUrl,
        address: place.formatted_address,
        rating: place.rating?.toString() || null,
        price_level: place.price_level || null,
        lat: place.geometry?.location?.lat?.toString() || null,
        lng: place.geometry?.location?.lng?.toString() || null,
        description: place.description || null,
        category: mapTypeToCategory(place.category || place.types?.[0]),
        vibe: place.vibes?.[0] || getVibeFromType(place.types?.[0]),
        distance: '~1 km',
        peopleCount: likesCountMap.get(place.place_id) || 0,
        is_active: true,
        // Incluir dados de fotos para carregamento dinâmico de imagens do Google
        photos: place.photos || [],
        _googlePlaceData: place,
      };
    });
  } catch (error) {
    console.error('❌ Erro ao buscar lugares:', error);
    throw error;
  }
}

// ===========================================
// LIKE / PASS - USAR EDGE FUNCTION
// ===========================================

export async function likeLocation(userId: string, placeId: string, placeData?: GooglePlace): Promise<void> {
  try {
    // Dados para upsert
    const upsertData = {
      user_id: userId,
      google_place_id: placeId,
      status: 'liked',
      place_data: placeData || null,
      created_at: new Date().toISOString(),
    };

    // Tentar inserir diretamente em user_locations (mais rápido que Edge Function)
    const { error: directError } = await supabase
      .from('user_locations')
      .upsert(upsertData, { onConflict: 'user_id,google_place_id' });

    if (directError) {
      console.warn('⚠️ Inserção direta falhou, tentando edge function:', directError);

      // Fallback: usar Edge Function
      const { error } = await supabase.functions.invoke('save-user-location', {
        body: {
          user_id: userId,
          google_place_id: placeId,
          status: 'liked',
          place_data: placeData,
        },
      });

      if (error) throw error;
    }

  } catch (error) {
    console.error('❌ Erro ao curtir lugar:', error);
    throw error;
  }
}

export async function passLocation(userId: string, placeId: string, placeData?: GooglePlace): Promise<void> {
  try {
    // Dados para upsert
    const upsertData = {
      user_id: userId,
      google_place_id: placeId,
      status: 'passed',
      place_data: placeData || null,
      created_at: new Date().toISOString(),
    };

    // Tentar inserir diretamente em user_locations (mais rápido)
    const { error: directError } = await supabase
      .from('user_locations')
      .upsert(upsertData, { onConflict: 'user_id,google_place_id' });

    if (directError) {
      console.warn('⚠️ Inserção direta falhou:', directError);

      // Fallback: usar Edge Function
      const { error } = await supabase.functions.invoke('save-user-location', {
        body: {
          user_id: userId,
          google_place_id: placeId,
          status: 'passed',
          place_data: placeData,
        },
      });

      if (error) throw error;
    }

  } catch (error) {
    console.error('❌ Erro ao passar lugar:', error);
    throw error;
  }
}

/**
 * Remove o like de um lugar (descurtir)
 */
export async function unlikeLocation(userId: string, placeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_locations')
      .delete()
      .eq('user_id', userId)
      .eq('google_place_id', placeId);

    if (error) throw error;

  } catch (error) {
    console.error('❌ Erro ao descurtir lugar:', error);
    throw error;
  }
}

/**
 * Obtém a contagem de likes de um lugar
 */
export async function getPlaceLikesCount(placeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_locations')
      .select('*', { count: 'exact', head: true })
      .eq('google_place_id', placeId)
      .eq('status', 'liked');

    if (error) {
      console.warn('⚠️ Erro ao buscar likes:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ Erro ao contar likes:', error);
    return 0;
  }
}

// ===========================================
// FUNÇÕES DO SUPABASE (likes, matches, etc)
// ===========================================

// ===========================================
// FUNÇÕES DO SUPABASE (likes, matches, etc)
// ===========================================

export async function getDiscoverLocations(userId: string): Promise<LocationWithStats[]> {
  try {
    // Retornar array vazio - os lugares serão buscados do Google Places API
    // e filtrados no cliente
    return [];
  } catch (error) {
    console.error('❌ Erro em getDiscoverLocations:', error);
    return [];
  }
}

export async function getLikedLocations(userId: string): Promise<LocationWithStats[]> {
  try {
    // Buscar lugares curtidos do usuário
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'liked')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const likedPlaces: LocationWithStats[] = [];
    const missingDataPlaceIds: string[] = [];

    // Primeiro passo: Processar os que já têm dados
    for (const item of (data || [])) {
      if (item.place_data) {
        likedPlaces.push(mapGooglePlaceToLocation(item.place_data, item.google_place_id, item.created_at));
      } else if (item.google_place_id) {
        missingDataPlaceIds.push(item.google_place_id);
      }
    }

    // Segundo passo: Buscar dados para os que faltam (se houver)
    // Nota: Idealmente teríamos um endpoint batch-get-details, mas vamos usar o search-nearby
    // ou assumir placeholders temporários se falhar.
    // Por enquanto, vamos retornar placeholders funcionais para não travar a UI.

    for (const placeId of missingDataPlaceIds) {
      // Tentar buscar detalhes (mock ou future implementation)
      // Por enquanto, fallback elegante
      likedPlaces.push({
        id: placeId,
        google_place_id: placeId,
        name: 'Carregando detalhes...',
        type: 'Local',
        image_url: getDeterministicImage(placeId, 'default'),
        address: 'Toque para atualizar',
        rating: null,
        price_level: null,
        lat: null,
        lng: null,
        description: null,
        category: 'Local',
        vibe: 'Misterioso',
        distance: '',
        likedAt: formatRelativeTime(new Date().toISOString()),
        photos: [],
      });
    }

    return likedPlaces;
  } catch (error) {
    console.error('❌ Erro em getLikedLocations:', error);
    throw error;
  }
}

// Helper para mapear GooglePlace -> LocationWithStats
function mapGooglePlaceToLocation(place: any, id: string, createdAt?: string): LocationWithStats {
  const categoryType = place.category || place.types?.[0] || 'default';
  return {
    id: id,
    google_place_id: id,
    name: place.name || 'Lugar sem nome',
    type: place.category || place.types?.[0] || 'local',
    image_url: getDeterministicImage(place.place_id || id, categoryType),
    address: place.formatted_address || '',
    rating: place.rating?.toString() || null,
    price_level: place.price_level || null,
    lat: place.geometry?.location?.lat?.toString() || null,
    lng: place.geometry?.location?.lng?.toString() || null,
    description: place.description || null,
    category: mapTypeToCategory(place.category || place.types?.[0]),
    vibe: getVibeFromType(place.types?.[0]),
    distance: '~1 km',
    likedAt: createdAt ? formatRelativeTime(createdAt) : undefined,
    photos: place.photos || [],
    _googlePlaceData: place,
  };
}

// ===========================================
// HELPERS
// ===========================================

function mapTypeToCategory(type: string | undefined): string {
  const categoryMap: Record<string, string> = {
    bar: 'Bar',
    nightclub: 'Balada',
    restaurant: 'Restaurante',
    cafe: 'Cafeteria',
    museum: 'Museu',
    theater: 'Teatro',
    art_gallery: 'Galeria de Arte',
    live_music: 'Música ao Vivo',
    comedy_club: 'Comédia',
    park: 'Parque',
    shopping: 'Shopping',
    library: 'Biblioteca',
  };
  const key = type?.toLowerCase() || '';
  return categoryMap[key] || 'Local';
}

function getVibeFromType(type: string | undefined): string {
  const vibeMap: Record<string, string> = {
    bar: 'Animado',
    nightclub: 'Festivo',
    restaurant: 'Casual',
    cafe: 'Tranquilo',
    museum: 'Cultural',
    theater: 'Artístico',
    live_music: 'Energético',
    comedy_club: 'Divertido',
    library: 'Intelectual',
    art_gallery: 'Inspirador',
    park: 'Relaxante',
    shopping: 'Movimentado',
  };
  const key = type?.toLowerCase() || '';
  return vibeMap[key] || 'Interessante';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  return `${diffDays} dias atrás`;
}

export default {
  searchNearbyPlaces,
  getDiscoverLocations,
  getLikedLocations,
  likeLocation,
  passLocation,
};
