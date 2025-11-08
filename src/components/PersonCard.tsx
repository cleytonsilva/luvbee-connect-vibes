import { MapPin, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PersonCardProps {
  name: string;
  age: number;
  distance: string;
  image: string;
  bio: string;
  interests: string[];
  compatibility: number;
}

export const PersonCard = ({
  name,
  age,
  distance,
  image,
  bio,
  interests,
  compatibility,
}: PersonCardProps) => {
  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-hard border-2 border-foreground bg-card">
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      {/* Compatibility Badge */}
      <div className="absolute top-4 right-4">
        <Badge className="bg-primary text-primary-foreground shadow-hard text-lg px-4 py-2">
          <Heart className="w-4 h-4 mr-1 fill-current" />
          {compatibility}% Match
        </Badge>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="mb-3">
          <h2 className="text-3xl font-bold mb-2">
            {name}, {age}
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            {distance}
          </div>
        </div>

        <p className="text-sm mb-4 line-clamp-2 opacity-90">{bio}</p>

        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge
              key={interest}
              variant="outline"
              className="bg-white/10 text-white border-white/40"
            >
              {interest}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
