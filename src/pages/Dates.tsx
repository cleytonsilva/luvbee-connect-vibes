import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PersonCard } from "@/components/matching/PersonCard";
import { X, Heart, ArrowLeft, SlidersHorizontal, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { MatchService, type PotentialMatch, type MatchFilters } from "@/services/match.service";
import { useAuth } from "@/hooks/useAuth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import type { GenderPreference } from "@/types/user.types";
import { Badge } from "@/components/ui/badge";

const GENDER_OPTIONS: { value: GenderPreference; label: string }[] = [
  { value: "homem", label: "Homem" },
  { value: "mulher", label: "Mulher" },
  { value: "trans", label: "Trans" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "outros", label: "Outros" },
];

const Dates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [people, setPeople] = useState<PotentialMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState<MatchFilters>({
    looking_for: [],
    age_min: 18,
    age_max: 60,
  });
  const [selectedGenders, setSelectedGenders] = useState<GenderPreference[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Buscar pessoas
  const fetchPeople = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const activeFilters: MatchFilters = {
        ...filters,
        looking_for: selectedGenders.length > 0 ? selectedGenders : ['todos'],
      };

      const result = await MatchService.getPotentialMatches(user.id, 20, activeFilters);
      
      if (result.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        setPeople([]);
        return;
      }

      // Filtrar pessoas que já deram match
      const filtered = (result.data || []).filter(p => p.id !== user.id);
      setPeople(filtered);
      setCurrentIndex(0);
    } catch (error) {
      console.error("[Dates] Error fetching people:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar pessoas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [user]);

  const currentPerson = people[currentIndex];

  const handleLike = async () => {
    if (!currentPerson || !user) return;

    setSwipeDirection('right');
    
    try {
      const result = await MatchService.createPeopleMatch(user.id, currentPerson.id);
      
      if (result.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Verificar se foi match mútuo
      if (result.data?.status === 'mutual') {
        toast({
          title: "💖 É um Match!",
          description: `Você e ${currentPerson.name} deram match!`,
        });
      } else {
        toast({
          title: "Curtido!",
          description: `Você curtiu ${currentPerson.name}`,
        });
      }

      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex < people.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          fetchPeople();
        }
      }, 300);
    } catch (error) {
      console.error("[Dates] Error creating match:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o like",
        variant: "destructive",
      });
    }
  };

  const handleDislike = () => {
    setSwipeDirection('left');
    
    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < people.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: "Acabaram as pessoas",
          description: "Você viu todas as pessoas disponíveis no momento.",
        });
      }
    }, 300);
  };

  const toggleGender = (gender: GenderPreference) => {
    setSelectedGenders(prev => 
      prev.includes(gender)
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    );
  };

  const applyFilters = () => {
    setIsFilterOpen(false);
    fetchPeople();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Descobrir Pessoas</h1>
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Skeleton className="w-full max-w-md h-[500px] rounded-2xl" />
        </main>
      </div>
    );
  }

  // No people state
  if (!currentPerson) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Descobrir Pessoas</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)}>
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md">
            <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Nenhuma pessoa encontrada</h2>
            <p className="text-muted-foreground mb-6">
              Não encontramos pessoas compatíveis com seus filtros. Tente ajustar suas preferências.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setIsFilterOpen(true)}>
                Ajustar Filtros
              </Button>
              <Button onClick={() => { setSelectedGenders([]); fetchPeople(); }}>
                Ver Todos
              </Button>
            </div>
          </div>
        </main>

        {/* Filter Sheet */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Personalize quem você quer conhecer
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-3">
                <Label>Busco por</Label>
                <div className="space-y-2">
                  {GENDER_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={selectedGenders.includes(option.value)}
                        onCheckedChange={() => toggleGender(option.value)}
                      />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Idade: {filters.age_min} - {filters.age_max} anos</Label>
                <Slider
                  value={[filters.age_min || 18, filters.age_max || 60]}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    age_min: value[0],
                    age_max: value[1]
                  }))}
                  max={80}
                  min={18}
                  step={1}
                />
              </div>
              
              <Button onClick={applyFilters} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Descobrir Pessoas</h1>
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Personalize quem você quer conhecer
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-3">
                <Label>Busco por</Label>
                <div className="space-y-2">
                  {GENDER_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={selectedGenders.includes(option.value)}
                        onCheckedChange={() => toggleGender(option.value)}
                      />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Idade: {filters.age_min} - {filters.age_max} anos</Label>
                <Slider
                  value={[filters.age_min || 18, filters.age_max || 60]}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    age_min: value[0],
                    age_max: value[1]
                  }))}
                  max={80}
                  min={18}
                  step={1}
                />
              </div>
              
              <Button onClick={applyFilters} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          {/* Filtros ativos */}
          {selectedGenders.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {selectedGenders.map(gender => (
                <Badge key={gender} variant="secondary">
                  {GENDER_OPTIONS.find(o => o.value === gender)?.label}
                </Badge>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPerson.id}
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
              <PersonCard
                user={currentPerson}
                onClick={() => navigate(`/profile/${currentPerson.id}`)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              onClick={handleDislike}
              className="w-16 h-16 rounded-full border-2 border-destructive hover:bg-destructive hover:text-white"
            >
              <X className="w-8 h-8" />
            </Button>
          </motion.div>
          
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleLike}
              className="w-16 h-16 rounded-full bg-success hover:bg-success/90"
            >
              <Heart className="w-8 h-8" />
            </Button>
          </motion.div>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          {people.length - currentIndex} {people.length - currentIndex === 1 ? 'pessoa' : 'pessoas'} disponíveis
        </p>
      </main>
    </div>
  );
};

export default Dates;
