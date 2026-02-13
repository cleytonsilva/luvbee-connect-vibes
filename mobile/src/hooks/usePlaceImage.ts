// usePlaceImage.ts - Hook para carregar imagens de lugares com cache

import { useState, useEffect, useCallback } from 'react';
import { getPlaceImageUrl } from '../services/imageCache';
import { getPlaceholderImage, getDeterministicImage } from '../services/images';

interface UsePlaceImageOptions {
  maxWidth?: number;
  fallbackCategory?: string;
  autoLoad?: boolean;
}

interface UsePlaceImageReturn {
  imageUrl: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para carregar imagem de um lugar com cache
 * 
 * @example
 * ```tsx
 * function PlaceCard({ place }) {
 *   const { imageUrl, isLoading } = usePlaceImage(
 *     place.id, 
 *     place.photoReference, 
 *     { fallbackCategory: place.category }
 *   );
 *   
 *   return (
 *     <Image 
 *       source={{ uri: imageUrl }} 
 *       style={styles.image}
 *       placeholder={isLoading}
 *     />
 *   );
 * }
 * ```
 */
export function usePlaceImage(
  placeId: string | undefined,
  photoReference: string | undefined,
  options: UsePlaceImageOptions = {}
): UsePlaceImageReturn {
  const { maxWidth = 600, fallbackCategory = 'default', autoLoad = true } = options;
  
  // Imagem inicial: placeholder determinístico baseado no placeId
  const initialImage = placeId 
    ? getDeterministicImage(placeId, fallbackCategory)
    : getPlaceholderImage(fallbackCategory);
  
  const [imageUrl, setImageUrl] = useState<string>(initialImage);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const loadImage = useCallback(async () => {
    if (!placeId || !photoReference) {
      setImageUrl(getPlaceholderImage(fallbackCategory));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cachedUrl = await getPlaceImageUrl(placeId, photoReference, maxWidth);
      
      if (cachedUrl) {
        setImageUrl(cachedUrl);
      } else {
        // Se falhou, mantém o placeholder
        console.warn('Não foi possível carregar imagem do cache:', placeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar imagem'));
      console.error('Erro no usePlaceImage:', err);
    } finally {
      setIsLoading(false);
    }
  }, [placeId, photoReference, maxWidth, fallbackCategory]);

  useEffect(() => {
    if (autoLoad) {
      loadImage();
    }
  }, [autoLoad, loadImage]);

  return {
    imageUrl,
    isLoading,
    error,
    refetch: loadImage
  };
}

/**
 * Hook para pré-carregar múltiplas imagens
 * Útil para telas de lista
 */
export function usePreloadPlaceImages() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const preloadImages = useCallback(async (
    places: Array<{ place_id: string; photos?: Array<{ photo_reference?: string; name?: string }> }>
  ) => {
    setIsPreloading(true);
    setProgress(0);

    const placesWithPhotos = places.filter(p => p.photos && p.photos.length > 0);
    const total = placesWithPhotos.length;
    let completed = 0;

    const batchSize = 3; // Processa 3 de cada vez para não sobrecarregar

    for (let i = 0; i < placesWithPhotos.length; i += batchSize) {
      const batch = placesWithPhotos.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (place) => {
          const photoRef = place.photos![0].photo_reference || place.photos![0].name;
          if (photoRef) {
            try {
              await getPlaceImageUrl(place.place_id, photoRef);
            } catch (error) {
              // Ignora erros individuais
            }
          }
          completed++;
        })
      );

      setProgress(Math.round((completed / total) * 100));
      
      // Pequena pausa entre batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsPreloading(false);
  }, []);

  return {
    preloadImages,
    isPreloading,
    progress
  };
}

export default usePlaceImage;
