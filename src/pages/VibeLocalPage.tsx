import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryService, DiscoveryFeedItem } from '@/services/discovery.service';
import { LocationService } from '@/services/location.service';
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
  const didInitRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastParamsRef = useRef<string>('');
  const loadIdRef = useRef(0);

  useEffect(() => {
    const key = `${user?.id || ''}`;
    if (!didInitRef.current) {
      didInitRef.current = true;
      loadFeed();
      lastParamsRef.current = key;
      return;
    }
    if (lastParamsRef.current !== key) {
      lastParamsRef.current = key;
      loadFeed();
    }
  }, [user]);

  const loadFeed = async () => {
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }
    setLoading(true);
    const currentLoadId = ++loadIdRef.current;
    const promise = (async () => {
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
      if (currentLoadId === loadIdRef.current) {
        setFeed(items);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
      toast.error('Erro ao carregar vibes. Tente novamente.');
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setLoading(false);
        setHunting(false);
      }
      inFlightRef.current = null;
    }
    })();
    inFlightRef.current = promise;
    await promise;
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || !currentItem) {
      return;
    }

    if (currentIndex >= feed.length - 1) {
      // End of feed
      return;
    }

    // Preferir UUID (id) sobre place_id para garantir consistência
    let locationId = currentItem.id;
    
    // Se não tem UUID mas tem place_id, tentar buscar o UUID
    if (!locationId && currentItem.place_id) {
      try {
        const locationResult = await LocationService.getLocationByPlaceId(currentItem.place_id);
        if (locationResult.data?.id) {
          locationId = locationResult.data.id;
        } else {
          // Se não encontrou UUID, usar place_id mesmo
          locationId = currentItem.place_id;
        }
      } catch (error) {
        // Em caso de erro, usar place_id
        locationId = currentItem.place_id;
      }
    }

    if (!locationId) {
      console.error('Location ID not found:', currentItem);
      toast.error('Erro ao processar local');
      setCurrentIndex(prev => prev + 1);
      return;
    }

    try {
      if (direction === 'right') {
        // Like - criar match
        const result = await LocationService.createLocationMatch(user.id, locationId);
        if (result.error) {
          console.error('Erro ao salvar match:', result.error);
          toast.error('Erro ao salvar match. Tente novamente.');
        } else {
          toast.success('Match salvo!', { duration: 2000 });
        }
      } else {
        // Dislike - criar rejeição e remover match se existir
        await LocationService.createLocationRejection(user.id, locationId);
        await LocationService.removeLocationMatch(user.id, locationId);
      }
    } catch (error) {
      console.error('Erro ao processar swipe:', error);
      toast.error('Erro ao processar ação. Tente novamente.');
    } finally {
      // Avançar para o próximo item independente de erro
      setCurrentIndex(prev => prev + 1);
    }
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
        <h2 className="text-2xl font-bold animate-pulse">Descobrindo Locais...</h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Encontrando os melhores lugares e eventos próximos a você.
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
          <h2 className="text-2xl font-bold mb-2">Nenhum local encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Parece que não há locais disponíveis nesta área no momento.
          </p>
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg mb-4">
            <p className="font-semibold mb-2">💡 Dica: Siga-nos no Instagram!</p>
            <p className="text-sm mb-3">
              Fique por dentro das novidades e descubra os melhores lugares antes de todo mundo.
            </p>
            <button 
              onClick={() => window.open('https://instagram.com/luvbeebr', '_blank')}
              className="bg-white text-purple-600 px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              @luvbeebr 📸
            </button>
          </div>
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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground shadow-hard hover:scale-105 transition-all duration-200 border-2 border-secondary-foreground/20 hover:border-secondary-foreground/40"
          onClick={() => handleSwipe('left')}
        >
          <span className="text-2xl">✕</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-hard hover:scale-105 transition-all duration-200 border-2 border-primary-foreground/20 hover:border-primary-foreground/40"
          onClick={() => handleSwipe('right')}
        >
          <span className="text-2xl">♥</span>
        </motion.button>
      </div>
    </div>
  );
}
