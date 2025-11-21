import { MapPin, Star, Calendar, Ticket, Heart, X } from "lucide-react";
import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import type { Location } from "@/types/location.types";
import type { LocationData } from "@/types/app.types";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import { usePlacePhoto } from "@/hooks/usePlacePhoto";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { LocationService } from "@/services/location.service";
import { safeLog } from "@/lib/safe-log";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LocationCardProps {
  location: Location | LocationData;
  distance?: string;
  onLike?: () => void;
  onDislike?: () => void;
  onLocationClick?: (locationId: string) => void;
  mutualLikesCount?: number;
}

export const LocationCard = ({
  location,
  distance,
  onLike,
  onDislike,
  onLocationClick,
  mutualLikesCount,
}: LocationCardProps) => {
  const navigate = useNavigate()
  const routerLocation = useRouterLocation()
  const { user } = useAuth()
  const [hasMatch, setHasMatch] = useState<boolean>(false)
  const [matchChecked, setMatchChecked] = useState<boolean>(false)
  const [imageLoading, setImageLoading] = useState<boolean>(true)
  
  // Identificar se é um evento
  const isEvent = !!location.event_start_date || location.type === 'event' || (location as any).is_event;
  
  // Priorizar imagem salva no Supabase Storage
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
  
  // Validação de dados obrigatórios - prevenir crash
  if (!location?.name) {
    console.warn('[LocationCard] Local sem dados válidos:', location)
    return null // Não renderizar card inválido
  }
  
  // Fallback para campos obrigatórios
  const locationName = location.name || 'Local sem nome'
  const locationAddress = location.address || 'Endereço não disponível'
  const locationDescription = location.description || ''
  
  const rating = Number(location.rating) || Number((location as any).google_rating) || 0;
  const priceLevel = (location as any).price_level || 0;
  const priceSymbols = ['$', '$$', '$$$', '$$$$'];
  const price = priceSymbols[priceLevel - 1] || 'N/A';
  // Média de avaliações quando disponível
  const reviews = Array.isArray((location as any).reviews) ? (location as any).reviews : []
  const hasReviews = reviews.length > 0
  const averageRating = hasReviews
    ? (reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / reviews.length)
    : rating
  
  // Suportar tanto Location (type) quanto LocationData (category)
  const rawType = (location as any).type ?? (location as any).category ?? ''
  const locationType = typeof rawType === 'object' && rawType !== null ? (rawType as any).name ?? '' : rawType

  // Formatar data do evento
  const formatEventDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "dd 'de' MMM • HH:mm", { locale: ptBR })
    } catch {
      return 'Data não informada'
    }
  }

  // Handler para erro de carregamento de imagem
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    // Se já tentou o placeholder, não fazer nada
    if (target.src.includes('placeholder-location.jpg') || target.src.includes('hero-nightlife.jpg')) {
      return;
    }
    // Tentar placeholder
    target.src = '/placeholder-location.jpg';
    safeLog('warn', '[LocationCard] image error', { url: imageUrl, placeId })
  };

  // Handler para clique no card
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevenir propagação se houver botões dentro do card
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return
    }
    
    if (onLocationClick) {
      onLocationClick(location.id)
    } else {
      // Fallback: navegar diretamente para a página de detalhes
      navigate(`/dashboard/locations/${location.id}`)
    }
  }

  // Handler para comprar ingresso
  const handleTicketClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir navegação do card
    if (location.ticket_url) {
      window.open(location.ticket_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Controle por rota
  const isLocationsRoute = routerLocation.pathname.includes('/locations')
  const isVibeLocalRoute = routerLocation.pathname.includes('/vibe-local')

  // Verificação de match (apenas na rota /locations)
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

  // CSS para gradiente de fundo do card
  const cardGradientClass = isEvent 
    ? "absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/40 to-transparent"
    : "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"

  return (
    <div 
      className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="absolute inset-0 bg-gray-200">
        <img
          src={imageUrl}
          alt={locationName}
          className="w-full h-full object-cover"
          onError={handleImageError}
          onLoad={() => setImageLoading(false)}
          loading="lazy"
        />
        {imageLoading && (
          <div className="absolute inset-0">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        <div className={cardGradientClass} />
      </div>

      {/* Event Badge - Top Right */}
      {isEvent && (
        <div className="absolute top-4 right-4 z-20">
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1">
            <Calendar className="w-3 h-3 mr-1" />
            EVENTO
          </Badge>
        </div>
      )}

      {Boolean((location as any).is_open) && (
        <div className="absolute top-4 left-4 z-20">
          <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1">Open Now</Badge>
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{locationName}</h2>
            
            {/* Data do Evento */}
            {isEvent && location.event_start_date && (
              <div className="flex items-center gap-2 text-sm mb-2 text-purple-200">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">
                  {formatEventDate(location.event_start_date)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm mb-2">
              {distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {distance}
                </span>
              )}
              {averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {hasReviews ? `${averageRating.toFixed(1)} (${reviews.length})` : averageRating.toFixed(1)}
                </span>
              )}
              {priceLevel > 0 && <span>{price}</span>}
            </div>
            
            {locationAddress && (
              <p className="text-sm text-white/80 mb-2">{locationAddress}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="outline"
                className="bg-white/20 text-white border-white/40"
                aria-label="Adicionar aos favoritos"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  try {
                    // @ts-ignore
                    if (Array.isArray((location as any).favorites) && (location as any).favorites.includes(user.id)) {
                      // @ts-ignore
                      LocationService.removeFromFavorites?.(user.id, location.id)
                    } else {
                      // @ts-ignore
                      LocationService.addToFavorites?.(user.id, location.id)
                    }
                  } catch {}
                }}
              >
                <Heart className="w-4 h-4 mr-1" />
              </Button>
            )}
            {isEvent && location.ticket_url && (
              <Button
                onClick={handleTicketClick}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2"
                size="sm"
              >
                <Ticket className="w-4 h-4" />
                Ingresso
              </Button>
            )}
            
            {isLocationsRoute && !isVibeLocalRoute && (hasMatch || !!onDislike) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-white/20 text-white border-white/40"
                    aria-label="Desfazer match deste local"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Desfazer
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
          {mutualLikesCount !== undefined && mutualLikesCount > 0 && (
            <Badge variant="default" className="bg-primary text-primary-foreground border-2 border-foreground shadow-hard">
              ⭐ {mutualLikesCount} {mutualLikesCount === 1 ? 'match' : 'matches'} também curtiu
            </Badge>
          )}
          
          {locationType && (
            <Badge 
              variant={isEvent ? "secondary" : "outline"} 
              className={isEvent 
                ? "bg-purple-500/20 text-purple-200 border-purple-400/40" 
                : "bg-white/20 text-white border-white/40"
              }
            >
              {isEvent ? '🎉 ' : ''}{locationType}
            </Badge>
          )}
        </div>

        {locationDescription && (
          <p className="text-sm text-white/90 mb-3 line-clamp-2">{locationDescription}</p>
        )}

        {user && (
          <div className="flex items-center gap-2 z-10">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => e.stopPropagation()}
            >
              Check In
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/dashboard/locations/${location.id}`)
              }}
            >
              View Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
