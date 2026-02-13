import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, Star, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { LocationService } from "@/services/location.service";
import { useAuth } from "@/hooks/useAuth";
import type { LocationData } from "@/types/app.types";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCacheService } from "@/services/imageCache";
import { motion, AnimatePresence } from "framer-motion";

interface LikedPlace extends LocationData {
  imageUrl?: string;
  distance?: string;
}

const Places = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [places, setPlaces] = useState<LikedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Buscar lugares curtidos
  useEffect(() => {
    const fetchLikedPlaces = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Buscar matches (likes) do usuário
        const matchesResult = await LocationService.getUserLocationMatches(user.id);
        
        if (matchesResult.error) {
          toast({
            title: "Erro",
            description: matchesResult.error,
            variant: "destructive",
          });
          setPlaces([]);
          return;
        }

        const matches = matchesResult.data || [];
        
        if (matches.length === 0) {
          setPlaces([]);
          setIsLoading(false);
          return;
        }

        // Extrair IDs dos locais
        const locationIds = matches.map((match: any) => match.location_id).filter(Boolean);
        
        // Buscar detalhes dos locais
        const locationsResult = await LocationService.getLocationsByIds(locationIds);
        
        if (locationsResult.error) {
          toast({
            title: "Erro",
            description: locationsResult.error,
            variant: "destructive",
          });
          setPlaces([]);
          return;
        }

        // Buscar imagens do cache para cada local
        const locationsWithImages = await Promise.all(
          (locationsResult.data || []).map(async (loc) => {
            const imageUrl = await ImageCacheService.getImageUrl(loc.place_id || loc.id);
            return {
              ...loc,
              imageUrl: imageUrl || loc.image_url || '/placeholder-location.jpg',
            };
          })
        );

        setPlaces(locationsWithImages);
      } catch (error) {
        console.error("[Places] Error fetching liked places:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus lugares",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedPlaces();
  }, [user, toast]);

  // Remover um lugar dos favoritos
  const handleRemove = async (placeId: string) => {
    if (!user) return;

    setRemovingId(placeId);
    
    try {
      const result = await LocationService.removeLocationMatch(user.id, placeId);
      
      if (result.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Remover da lista local
      setPlaces(prev => prev.filter(p => p.id !== placeId));
      
      toast({
        title: "Removido",
        description: "Local removido dos seus favoritos",
      });
    } catch (error) {
      console.error("[Places] Error removing place:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o local",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  // Navegar para detalhes do local
  const handlePlaceClick = (placeId: string) => {
    navigate(`${ROUTES.LOCATIONS}/${placeId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ml-4">Meus Lugares</h1>
        </header>
        <main className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Empty state
  if (places.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ml-4">Meus Lugares</h1>
        </header>
        <main className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-md">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Nenhum lugar curtido</h2>
            <p className="text-muted-foreground mb-6">
              Você ainda não curtiu nenhum lugar. Explore o Discover para encontrar locais incríveis!
            </p>
            <Button onClick={() => navigate(ROUTES.VIBE_LOCAL)}>
              Explorar Locais
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold ml-4">Meus Lugares</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {places.length} {places.length === 1 ? 'lugar' : 'lugares'}
        </span>
      </header>

      {/* Places Grid */}
      <main className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {places.map((place) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                layout
              >
                <Card 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => handlePlaceClick(place.id)}
                >
                  <div className="relative h-48">
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-location.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    
                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg truncate">{place.name}</h3>
                      <div className="flex items-center gap-2 text-sm opacity-90">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{place.address}</span>
                      </div>
                    </div>

                    {/* Rating badge */}
                    {place.rating > 0 && (
                      <div className="absolute top-2 right-2 bg-white text-black px-2 py-1 rounded-md flex items-center gap-1 text-sm font-bold">
                        <Star className="w-4 h-4 fill-black" />
                        {place.rating.toFixed(1)}
                      </div>
                    )}

                    {/* Type badge */}
                    {place.type && (
                      <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded-md text-xs font-bold uppercase">
                        {place.type}
                      </div>
                    )}

                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(place.id);
                      }}
                      disabled={removingId === place.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {place.description || "Sem descrição disponível"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Places;
