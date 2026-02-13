import { MapPin, Star, X, Wine, Beer, Martini, Users, Music } from "lucide-react";
import { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Location } from "@/types/location.types";
import { ImageCacheService } from "@/services/imageCache";
import { usePlacePhoto } from "@/hooks/usePlacePhoto";
import { GooglePlacesService } from "@/services/google-places.service";
import { supabase } from "@/integrations/supabase";

interface LocationCardProps {
  location: Location;
  distance?: string;
  onLike?: () => void;
  onDislike?: () => void;
  onLocationClick?: (locationId: string) => void;
  mutualLikesCount?: number;
  isHighlighted?: boolean;
}

export const LocationCard = ({
  location,
  distance,
  onLike,
  onDislike,
  onLocationClick,
  mutualLikesCount,
  isHighlighted = false,
}: LocationCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Fallback para nome e endereço
  const displayName = location.name || "Local Desconhecido";
  const address = location.address || "";

  // Dados do Google Places
  const editorialSummary = (location as any).editorial_summary ||
    (location as any).editorialSummary?.text ||
    (location as any).generative_summary ||
    (location as any).generativeSummary?.overview?.text ||
    location.description || "";

  const rating = Number(location.google_rating || location.rating || 0);
  const userRatingCount = location.google_user_ratings_total || (location as any).user_ratings_total || (location.google_place_data as any)?.user_ratings_total || 0;

  // Preço ($$)
  const priceLevel = location.price_level || 0;
  const priceString = "$".repeat(priceLevel) || "";

  // Tipo traduzido
  const typeTranslations: Record<string, string> = {
    'museum': 'Museu',
    'gallery': 'Galeria',
    'theater': 'Teatro',
    'library': 'Biblioteca',
    'bar': 'Bar',
    'club': 'Balada',
    'restaurant': 'Restaurante',
    'cafe': 'Café',
    'bakery': 'Padaria',
    'education': 'Educação',
    'attraction': 'Atração',
    'park': 'Parque',
    'local': 'Local',
    'tourist': 'Turismo',
    'night_club': 'Balada',
    'pub': 'Pub',
    'lounge': 'Lounge',
    'rooftop': 'Rooftop'
  };
  const rawType = (location as any).category || location.type || "Local";
  const typeName = typeTranslations[rawType] || rawType.charAt(0).toUpperCase() + rawType.slice(1);

  // Features
  const features = location.features || (location as any).google_place_data?.features;

  // NOVA LÓGICA DE IMAGEM - Prioridade:
  // 1. Bucket 'places' (cache local)
  // 2. URL salva no banco (se válida)
  // 3. Google Places API
  // 4. Placeholder
  const getImageUrl = useMemo(() => {
    // Função async para buscar imagem
    return async (): Promise<string> => {
      // 1. Verificar bucket 'places' primeiro (cache local)
      const cachedUrl = await ImageCacheService.getImageUrl(location.place_id || location.id);
      if (cachedUrl) {
        return cachedUrl;
      }

      // 2. Verificar image_storage_path (caminho no storage)
      if (location.image_storage_path) {
        const { data } = supabase.storage.from('places').getPublicUrl(location.image_storage_path);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }

      // 3. Verificar image_url (URL externa salva)
      if (location.image_url && location.image_url.startsWith('http')) {
        // Evitar URLs malformadas do PhotoService
        if (!location.image_url.includes('PhotoService.GetPhoto') && 
            !location.image_url.includes('googleusercontent.com')) {
          return location.image_url;
        }
      }

      // 4. Tentar buscar do Google Places
      const photos = (location.google_place_data as any)?.photos || (location as any).photos;
      if (photos && Array.isArray(photos) && photos.length > 0) {
        const firstPhoto = photos[0];
        let photoRef = '';

        if (typeof firstPhoto === 'string') {
          photoRef = firstPhoto;
        } else if (typeof firstPhoto === 'object') {
          photoRef = firstPhoto.photo_reference || firstPhoto.name;
        }

        if (photoRef && !photoRef.includes('PhotoService.GetPhoto') && !photoRef.startsWith('http')) {
          return GooglePlacesService.getPhotoUrl(photoRef, 800);
        }
      }

      // 5. Fallback para placeholder
      return '/placeholder-location.jpg';
    };
  }, [location]);

  const [imageUrl, setImageUrl] = useState<string>('/placeholder-location.jpg');
  
  // Carregar imagem ao montar componente
  useState(() => {
    getImageUrl().then(url => {
      setImageUrl(url);
    });
  });

  // Hook usePlacePhoto como fallback adicional
  const photoUrl = usePlacePhoto(location.place_id || null, imageUrl);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onLocationClick?.(location.id || location.place_id || "");
  };

  return (
    <div
      className={`relative w-full min-h-[500px] rounded-2xl overflow-hidden border shadow-lg bg-black group cursor-pointer transition-all duration-300 ${
        isHighlighted
          ? 'border-yellow-400 ring-4 ring-yellow-400/50 animate-pulse'
          : 'border-white/20'
      }`}
      onClick={handleCardClick}
    >
      {/* Imagem de Fundo */}
      <div className="absolute inset-0 z-0 bg-gray-900">
        <img
          src={photoUrl || imageUrl}
          alt={displayName}
          className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => {
            setImageLoading(false);
          }}
          onError={(e) => {
            console.warn(`[LocationCard] Image Error for ${displayName}:`, e.currentTarget.src);
            e.currentTarget.src = '/placeholder-location.jpg';
            e.currentTarget.classList.remove('opacity-0');
            e.currentTarget.classList.add('opacity-100');
            setImageLoading(false);
          }}
        />
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <Skeleton className="w-full h-full bg-gray-800 animate-pulse" />
          </div>
        )}

        {/* Gradiente Bottom-Up */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Conteúdo Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 z-10 flex flex-col gap-4 text-white">
        {/* Badges de Topo */}
        <div className="flex flex-wrap gap-2 mb-1">
          {rating > 0 && (
            <Badge className="bg-white text-black border border-gray-200 font-bold text-sm shadow-sm rounded-md">
              <Star className="w-3 h-3 mr-1 fill-black" />
              {rating.toFixed(1)} {userRatingCount > 0 && <span className="text-gray-600 font-normal ml-1">({userRatingCount})</span>}
            </Badge>
          )}

          {priceString && (
            <Badge className="bg-green-400 text-black border-transparent font-bold text-sm shadow-sm rounded-md">
              {priceString}
            </Badge>
          )}

          <Badge className="bg-yellow-400 text-black border-transparent font-bold text-sm shadow-sm uppercase rounded-md">
            {typeName}
          </Badge>

          {distance && (
            <Badge className="bg-black/50 backdrop-blur-md text-white border border-white/20 font-mono text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {distance}
            </Badge>
          )}

          {mutualLikesCount !== undefined && mutualLikesCount > 0 && (
            <Badge className="bg-pink-500 text-white border-transparent font-bold text-sm shadow-sm rounded-md">
              {mutualLikesCount} {mutualLikesCount === 1 ? 'pessoa curtiu' : 'pessoas curtiram'}
            </Badge>
          )}
        </div>

        {/* Features Icons */}
        {features && (
          <div className="flex gap-3 mb-2 text-white/90">
            {features.serves_wine && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md" title="Serve Vinho">
                <Wine className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium">Vinhos</span>
              </div>
            )}
            {features.serves_cocktails && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md" title="Coquetéis">
                <Martini className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-medium">Drinks</span>
              </div>
            )}
            {features.serves_beer && !features.serves_cocktails && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md" title="Cerveja">
                <Beer className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium">Cerveja</span>
              </div>
            )}
            {features.live_music && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md" title="Música ao Vivo">
                <Music className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium">Ao Vivo</span>
              </div>
            )}
            {features.good_for_groups && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md" title="Bom para Grupos">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        )}

        {/* Título e Endereço */}
        <div>
          <h1 className="text-4xl font-black font-space-grotesk uppercase leading-none mb-2 drop-shadow-md text-white">
            {displayName}
          </h1>
          {address && (
            <p className="text-sm text-gray-300 font-mono truncate opacity-90">
              {address}
            </p>
          )}
        </div>

        {/* Editorial Summary */}
        {editorialSummary && (
          <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border-l-4 border-primary">
            <p className="text-sm italic text-gray-100 font-medium leading-relaxed">
              "{editorialSummary}"
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3 mt-2 pt-4 border-t border-white/20">
          <Button
            className="flex-1 bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/10 font-bold uppercase tracking-wide h-12 text-lg"
            onClick={(e) => {
              e.stopPropagation();
              const query = encodeURIComponent(`${displayName} ${address}`);
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            }}
          >
            Ver no Mapa
          </Button>

          {onDislike && (
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 border-0 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDislike();
              }}
            >
              <X className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
