import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LocationCard } from "@/components/location/LocationCard";
import { X, Heart, Info, SlidersHorizontal, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { LocationService } from "@/services/location.service";
import { useAuth } from "@/hooks/useAuth";
import type { LocationData } from "@/types/app.types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

// Tipo estendido para locais com distância calculada
interface LocationWithDistance extends LocationData {
  distance?: string;
  distanceMeters?: number;
}

const Locations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [locations, setLocations] = useState<LocationWithDistance[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState([5]);
  const [venueTypeFilter, setVenueTypeFilter] = useState("all");
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Buscar localização do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("[Locations] Geolocation error:", error);
          // Usar localização padrão (São Paulo)
          setUserLocation({ lat: -23.5505, lng: -46.6333 });
        }
      );
    }
  }, []);

  // Buscar locais próximos
  const fetchLocations = useCallback(async () => {
    if (!userLocation) return;
    
    setIsLoading(true);
    try {
      const result = await LocationService.getNearbyLocations(
        userLocation.lat,
        userLocation.lng,
        radius[0] * 1000 // Converter km para metros
      );

      if (result.error) {
        toast({
          title: "Erro ao buscar locais",
          description: result.error,
          variant: "destructive",
        });
        setLocations([]);
        return;
      }

      // Calcular distância e formatar
      const locationsWithDistance = (result.data || []).map((loc) => {
        const distMeters = loc.distance_meters || calculateDistance(
          userLocation.lat,
          userLocation.lng,
          loc.lat || 0,
          loc.lng || 0
        );
        
        return {
          ...loc,
          distanceMeters: distMeters,
          distance: formatDistance(distMeters),
        };
      });

      // Filtrar por tipo se necessário
      let filtered = locationsWithDistance;
      if (venueTypeFilter !== "all") {
        filtered = locationsWithDistance.filter(
          (loc) => loc.type?.toLowerCase() === venueTypeFilter.toLowerCase() ||
                   loc.category?.toLowerCase() === venueTypeFilter.toLowerCase()
        );
      }

      // Ordenar por distância
      filtered.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

      setLocations(filtered);
      setCurrentIndex(0);
    } catch (error) {
      console.error("[Locations] Error fetching locations:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os locais",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, radius, venueTypeFilter, toast]);

  // Carregar locais quando a localização ou filtros mudarem
  useEffect(() => {
    if (userLocation) {
      fetchLocations();
    }
  }, [userLocation, fetchLocations]);

  // Calcular distância entre duas coordenadas (Haversine)
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Formatar distância
  function formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  const currentLocation = locations[currentIndex];

  const handleLike = async () => {
    if (!currentLocation || !user) return;

    setSwipeDirection('right');
    
    try {
      // Salvar like no Supabase
      const result = await LocationService.createLocationMatch(user.id, currentLocation.id);
      
      if (result.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Match! 💖",
        description: `Você curtiu ${currentLocation.name}`,
      });

      // Avançar para próximo local
      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex < locations.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Carregar mais locais
          fetchLocations();
        }
      }, 300);
    } catch (error) {
      console.error("[Locations] Error creating match:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o like",
        variant: "destructive",
      });
    }
  };

  const handleDislike = async () => {
    if (!currentLocation || !user) return;

    setSwipeDirection('left');

    try {
      // Salvar dislike/rejeição
      await LocationService.createLocationRejection(user.id, currentLocation.id);

      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex < locations.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          toast({
            title: "Sem mais locais 😔",
            description: "Você viu todos os locais disponíveis nesta área.",
          });
        }
      }, 300);
    } catch (error) {
      console.error("[Locations] Error creating rejection:", error);
      setSwipeDirection(null);
      if (currentIndex < locations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const handleInfo = () => {
    if (currentLocation) {
      navigate(`${ROUTES.LOCATIONS}/${currentLocation.id}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-2xl font-bold">
            luv<span className="text-primary">bee</span>
          </h1>
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Skeleton className="w-full max-w-md h-[500px] rounded-2xl" />
        </main>
      </div>
    );
  }

  // No locations state
  if (!currentLocation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Nenhum local encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Não encontramos locais próximos com suas preferências. Tente expandir o raio de busca.
          </p>
          <Button onClick={() => setRadius([radius[0] + 5])}>
            Expandir busca para {radius[0] + 5}km
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">
          luv<span className="text-primary">bee</span>
        </h1>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  Personalize sua busca por locais
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label>Raio de busca: {radius}km</Label>
                  <Slider
                    value={radius}
                    onValueChange={setRadius}
                    max={20}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de local</Label>
                  <Select value={venueTypeFilter} onValueChange={setVenueTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="club">Balada</SelectItem>
                      <SelectItem value="pub">Pub</SelectItem>
                      <SelectItem value="lounge">Lounge</SelectItem>
                      <SelectItem value="rooftop">Rooftop</SelectItem>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.PROFILE)}>
            <User className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLocation.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: swipeDirection === 'right' ? 300 : swipeDirection === 'left' ? -300 : 0,
                rotate: swipeDirection === 'right' ? 10 : swipeDirection === 'left' ? -10 : 0,
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                x: swipeDirection === 'right' ? 300 : -300,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <LocationCard
                location={{
                  id: currentLocation.id,
                  name: currentLocation.name,
                  type: currentLocation.type || currentLocation.category,
                  address: currentLocation.distance || currentLocation.address,
                  rating: currentLocation.rating,
                  price_level: currentLocation.price_level,
                  photo_url: currentLocation.image_url,
                  images: currentLocation.images || [currentLocation.image_url],
                  place_id: currentLocation.place_id,
                  lat: currentLocation.lat,
                  lng: currentLocation.lng,
                  description: currentLocation.description,
                  google_place_data: currentLocation.google_place_data,
                  google_rating: currentLocation.google_rating,
                  google_user_ratings_total: currentLocation.google_user_ratings_total,
                }}
                distance={currentLocation.distance}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="swipe"
              onClick={handleDislike}
              className="bg-card hover:bg-destructive hover:border-destructive w-16 h-16 rounded-full"
            >
              <X className="w-8 h-8 text-destructive hover:text-white" />
            </Button>
          </motion.div>
          
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="swipe"
              onClick={handleInfo}
              className="bg-card hover:bg-primary hover:border-primary w-14 h-14 rounded-full"
            >
              <Info className="w-6 h-6 text-primary hover:text-white" />
            </Button>
          </motion.div>
          
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="swipe"
              onClick={handleLike}
              className="bg-card hover:bg-success hover:border-success w-16 h-16 rounded-full"
            >
              <Heart className="w-8 h-8 text-success hover:text-white" />
            </Button>
          </motion.div>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          {locations.length - currentIndex} {locations.length - currentIndex === 1 ? 'local' : 'locais'} disponíveis
        </p>
      </main>
    </div>
  );
};

export default Locations;
