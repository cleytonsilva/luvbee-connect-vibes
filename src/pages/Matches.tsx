import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, ArrowLeft, Heart, Users, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MatchService, type PeopleMatchWithUsers } from "@/services/match.service";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ChatService } from "@/services/chat.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MatchWithDetails extends PeopleMatchWithUsers {
  lastMessage?: string;
  unreadCount?: number;
}

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Buscar matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Buscar apenas matches mútuos (conexões já feitas)
        const result = await MatchService.getMutualMatches(user.id);
        
        if (result.error) {
          toast({
            title: "Erro",
            description: result.error,
            variant: "destructive",
          });
          setMatches([]);
          return;
        }

        // Buscar últimas mensagens para cada match
        const matchesWithMessages = await Promise.all(
          (result.data || []).map(async (match) => {
            const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            
            // Buscar ou criar chat
            const chatResult = await ChatService.getOrCreateChat(user.id, otherUserId);
            
            let lastMessage = "";
            let unreadCount = 0;
            
            if (chatResult.data) {
              // Buscar última mensagem
              const messagesResult = await ChatService.getMessages(chatResult.data.id, { limit: 1 });
              if (messagesResult.data && messagesResult.data.length > 0) {
                lastMessage = messagesResult.data[0].content;
              }
              
              // Contar mensagens não lidas
              unreadCount = chatResult.data.user1_id === user.id 
                ? chatResult.data.user1_unread_count 
                : chatResult.data.user2_unread_count;
            }

            return {
              ...match,
              lastMessage,
              unreadCount
            };
          })
        );

        setMatches(matchesWithMessages);
      } catch (error) {
        console.error("[Matches] Error fetching matches:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus matches",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [user, toast]);

  // Obter o outro usuário do match
  const getOtherUser = (match: MatchWithDetails) => {
    if (!user) return null;
    return match.user1_id === user.id ? match.user2 : match.user1;
  };

  // Iniciar chat
  const handleStartChat = async (match: MatchWithDetails) => {
    if (!user) return;
    
    const otherUser = getOtherUser(match);
    if (!otherUser) return;

    try {
      const result = await ChatService.getOrCreateChat(user.id, otherUser.id);
      
      if (result.data) {
        navigate(`/chat/${result.data.id}`);
      }
    } catch (error) {
      console.error("[Matches] Error starting chat:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa",
        variant: "destructive",
      });
    }
  };

  // Ver perfil
  const handleViewProfile = (match: MatchWithDetails) => {
    const otherUser = getOtherUser(match);
    if (otherUser) {
      navigate(`/profile/${otherUser.id}`);
    }
  };

  // Filtrar matches
  const filteredMatches = matches.filter(match => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return (match.unreadCount || 0) > 0;
    if (activeTab === "recent") {
      // Matches dos últimos 7 dias
      const matchDate = new Date(match.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return matchDate > sevenDaysAgo;
    }
    return true;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ml-4">Meus Matches</h1>
        </header>
        <main className="p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Empty state
  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ml-4">Meus Matches</h1>
        </header>
        
        <main className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-md">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Nenhum match ainda</h2>
            <p className="text-muted-foreground mb-6">
              Você ainda não tem nenhuma conexão. Explore a aba "Dates" para conhecer novas pessoas!
            </p>
            <Button onClick={() => navigate("/dates")}>
              <Users className="w-4 h-4 mr-2" />
              Descobrir Pessoas
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold ml-4">Meus Matches</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </span>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-4">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
          <TabsTrigger value="unread" className="flex-1">
            Não lidas
            {matches.some(m => (m.unreadCount || 0) > 0) && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {matches.filter(m => (m.unreadCount || 0) > 0).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1">Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-3">
            <AnimatePresence>
              {filteredMatches.map((match) => {
                const otherUser = getOtherUser(match);
                if (!otherUser) return null;

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleViewProfile(match)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={otherUser.avatar_url || undefined} />
                              <AvatarFallback className="text-lg">
                                {otherUser.full_name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {(match.unreadCount || 0) > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                              >
                                {match.unreadCount}
                              </Badge>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg truncate">
                                {otherUser.full_name}
                              </h3>
                              {otherUser.age && (
                                <span className="text-muted-foreground">{otherUser.age}</span>
                              )}
                            </div>
                            
                            {/* Compatibilidade */}
                            {(match as any).compatibility_score > 0 && (
                              <div className="flex items-center gap-1 text-sm text-primary">
                                <Heart className="w-3 h-3 fill-primary" />
                                <span>{(match as any).compatibility_score}% compatibilidade</span>
                              </div>
                            )}

                            {/* Locais em comum */}
                            {(match as any).common_locations_count > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span>{(match as any).common_locations_count} locais em comum</span>
                              </div>
                            )}

                            {/* Última mensagem */}
                            {match.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {match.lastMessage}
                              </p>
                            )}
                          </div>

                          {/* Action */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartChat(match);
                            }}
                          >
                            <MessageCircle className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredMatches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum match nesta categoria
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Matches;
