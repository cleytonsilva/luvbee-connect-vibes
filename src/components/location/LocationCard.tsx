import { MapPin, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Location } from "@/types/location.types";
import type { LocationData } from "@/types/app.types";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import { usePlacePhoto } from "@/hooks/usePlacePhoto";

interface LocationCardProps {
  location: Location | LocationData;
  distance?: string;
  onLike?: () => void;
  onDislike?: () => void;
  onLocationClick?: (locationId: string) => void;
}

export const LocationCard = ({
  location,
  distance,
  onLike,
  onDislike,
  onLocationClick,
}: LocationCardProps) => {
  const navigate = useNavigate()
  
  // Priorizar imagem salva no Supabase Storage
  // Se image_url é do Supabase Storage, usar ela
  // Caso contrário, tentar outros campos ou placeholder
  const rawImageUrl = 
    location.image_url ||
    (location as any).photo_url || 
    (Array.isArray(location.images) && location.images.length > 0 ? location.images[0] : null) ||
    (Array.isArray((location as any).images) && (location as any).images.length > 0 ? (location as any).images[0] : null) ||
    null;
  
  // Normalizar URL para converter URLs antigas do Google Maps para Edge Function
  const normalizedUrl = normalizeImageUrl(rawImageUrl, location.place_id);
  
  // Se não tem URL mas tem place_id, buscar foto do Google Places
  const placeId = location.place_id || (location as any).place_id
  const imageUrl = usePlacePhoto(placeId, normalizedUrl);
  
  const rating = Number(location.rating) || Number((location as any).google_rating) || 0;
  const priceLevel = (location as any).price_level || 0;
  const priceSymbols = ['$', '$$', '$$$', '$$$$'];
  const price = priceSymbols[priceLevel - 1] || 'N/A';
  
  // Suportar tanto Location (type) quanto LocationData (category)
  const rawType = (location as any).type ?? (location as any).category ?? ''
  const locationType = typeof rawType === 'object' && rawType !== null ? (rawType as any).name ?? '' : rawType

  // Handler para erro de carregamento de imagem
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    // Se já tentou o placeholder, não fazer nada
    if (target.src.includes('placeholder-location.jpg')) {
      return;
    }
    // Tentar placeholder
    target.src = '/placeholder-location.jpg';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevenir propagação se houver botões dentro do card
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    
    if (onLocationClick) {
      onLocationClick(location.id)
    } else {
      // Fallback: navegar diretamente para a página de detalhes
      navigate(`/dashboard/locations/${location.id}`)
    }
  }

  return (
    <div 
      className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="absolute inset-0 bg-gray-200">
        <img
          src={imageUrl}
          alt={location.name}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{location.name}</h2>
            <div className="flex items-center gap-4 text-sm mb-2">
              {distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {distance}
                </span>
              )}
              {rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {rating.toFixed(1)}
                </span>
              )}
              {priceLevel > 0 && <span>{price}</span>}
            </div>
            {location.address && (
              <p className="text-sm text-white/80 mb-2">{location.address}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {locationType && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
              {locationType}
            </Badge>
          )}
        </div>

        {location.description && (
          <p className="text-sm text-white/90 mb-3 line-clamp-2">{location.description}</p>
        )}
      </div>
    </div>
  );
};
