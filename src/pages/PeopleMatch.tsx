import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PersonCard } from "@/components/PersonCard";
import { X, Heart, ArrowLeft, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import person1 from "@/assets/person-1.jpg";
import person2 from "@/assets/person-2.jpg";
import person3 from "@/assets/person-3.jpg";

const mockPeople = [
  {
    id: 1,
    name: "Ana",
    age: 25,
    distance: "900m",
    image: person1,
    bio: "Amo drinks autorais e música eletrônica. Sempre em busca do próximo rolê!",
    interests: ["Drinks", "Música", "DJ Sets"],
    compatibility: 92,
  },
  {
    id: 2,
    name: "Carlos",
    age: 28,
    distance: "1.1km",
    image: person2,
    bio: "Cervejeiro amador e fã de pub quiz. Vamos trocar dicas de bares?",
    interests: ["Cerveja", "Petiscos", "Música Ao Vivo"],
    compatibility: 85,
  },
  {
    id: 3,
    name: "Marina",
    age: 26,
    distance: "750m",
    image: person3,
    bio: "Apaixonada por rooftops e vista panorâmica. Let's vibe!",
    interests: ["Rooftop", "Lounge", "Fotografia"],
    compatibility: 88,
  },
];

const PeopleMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { locationId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPerson = mockPeople[currentIndex];

  const handleLike = () => {
    if (currentPerson) {
      toast({
        title: "É um match! 💖",
        description: `Você e ${currentPerson.name} deram match!`,
      });
      
      setTimeout(() => {
        navigate(`/chat/${currentPerson.id}`);
      }, 1500);
    }
  };

  const handleDislike = () => {
    if (currentIndex < mockPeople.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "Acabaram as pessoas 😔",
        description: "Não há mais pessoas interessadas neste local no momento.",
      });
      setTimeout(() => {
        navigate("/locations");
      }, 2000);
    }
  };

  if (!currentPerson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Nenhuma pessoa encontrada</h2>
          <p className="text-muted-foreground mb-6">
            Não há mais pessoas interessadas neste local no momento.
          </p>
          <Button onClick={() => navigate("/locations")}>
            Voltar para locais
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Pessoas interessadas</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <PersonCard {...currentPerson} />
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
            onClick={handleLike}
            className="bg-card hover:bg-success hover:border-success"
          >
            <Heart className="w-8 h-8 text-success hover:text-white" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          {mockPeople.length - currentIndex} {mockPeople.length - currentIndex === 1 ? 'pessoa' : 'pessoas'} disponíveis
        </p>
      </main>
    </div>
  );
};

export default PeopleMatch;
