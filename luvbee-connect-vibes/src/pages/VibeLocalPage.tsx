import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryService, DiscoveryFeedItem } from '@/services/discovery.service';
import { VibeCard } from '@/components/location/VibeCard';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

export function VibeLocalPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<DiscoveryFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hunting, setHunting] = useState(false);

  useEffect(() => {
    loadFeed();
  }, [user]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      // Default to São Paulo coords if geolocation fails or for initial load
      let lat = -23.5505;
      let lng = -46.6333;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (e) {
          console.warn('Geolocation failed, using default:', e);
          toast.error('Não foi possível obter sua localização. Usando padrão (SP).');
        }
      }

      setHunting(true);
      const items = await DiscoveryService.getFeed(lat, lng, 5000, user?.id);
      setFeed(items);
    } catch (error) {
      console.error('Failed to load feed:', error);
      toast.error('Erro ao carregar vibes. Tente novamente.');
    } finally {
      setLoading(false);
      setHunting(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (currentIndex >= feed.length - 1) {
      // End of feed
      return;
    }
    setCurrentIndex(prev => prev + 1);
  };

  const currentItem = feed[currentIndex];

  if (loading || hunting) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative bg-background p-4 rounded-full border-2 border-primary shadow-hard">
            <Search className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold animate-pulse">Caçando Vibes...</h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Buscando os melhores locais e eventos próximos a você.
        </p>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-6 p-4 text-center">
        <div className="bg-muted p-6 rounded-full">
          <RefreshCw className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Fim da linha!</h2>
          <p className="text-muted-foreground">
            Você já viu todas as vibes disponíveis nesta área por enquanto.
          </p>
        </div>
        <Button onClick={() => { setCurrentIndex(0); loadFeed(); }} size="lg" className="shadow-hard">
          Buscar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-4 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-1 relative mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <VibeCard
              item={currentItem}
              onAction={() => console.log('Action clicked')}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-6 mb-4">
        <Button
          variant="outline"
          size="icon"
          className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive/10 shadow-hard"
          onClick={() => handleSwipe('left')}
        >
          <span className="text-2xl">✕</span>
        </Button>

        <Button
          variant="default"
          size="icon"
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-hard hover:scale-105 transition-transform"
          onClick={() => handleSwipe('right')}
        >
          <span className="text-2xl">♥</span>
        </Button>
      </div>
    </div>
  );
}
