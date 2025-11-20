import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DiscoveryFeedItem } from "@/services/discovery.service";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VibeCardProps {
    item: DiscoveryFeedItem;
    onAction?: () => void;
}

export function VibeCard({ item, onAction }: VibeCardProps) {
    const isEvent = item.is_event;
    const imageUrl = item.image_url || '/placeholder-location.jpg';

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
                    <p className="text-sm text-white/70 mb-6 line-clamp-2">
                        {item.description}
                    </p>
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
