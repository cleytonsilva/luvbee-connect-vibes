import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MessageCircle, MapPin, Star, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UserService } from "@/services/user.service";
import { MatchService } from "@/services/match.service";
import { CompatibilityService } from "@/services/compatibility.service";
import type { PublicProfile } from "@/types/user.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface ProfileWithCompatibility extends PublicProfile {
  compatibility_score?: number;
  common_locations_count?: number;
  common_interests_count?: number;
  common_locations?: Array<{ id: string; name: string; image_url: string | null }>;
}

const PublicProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<ProfileWithCompatibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        navigate(-1);
        return;
      }

      setIsLoading(true);
      try {
        // Buscar perfil do usuário
        const profileResult = await UserService.getUserProfile(userId);
        
        if (profileResult.error || !profileResult.data) {
          toast({
            title: "Erro",
            description: "Perfil não encontrado",
            variant: "destructive",
          });
          navigate(-1);
          return;
        }

        const userProfile = profileResult.data;

        // Se é o próprio usuário, redirecionar para o perfil privado
        if (currentUser?.id === userId) {
          navigate("/dashboard/profile");
          return;
        }

        // Calcular compatibilidade se houver usuário logado
        let compatibilityData = null;
        let commonLocs = [];
        
        if (currentUser) {
          const [compatResult, matchResult, commonLocsResult] = await Promise.all([
            CompatibilityService.calculateCompatibility(currentUser.id, userId),
            MatchService.getMatchByUsers(currentUser.id, userId),
            CompatibilityService.getCommonLocationsWithDetails(currentUser.id, userId)
          ]);

          if (compatResult.data) {
            compatibilityData = compatResult.data;
          }

          if (matchResult.data) {
            setHasLiked(matchResult.data.status === 'mutual' || matchResult.data.status === 'pending');
          }

          if (commonLocsResult.data) {
            commonLocs = commonLocsResult.data;
          }
        }

        setProfile({
          id: userProfile.id,
          full_name: userProfile.full_name || "",
          avatar_url: userProfile.avatar_url,
          bio: userProfile.bio,
          age: userProfile.age || userProfile.birth_date 
            ? Math.floor((Date.now() - new Date(userProfile.birth_date || 0).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null,
          gender: userProfile.gender,
          interests: userProfile.interests,
          photos: userProfile.photos,
          compatibility_score: compatibilityData?.score,
          common_locations_count: compatibilityData?.commonLocations,
          common_interests_count: compatibilityData?.commonInterests,
          common_locations: commonLocs
        });
      } catch (error) {
        console.error("[PublicProfile] Error fetching profile:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o perfil",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser, navigate, toast]);

  const handleLike = async () => {
    if (!currentUser || !profile) return;

    setIsLiking(true);
    try {
      const result = await MatchService.createPeopleMatch(currentUser.id, profile.id);
      
      if (result.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setHasLiked(true);
      
      if (result.data?.status === 'mutual') {
        toast({
          title: "💖 É um Match!",
          description: `Você e ${profile.full_name} deram match!`,
        });
      } else {
        toast({
          title: "Curtido!",
          description: `Você curtiu ${profile.full_name}`,
        });
      }
    } catch (error) {
      console.error("[PublicProfile] Error liking:", error);
      toast({
        title: "Erro",
        description: "Não foi possível curtir",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser || !profile) return;

    try {
      const result = await MatchService.getMatchByUsers(currentUser.id, profile.id);
      
      if (!result.data || result.data.status !== 'mutual') {
        toast({
          title: "Atenção",
          description: "Vocês precisam dar match mútuo para conversar",
        });
        return;
      }

      // Buscar ou criar chat
      const { ChatService } = await import("@/services/chat.service");
      const chatResult = await ChatService.getOrCreateChat(currentUser.id, profile.id);
      
      if (chatResult.data) {
        navigate(`/dashboard/messages?chat=${chatResult.data.id}`);
      }
    } catch (error) {
      console.error("[PublicProfile] Error starting chat:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Skeleton className="h-6 w-32 ml-4" />
        </header>
        <main className="p-4">
          <Skeleton className="h-64 w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-20 w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Perfil não encontrado</p>
      </div>
    );
  }

  const allPhotos = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : profile.avatar_url 
      ? [profile.avatar_url] 
      : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold truncate max-w-[200px]">{profile.full_name}</h1>
        <div className="w-10" />
      </header>

      <main className="pb-24">
        {/* Photos Carousel */}
        {allPhotos.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {allPhotos.map((photo, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-[4/5] relative">
                      <img
                        src={photo}
                        alt={`${profile.full_name} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {allPhotos.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>

            {/* Compatibilidade Badge */}
            {profile.compatibility_score !== undefined && (
              <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full font-bold shadow-lg">
                <Star className="w-4 h-4 inline mr-1 fill-white" />
                {profile.compatibility_score}% match
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[4/5] bg-muted flex items-center justify-center">
            <Avatar className="w-32 h-32">
              <AvatarFallback className="text-4xl">
                {profile.full_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Info */}
        <div className="p-4 space-y-4">
          {/* Nome e Idade */}
          <div>
            <h2 className="text-2xl font-bold">
              {profile.full_name}
              {profile.age && <span className="text-muted-foreground font-normal">, {profile.age}</span>}
            </h2>
            {profile.gender && (
              <p className="text-muted-foreground capitalize">{profile.gender}</p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <Card>
              <CardContent className="p-4">
                <p className="text-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Estatísticas de Compatibilidade */}
          {profile.compatibility_score !== undefined && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h3 className="font-bold text-primary mb-3">Compatibilidade</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{profile.compatibility_score}%</p>
                    <p className="text-xs text-muted-foreground">Match total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{profile.common_interests_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Interesses em comum</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Locais em Comum */}
          {profile.common_locations && profile.common_locations.length > 0 && (
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Locais em comum ({profile.common_locations.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {profile.common_locations.map((location) => (
                  <Card key={location.id} className="min-w-[150px] max-w-[150px] shrink-0">
                    <div className="h-24 bg-muted relative">
                      {location.image_url ? (
                        <img
                          src={location.image_url}
                          alt={location.name}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-sm font-medium truncate">{location.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Interesses */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="font-bold mb-3">Interesses</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Actions */}
      {currentUser && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            
            {hasLiked ? (
              <Button
                className="flex-1 h-14 text-lg"
                onClick={handleStartChat}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversar
              </Button>
            ) : (
              <Button
                className="flex-1 h-14 text-lg bg-success hover:bg-success/90"
                onClick={handleLike}
                disabled={isLiking}
              >
                {isLiking ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Heart className="w-5 h-5 mr-2" />
                )}
                Curtir
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfilePage;
