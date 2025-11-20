import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LocationCard } from "@/components/location/LocationCard";
import { X, Heart, Info, SlidersHorizontal, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import bar1 from "@/assets/bar-1.jpg";
import bar2 from "@/assets/bar-2.jpg";
import bar3 from "@/assets/bar-3.jpg";
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

const mockLocations = [
  {
    id: 1,
    name: "The Neon Lounge",
    type: "Bar",
    distance: "800m",
    rating: 4.8,
    image: bar1,
    price: "$$",
    openUntil: "3h",
    crowdLevel: "Moderado" as const,
    tags: ["Drinks", "DJ", "Lounge"],
  },
  {
    id: 2,
    name: "Sky High Rooftop",
    type: "Rooftop",
    distance: "1.2km",
    rating: 4.9,
    image: bar2,
    price: "$$$",
    openUntil: "2h",
    crowdLevel: "Cheio" as const,
    tags: ["Vista", "Premium", "Lounge"],
  },
  {
    id: 3,
    name: "Craft Beer House",
    type: "Pub",
    distance: "500m",
    rating: 4.6,
    image: bar3,
    price: "$$",
    openUntil: "1h",
    crowdLevel: "Vazio" as const,
    tags: ["Cerveja", "Petiscos", "Casual"],
  },
];

const Locations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [radius, setRadius] = useState([5]);
  const [venueTypeFilter, setVenueTypeFilter] = useState("all");

  const currentLocation = mockLocations[currentIndex];

  const handleLike = () => {
    if (currentLocation) {
      toast({
        title: "Match! 💖",
        description: `Você curtiu ${currentLocation.name}`,
      });
      
      // Simulate match and navigate to detail
      setTimeout(() => {
        navigate(`${ROUTES.LOCATIONS}/${currentLocation.id}`);
      }, 1000);
    }
  };

  const handleDislike = () => {
    if (currentIndex < mockLocations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "Sem mais locais 😔",
        description: `Não encontramos mais locais num raio de ${radius}km. Quer expandir a busca?`,
        action: (
          <Button variant="outline" size="sm" onClick={() => setRadius([radius[0] + 5])}>
            Expandir para {radius[0] + 5}km
          </Button>
        ),
      });
    }
  };

  const handleInfo = () => {
    if (currentLocation) {
      navigate(`${ROUTES.LOCATIONS}/${currentLocation.id}`);
    }
  };

  if (!currentLocation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Nenhum local encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Não encontramos locais próximos com suas preferências. Tente expandir o raio de busca ou ajustar os filtros.
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
                      <SelectItem value="balada">Balada</SelectItem>
                      <SelectItem value="pub">Pub</SelectItem>
                      <SelectItem value="lounge">Lounge</SelectItem>
                      <SelectItem value="rooftop">Rooftop</SelectItem>
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
        <div className="w-full max-w-md">
          <LocationCard
            location={{
              id: currentLocation.id.toString(),
              name: currentLocation.name,
              type: currentLocation.type,
              address: currentLocation.distance,
              rating: currentLocation.rating,
              price_level: currentLocation.price === '$$' ? 2 : currentLocation.price === '$$$' ? 3 : 1,
              photo_url: currentLocation.image,
              images: [currentLocation.image],
            }}
            distance={currentLocation.distance}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <Button
            variant="swipe"
            onClick={handleDislike}
            className="bg-card hover:bg-destructive hover:border-destructive"
          >
            <X className="w-8 h-8 text-destructive hover:text-white" />
          </Button>
          
          <Button
            variant="swipe"
            onClick={handleInfo}
            className="bg-card hover:bg-primary hover:border-primary"
          >
            <Info className="w-7 h-7 text-primary hover:text-white" />
          </Button>
          
          <Button
            variant="swipe"
            onClick={handleLike}
            className="bg-card hover:bg-success hover:border-success"
          >
            <Heart className="w-8 h-8 text-success hover:text-white" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          {mockLocations.length - currentIndex} {mockLocations.length - currentIndex === 1 ? 'local' : 'locais'} disponíveis
        </p>
      </main>
    </div>
  );
};

export default Locations;
