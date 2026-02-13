import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getPlaceImageUrl } from './imageCache';
import { getDeterministicImage, getPlaceholderImage } from './images';

export interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  distance: string;
  rating: number;
  vibe: string;
  peopleCount: number;
  vicinity: string;
  location: {
    lat: number;
    lng: number;
  };
}

// ===========================================
// CONFIGURAÇÃO DE API KEYS POR PLATAFORMA
// ===========================================

/**
 * Retorna a API key do Google Maps correta para a plataforma atual
 * iOS: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
 * Android: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
 */
export function getGoogleMapsApiKey(): string | null {
  const isIOS = Platform.OS === 'ios';
  
  if (isIOS) {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS || null;
  } else {
    // Android ou outras plataformas
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || null;
  }
}

/**
 * Log da plataforma e API key em uso (apenas em desenvolvimento)
 */
if (__DEV__) {
  const apiKey = getGoogleMapsApiKey();
  const platform = Platform.OS;
}

export const getNearbyPlaces = async (
  latitude: number,
  longitude: number,
  radius: number = 5000,
  type: string = 'restaurant|bar|cafe|night_club'
): Promise<Place[]> => {
  try {

    // Chamar a Edge Function 'search-nearby'
    const { data, error } = await supabase.functions.invoke('search-nearby', {
      body: {
        latitude,
        longitude,
        radius,
        search_mode: 'nearby', // ou 'combined'
        // type (vibe_category) será inferido na Edge Function se não passar nada, 
        // ou podemos passar 'vibe_category' se quisermos filtrar.
        // Por padrão, a função busca nightlife/entertainment/culture se não especificar.
      }
    });

    if (error) {
      console.error('❌ Supabase Function Error:', error);
      throw new Error(`Erro na função Supabase: ${error.message}`);
    }

    if (!data || !data.data) {
      console.warn('⚠️ Nenhum dado retornado pela função.');
      return [];
    }

    const places = data.data;

    // Pré-carrega as imagens em paralelo (background)
    const placesWithPhotos = places.filter((p: any) => p.photos && p.photos.length > 0);
    
    // Inicia o pré-carregamento de imagens em background (não bloqueia)
    if (placesWithPhotos.length > 0) {
      preloadImagesInBackground(placesWithPhotos);
    }

    // Transformar resposta da Edge Function (AppGooglePlace) para nossa interface Place
    return places.map((place: any) => {
      // Determina a URL da imagem
      // 1. Tenta usar imagem com cache (assíncrono, mas retorna placeholder inicial)
      // 2. Fallback para imagens do Unsplash baseadas na categoria
      
      let imageUrl = getPlaceholderImage(place.category); // Fallback padrão
      
      // Se tiver photo_reference, tenta usar a Edge Function de foto
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].photo_reference || place.photos[0].name;
        
        if (photoRef) {
          // Por enquanto usamos placeholder, mas a função loadPlaceImage vai
          // buscar a imagem real do cache ou da API
          // Para melhor UX, já deixamos a URL preparada
          imageUrl = getDeterministicImage(place.place_id, place.category);
        }
      }

      // Mapeamento de categorias (a Edge Function já retorna 'category' amigável como 'bar', 'nightclub', etc.)
      const categoryMap: Record<string, string> = {
        'nightclub': 'Balada',
        'bar': 'Bar',
        'restaurant': 'Restaurante',
        'cafe': 'Cafeteria',
        'museum': 'Museu',
        'theater': 'Teatro',
        'park': 'Parque',
        'live_music': 'Música ao Vivo',
        'comedy_club': 'Comédia',
        'other': 'Lugar'
      };

      // Mapeamento de Vibes
      const vibeMap: Record<string, string> = {
        'party': 'Festa & Agito',
        'sophisticated': 'Sofisticado',
        'casual': 'Casual & Relax',
        'culture': 'Cultura & Arte',
        'live_music': 'Música Ao Vivo',
        'groups': 'Para Grupos',
        'alternative': 'Alternativo'
      };

      // Pega a primeira vibe ou gera uma baseada na categoria
      let vibe = 'Legal';
      if (place.vibes && place.vibes.length > 0) {
        vibe = vibeMap[place.vibes[0]] || place.vibes[0];
      } else {
        vibe = place.rating > 4.5 ? 'Muito Popular' : 'Casual';
      }

      return {
        id: place.place_id,
        name: place.name,
        category: categoryMap[place.category] || 'Lugar',
        image: imageUrl, // Temporário: imagem placeholder para evitar erro de API Key na imagem
        distance: '...', // Calculado na UI
        rating: place.rating || 0,
        vibe: vibe,
        peopleCount: Math.floor(Math.random() * 50) + 5, // Mock
        vicinity: place.formatted_address || place.vicinity,
        location: {
          lat: place.geometry?.location?.lat || place.lat,
          lng: place.geometry?.location?.lng || place.lng
        }
      };
    });

  } catch (error) {
    console.error('Error fetching nearby places via Edge Function:', error);
    throw error; // Propaga erro para a UI mostrar
  }
};

export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): string => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  
  if (d < 1) {
    return `${Math.round(d * 1000)}m`;
  }
  return `${d.toFixed(1)} km`;
};

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  
  const location = await Location.getCurrentPositionAsync({});
  return location;
};

// ===========================================
// FUNÇÕES DE CACHE DE IMAGENS
// ===========================================

/**
 * Pré-carrega imagens em background (não bloqueia a UI)
 */
async function preloadImagesInBackground(places: any[]): Promise<void> {
  try {
    const promises = places.map(async (place) => {
      const photoRef = place.photos?.[0]?.photo_reference || place.photos?.[0]?.name;
      if (photoRef && place.place_id) {
        // Tenta buscar do cache ou da API
        const cachedUrl = await getPlaceImageUrl(place.place_id, photoRef, 600);
        if (cachedUrl) {
        }
      }
    });

    // Limita a 5 requisições simultâneas para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      await Promise.all(batch);
      // Pequena pausa entre batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Erro no pré-carregamento de imagens:', error);
  }
}

/**
 * Carrega a imagem de um lugar específico (para uso em componentes)
 * 
 * Uso em um componente React:
 * ```
 * const [imageUrl, setImageUrl] = useState(place.image);
 * 
 * useEffect(() => {
 *   loadPlaceImageWithCache(place).then(setImageUrl);
 * }, [place]);
 * ```
 */
export async function loadPlaceImageWithCache(
  place: Place & { photoReference?: string }
): Promise<string> {
  // Se já tem photoReference explicitamente
  if (place.photoReference) {
    const cached = await getPlaceImageUrl(place.id, place.photoReference, 600);
    if (cached) return cached;
  }
  
  // Retorna a imagem atual (placeholder ou já cacheada)
  return place.image;
}

/**
 * Busca a URL de imagem de um lugar específico pelo ID
 * Útil quando você tem o place_id e photo_reference
 */
export async function fetchPlaceImage(
  placeId: string,
  photoReference: string,
  fallbackCategory?: string
): Promise<string> {
  const cached = await getPlaceImageUrl(placeId, photoReference, 600);
  if (cached) return cached;
  
  // Fallback
  return getPlaceholderImage(fallbackCategory);
}
