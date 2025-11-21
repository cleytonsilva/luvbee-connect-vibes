import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DiscoveryFeedItem } from "@/services/discovery.service";
import { GooglePlacesService } from "@/services/google-places.service";
import { usePlacePhoto } from "@/hooks/usePlacePhoto";
import { normalizeImageUrl } from "@/lib/image-url-utils";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VibeCardProps {
    item: DiscoveryFeedItem;
    onAction?: () => void;
}

export function VibeCard({ item, onAction }: VibeCardProps) {
    const isEvent = item.is_event;
    
    // Normalizar URL da imagem e usar hook para buscar foto se necessário
    const normalizedImageUrl = normalizeImageUrl(item.image_url, item.place_id);
    const imageUrl = usePlacePhoto(item.place_id || null, normalizedImageUrl);
    
    // Estado para coordenadas obtidas via geocoding
    const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    
    // Obter coordenadas (suporta diferentes formatos)
    const lat = item.lat || item.latitude;
    const lng = item.lng || item.longitude;
    
    // Verificar se coordenadas são válidas (não são 0,0 e não são null/undefined)
    const hasValidCoordinates = lat != null && lng != null && lat !== 0 && lng !== 0;
    
    // Coordenadas finais (usar coordenadas originais ou geocodificadas)
    const finalLat = hasValidCoordinates ? lat : (geocodedCoords?.lat ?? null);
    const finalLng = hasValidCoordinates ? lng : (geocodedCoords?.lng ?? null);
    const hasFinalCoordinates = finalLat != null && finalLng != null && finalLat !== 0 && finalLng !== 0;
    
    // Geocoding: buscar coordenadas do endereço se não tiver coordenadas válidas
    useEffect(() => {
        // Só fazer geocoding se não tiver coordenadas válidas, tiver endereço, e ainda não tiver feito geocoding
        const shouldGeocode = !hasValidCoordinates && item.address && !geocodedCoords && !isGeocoding;
        
        if (shouldGeocode) {
            setIsGeocoding(true);
            GooglePlacesService.geocodeAddress(item.address)
                .then((result) => {
                    if (result.data) {
                        setGeocodedCoords(result.data);
                    }
                })
                .catch((error) => {
                    console.warn('[VibeCard] Erro ao fazer geocoding:', error);
                })
                .finally(() => {
                    setIsGeocoding(false);
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.address]); // Dependência apenas do endereço - outras variáveis são verificadas dentro do efeito
    
    // Construir URL do Google Maps (sempre tenta criar uma URL se tiver endereço ou coordenadas)
    const googleMapsUrl = hasFinalCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`
        : item.address 
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
            : item.city && item.state
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.city}, ${item.state}`)}`
                : null;
    
    // Construir URL do mapa estático (usa coordenadas finais se disponíveis)
    const staticMapUrl = hasFinalCoordinates && import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${finalLat},${finalLng}&zoom=15&size=400x128&markers=color:red%7C${finalLat},${finalLng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        : null;

    return (
        <Card className="w-full h-[600px] overflow-hidden relative border-0 shadow-none rounded-xl bg-black">
            {/* Image Background */}
            <div className="absolute inset-0">
                <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => (e.currentTarget.src = '/placeholder-location.jpg')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
                {isEvent && item.event_start_date && (
                    <Badge variant="secondary" className="bg-primary text-white border-none shadow-lg">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(item.event_start_date), "dd MMM • HH:mm", { locale: ptBR })}
                    </Badge>
                )}
                <Badge variant="outline" className="bg-black/50 text-white border-white/20 backdrop-blur-md">
                    {isEvent ? 'Evento' : 'Local'}
                </Badge>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h2 className="text-3xl font-bold mb-2 leading-tight">{item.name}</h2>

                <div className="flex items-center gap-2 text-white/80 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm truncate">{item.address || item.city}</span>
                </div>

                {item.description && (
                    <p className="text-sm text-white/70 mb-4 line-clamp-2">
                        {item.description}
                    </p>
                )}

                {/* Minimapa - só mostra se tiver coordenadas válidas */}
                {hasFinalCoordinates && staticMapUrl && (
                    <div className="mb-4">
                        <a
                            href={googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <div className="bg-gray-200 h-32 rounded-lg overflow-hidden border-2 border-white/20 group-hover:border-white/40 transition-all relative shadow-lg">
                                <img
                                    src={staticMapUrl}
                                    alt={`Mapa de ${item.name}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    onError={(e) => {
                                        // Se a imagem falhar, esconder o minimapa completamente
                                        const target = e.target as HTMLImageElement;
                                        target.parentElement?.parentElement?.parentElement?.style.setProperty('display', 'none');
                                    }}
                                />
                            </div>
                        </a>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {isEvent && item.ticket_url ? (
                        <Button
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                            onClick={() => window.open(item.ticket_url, '_blank')}
                        >
                            <Ticket className="w-4 h-4 mr-2" />
                            Comprar Ingresso
                        </Button>
                    ) : (
                        <Button
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20"
                            onClick={onAction}
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Ver no Mapa
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
