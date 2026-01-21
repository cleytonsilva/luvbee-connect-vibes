import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryService, DiscoveryFeedItem } from '@/services/discovery.service';
import { LocationService } from '@/services/location.service';
import { GooglePlacesService } from '@/services/google-places.service';
import { VibeCard } from '@/components/location/VibeCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Heart, Wine, Music, Palette } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type VibeCategory = 'date' | 'party' | 'culture';

export function VibeLocalPage() {
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState<DiscoveryFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hunting, setHunting] = useState(false);
  const [vibeCategory, setVibeCategory] = useState<VibeCategory>('date');
  const didInitRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastParamsRef = useRef<string>('');
  const loadIdRef = useRef(0);

  const [isCityMode, setIsCityMode] = useState(false);
  const [errorState, setErrorState] = useState(false);

  useEffect(() => {
    // Recarregar quando user, profile ou vibeCategory mudar
    const key = `${user?.id || ''}-${profile?.id || ''}-${vibeCategory}`;
    if (!didInitRef.current) {
      didInitRef.current = true;
      loadFeed();
      lastParamsRef.current = key;
      return;
    }
    if (lastParamsRef.current !== key) {
      lastParamsRef.current = key;
      setFeed([]); // Limpar feed anterior
      setCurrentIndex(0); // Resetar índice
      setIsCityMode(false);
      loadFeed();
    }
  }, [user, profile, vibeCategory]);

  const loadFeed = async () => {
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }
    setLoading(true);
    setIsCityMode(false);
    setErrorState(false);
    const currentLoadId = ++loadIdRef.current;
    const promise = (async () => {
      try {
        // Inicializar como null para aplicar lógica de fallback
        let lat: number | null = null;
        let lng: number | null = null;

        // 1. Tentar GPS primeiro
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            console.log('[VibeLocalPage] GPS obtido com sucesso:', { lat, lng });
          } catch (e) {
            console.warn('[VibeLocalPage] GPS falhou ou foi negado:', e);
          }
        }

        // 2. Estratégia de Fallback: Ler do Perfil se GPS falhou
        if ((lat === null || lng === null) && profile) {
          console.log('[VibeLocalPage] GPS indisponível, tentando recuperar localização do perfil...');

          const locData = profile.location as any;

          if (locData) {
            let addressToGeocode = '';

            if (typeof locData === 'string') {
              addressToGeocode = locData;
            } else if (typeof locData === 'object' && locData !== null) {
              if (locData.city && locData.state) {
                addressToGeocode = `${locData.city}, ${locData.state}, Brasil`;
              } else if (locData.formatted_address) {
                addressToGeocode = locData.formatted_address;
              } else if (locData.address) {
                addressToGeocode = locData.address;
              } else if (locData.city) {
                addressToGeocode = `${locData.city}, Brasil`;
              }
            }

            if (addressToGeocode) {
              try {
                const geoResponse = await GooglePlacesService.geocodeAddress(addressToGeocode);
                if (geoResponse.data) {
                  lat = geoResponse.data.lat;
                  lng = geoResponse.data.lng;
                }
              } catch (geoError) {
                console.warn('[VibeLocalPage] ⚠️ Erro no geocoding:', geoError);
              }
            }
          }
        }

        // 3. Último recurso: Padrão (São Paulo)
        if (lat === null || lng === null) {
          console.warn('[VibeLocalPage] Nenhuma localização encontrada. Usando fallback padrão (São Paulo).');
          lat = -23.5505;
          lng = -46.6333;
          toast.warning('Localização não detectada. Mostrando São Paulo.');
        }

        setHunting(true);
        console.log(`[VibeLocalPage] 🔍 Buscando feed com coordenadas: lat=${lat}, lng=${lng}, vibe=${vibeCategory}`);

        // Agora chamamos o serviço com coordenadas garantidas e a Vibe Categoria
        const items = await DiscoveryService.getFeed(lat, lng, 5000, user?.id, vibeCategory);

        console.log(`[VibeLocalPage] 📋 Feed recebido: ${items.length} itens. LoadId: ${currentLoadId}`);

        if (currentLoadId === loadIdRef.current) {
          // Detectar modo cidade (distância > 10km)
          if (items.length > 0) {
            const firstItem = items[0];
            // @ts-ignore
            if (firstItem.distance && firstItem.distance > 10) { // distance é em km no serviço (getDistanceFromLatLonInKm)
              setIsCityMode(true);
              toast.info("Expandimos a busca para encontrar as melhores vibes na sua cidade! 🏙️");
            }
            setFeed(items);
          } else {
            // Se não encontrou itens e não foi erro explícito, talvez seja erro silencioso ou realmente vazio
            // Mas como temos fallbacks agressivos, 0 itens é suspeito.
            console.warn('[VibeLocalPage] Feed vazio recebido.');
          }
        }
      } catch (error) {
        console.error('[VibeLocalPage] Failed to load feed:', error);
        setErrorState(true);
        toast.error('Erro ao carregar vibes. Tente novamente.');
      } finally {
        if (currentLoadId === loadIdRef.current) {
          setLoading(false);
          setHunting(false);
          console.log('[VibeLocalPage] Loading finished. Items:', feed.length); // feed.length pode ser antigo aqui devido a closure, mas ok
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

    if (currentIndex >= feed.length) {
      return;
    }

    let locationId = currentItem.id || currentItem.place_id;

    if (!locationId) {
      toast.error('Erro ao processar local');
      setCurrentIndex(prev => prev + 1);
      return;
    }

    try {
      if (direction === 'right') {
        const result = await LocationService.createLocationMatch(user.id, locationId);
        if (result.error) {
          console.error('Erro ao salvar match:', result.error);
        } else {
          toast.success('Salvo na sua lista!', { duration: 1500 });
        }
      } else {
        await LocationService.createLocationRejection(user.id, locationId);
        await LocationService.removeLocationMatch(user.id, locationId);
      }
    } catch (error) {
      console.error('Erro ao processar swipe:', error);
    } finally {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const currentItem = feed[currentIndex];

  return (
    <div className="container max-w-md mx-auto py-4 h-[calc(100vh-80px)] flex flex-col">

      {/* Vibe Selector */}
      <div className="mb-4 flex justify-center relative">
        <Tabs value={vibeCategory} onValueChange={(v) => setVibeCategory(v as VibeCategory)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/5 p-1 h-12 shadow-inner">
            <TabsTrigger value="date" className="text-xs font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Heart className="w-4 h-4 mr-1 fill-current" />
              Date
            </TabsTrigger>
            <TabsTrigger value="party" className="text-xs font-bold uppercase data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all">
              <Music className="w-4 h-4 mr-1" />
              Agito
            </TabsTrigger>
            <TabsTrigger value="culture" className="text-xs font-bold uppercase data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all">
              <Palette className="w-4 h-4 mr-1" />
              Cultura
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Aviso de Modo Cidade */}
        {isCityMode && (
          <div className="absolute top-14 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <div className="bg-yellow-500/90 text-black font-semibold text-[10px] uppercase py-1 px-3 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 border border-yellow-600/50 flex items-center gap-1">
              <span>🏙️</span>
              Exibindo destaques em toda a cidade
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 relative mb-6">
        {loading || hunting ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-background p-4 rounded-full border-2 border-primary shadow-hard">
                <Search className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold animate-pulse">
              {vibeCategory === 'date' ? 'Procurando romances...' :
                vibeCategory === 'party' ? 'Buscando a festa...' : 'Encontrando cultura...'}
            </h2>
            <p className="text-muted-foreground text-center max-w-xs">
              Curadoria de IA encontrando os melhores spots.
            </p>
          </div>
        ) : errorState ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 p-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-red-500/10 p-6 rounded-full border-2 border-red-500/20">
              <RefreshCw className="w-12 h-12 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter text-red-500">Erro na Busca! ⚠️</h2>
              <p className="text-muted-foreground mb-4 max-w-xs mx-auto">
                Não conseguimos carregar as vibes. Pode ser um problema de conexão ou localização.
              </p>
            </div>
            <Button onClick={() => { setCurrentIndex(0); loadFeed(); }} size="lg" className="shadow-hard w-full font-bold uppercase tracking-wider bg-red-500 hover:bg-red-600 border-red-900">
              Tentar Novamente
            </Button>
          </div>
        ) : !currentItem ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 p-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-primary/10 p-6 rounded-full border-2 border-primary/20">
              <RefreshCw className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Zerou o Game! 🏆</h2>
              <p className="text-muted-foreground mb-4 max-w-xs mx-auto">
                Você já avaliou todas as opções disponíveis para <strong>{vibeCategory === 'date' ? 'Date' : vibeCategory === 'party' ? 'Agito' : 'Cultura'}</strong> nesta região.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Dica: Tente mudar a Vibe ou expanda a busca.
              </p>
            </div>
            <Button onClick={() => { setCurrentIndex(0); loadFeed(); }} size="lg" className="shadow-hard w-full font-bold uppercase tracking-wider">
              Recarregar Feed
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentItem.id}-${vibeCategory}`} // Força re-render na troca de vibe
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="absolute inset-0"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) handleSwipe('right');
                else if (info.offset.x < -100) handleSwipe('left');
              }}
            >
              <VibeCard
                location={currentItem as any}
                onLike={() => handleSwipe('right')}
                onDislike={() => handleSwipe('left')}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
