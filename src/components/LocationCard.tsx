import { MapPin, Star, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LocationCardProps {
  name: string;
  type: string;
  distance: string;
  rating: number;
  image: string;
  price: string;
  openUntil: string;
  crowdLevel: "Vazio" | "Moderado" | "Cheio";
  tags: string[];
}

export const LocationCard = ({
  name,
  type,
  distance,
  rating,
  image,
  price,
  openUntil,
  crowdLevel,
  tags,
}: LocationCardProps) => {
  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card">
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{name}</h2>
            <div className="flex items-center gap-4 text-sm mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {distance}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {rating}
              </span>
              <span>{price}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
            {type}
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
            <Clock className="w-3 h-3 mr-1" />
            Até {openUntil}
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
            <Users className="w-3 h-3 mr-1" />
            {crowdLevel}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="bg-primary/20 text-white border-primary"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
