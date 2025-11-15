import { MapPin, Star } from "lucide-react";
import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import type { Location } from "@/types/location.types";
import type { LocationData } from "@/types/app.types";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import { usePlacePhoto } from "@/hooks/usePlacePhoto";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { LocationService } from "@/services/location.service";
import { toast } from "sonner";

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
  const routerLocation = useRouterLocation()
  const { user } = useAuth()
  const [hasMatch, setHasMatch] = useState<boolean>(false)
  const [matchChecked, setMatchChecked] = useState<boolean>(false)
  
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
  
  // Validação de dados obrigatórios
  if (!location.name) {
    console.warn('[LocationCard] Local sem nome:', location)
  }
  
  // Fallback para campos obrigatórios
  const locationName = location.name || 'Local sem nome'
  const locationAddress = location.address || 'Endereço não disponível'
  const locationDescription = location.description || ''
  
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

  // Controle por rota
  const isLocationsRoute = routerLocation.pathname.includes('/locations')
  const isVibeLocalRoute = routerLocation.pathname.includes('/vibe-local')

  // Verificação de match (apenas na rota /locations)
  // Consulta a API de matches para validar status do local
  // Suporta location.id (UUID) ou place_id (Google)
  const locationIdentifier = (location as any).id || (location as any).place_id

  // Checar match quando usuário e rota são válidos
  useEffect(() => {
    let cancelled = false
    if (user?.id && isLocationsRoute && locationIdentifier && !matchChecked) {
      setMatchChecked(true)
      LocationService.hasLocationMatch(user.id, String(locationIdentifier))
        .then((result) => { if (!cancelled) setHasMatch(result) })
        .catch(() => { if (!cancelled) setHasMatch(false) })
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLocationsRoute, locationIdentifier])

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
            <h2 className="text-3xl font-bold mb-2">{locationName}</h2>
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
            {locationAddress && (
              <p className="text-sm text-white/80 mb-2">{locationAddress}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLocationsRoute && !isVibeLocalRoute && (hasMatch || !!onDislike) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-white/20 text-white border-white/40"
                    aria-label="Desfazer match deste local"
                  >
                    Desfazer Match
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar desfazer</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação remove o match deste local.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      try {
                        if (onDislike) {
                          await onDislike()
                        } else if (user) {
                          await LocationService.removeLocationMatch(user.id, String(locationIdentifier))
                          setHasMatch(false)
                        }
                        toast.success('Match removido')
                      } catch (err: any) {
                        toast.error('Erro ao desfazer match', { description: err?.message })
                      }
                    }}>Desfazer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

        {locationDescription && (
          <p className="text-sm text-white/90 mb-3 line-clamp-2">{locationDescription}</p>
        )}
      </div>
    </div>
  );
};
