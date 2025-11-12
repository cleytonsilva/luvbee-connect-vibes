import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, Clock, Users, Phone, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import bar1 from "@/assets/bar-1.jpg";

const LocationDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data - replace with actual data
  const location = {
    id: 1,
    name: "The Neon Lounge",
    type: "Bar",
    distance: "800m",
    rating: 4.8,
    image: bar1,
    price: "$$",
    openUntil: "3h",
    crowdLevel: "Moderado",
    tags: ["Drinks", "DJ", "Lounge"],
    address: "Rua Augusta, 1234 - Consolação",
    phone: "(11) 98765-4321",
    website: "theneonlounge.com.br",
    description: "Um bar moderno com drinks autorais e ambiente descontraído. DJ todas as sextas e sábados.",
    interestedCount: 42,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Image */}
      <div className="relative h-64 md:h-96">
        <img
          src={location.image}
          alt={location.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-background/80 backdrop-blur"
        >
          <ArrowLeft />
        </Button>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-card rounded-xl shadow-hard border-2 p-6">
          {/* Title Section */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-3xl font-bold mb-2">{location.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {location.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {location.rating}
                  </span>
                  <span>{location.price}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{location.type}</Badge>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Até {location.openUntil}
              </Badge>
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {location.crowdLevel}
              </Badge>
              {location.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Sobre</h2>
            <p className="text-muted-foreground">{location.description}</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-5 h-5 text-primary" />
              <span>{location.address}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-5 h-5 text-primary" />
              <span>{location.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Globe className="w-5 h-5 text-primary" />
              <span>{location.website}</span>
            </div>
          </div>

          {/* Interested People */}
          <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-center font-semibold">
              <span className="text-2xl text-primary">{location.interestedCount}</span> pessoas curtiram este local
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1"
              onClick={() => navigate(`${ROUTES.PEOPLE}?locationId=${id}`)}
            >
              Ver Pessoas Interessadas
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetail;
