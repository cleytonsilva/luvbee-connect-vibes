import { MapPin, Star, Heart, X, Wine, Beer, Martini, Users, Music, DollarSign } from "lucide-react";
import { useState, useEffect } from 'react';
import { Location } from "@/types/location.types";
import { motion, AnimatePresence } from "framer-motion";

interface VibeCardProps {
    location: Location;
    onLike?: () => void;
    onDislike?: () => void;
    onLocationClick?: (locationId: string) => void;
}

export const VibeCard = ({
    location,
    onLike,
    onDislike,
    onLocationClick,
}: VibeCardProps) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Dados do local
    const displayName = location.name || "Local Desconhecido";
    const address = location.address || "";

    // PITCH: Descrição envolvente (prioridade: generative > editorial > description)
    const pitch = (location as any).generative_summary ||
        (location as any).editorial_summary ||
        location.description ||
        "";

    // Rating
    const rating = Number(location.google_rating || location.rating || 0);
    const userRatingCount = location.google_user_ratings_total || (location as any).user_ratings_total || 0;

    // Preço
    const priceLevel = location.price_level || 0;

    // Tipo
    const typeTranslations: Record<string, string> = {
        'wine_bar': 'Wine Bar',
        'speakeasy': 'Speakeasy',
        'lounge': 'Lounge',
        'fine_dining_restaurant': 'Fine Dining',
        'bistro': 'Bistrô',
        'night_club': 'Balada',
        'live_music_venue': 'Casa de Shows',
        'cocktail_bar': 'Coquetelaria',
        'pub': 'Pub',
        'art_gallery': 'Galeria de Arte',
        'museum': 'Museu',
        'jazz_club': 'Jazz Club',
        'restaurant': 'Restaurante',
        'cafe': 'Café',
        'bar': 'Bar',
    };

    const rawType = (location as any).primary_type || location.type || (location as any).category || "Local";
    const typeName = typeTranslations[rawType] || rawType.charAt(0).toUpperCase() + rawType.slice(1);

    // Features
    const features = location.features || (location as any).google_place_data?.features;

    // IMAGEM: Usar proxy da Edge Function para evitar CORS/403
    const getProxiedImageUrl = () => {
        // 1. Se já tem imagem no storage, use diretamente
        if (location.image_storage_path) {
            return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/places/${location.image_storage_path}`;
        }

        // 2. Se tem place_id, use o proxy
        if (location.place_id) {
            return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cache-place-photo?place_id=${location.place_id}&maxwidth=800&t=${Date.now()}`;
        }

        // 3. Se tem photo_reference direto
        const photos = (location.google_place_data as any)?.photos || (location as any).photos;
        if (photos && Array.isArray(photos) && photos.length > 0) {
            const photoRef = photos[0].photo_reference || photos[0].name;
            if (photoRef) {
                return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cache-place-photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=800&t=${Date.now()}`;
            }
        }

        // 4. Fallback: Imagem genérica elegante
        return '/placeholder-date-night.jpg';
    };

    const imageUrl = getProxiedImageUrl();

    // Timeout de segurança para loading
    useEffect(() => {
        const timer = setTimeout(() => setImageLoading(false), 5000);
        return () => clearTimeout(timer);
    }, [imageUrl]);

    const handleCardClick = () => {
        if (onLocationClick && location.id) {
            onLocationClick(location.id);
        }
    };

    return (
        <motion.div
            className="relative w-full h-[600px] rounded-3xl overflow-hidden shadow-[0px_12px_32px_rgba(0,0,0,0.4)] cursor-pointer"
            onClick={handleCardClick}
            onHoverStart={() => setIsExpanded(true)}
            onHoverEnd={() => setIsExpanded(false)}
            onTouchStart={() => setIsExpanded(true)}
            onTouchEnd={() => setTimeout(() => setIsExpanded(false), 3000)}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
        >
            {/* IMAGEM FULL BLEED */}
            <div className="absolute inset-0">
                {imageLoading && !imageError && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 animate-pulse" />
                )}
                <img
                    src={imageUrl}
                    alt={displayName}
                    className={`w-full h-full object-cover transition-all duration-700 ${imageLoading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                        }`}
                    onLoad={() => setImageLoading(false)}
                    onError={(e) => {
                        console.error(`[VibeCard] Image load failed for ${displayName}:`, imageUrl);
                        setImageError(true);
                        setImageLoading(false);
                        // Fallback para gradiente elegante
                        e.currentTarget.style.display = 'none';
                    }}
                />

                {/* Fallback visual se imagem falhar */}
                {imageError && (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white/30">
                                <Wine className="w-24 h-24 mx-auto mb-4" />
                                <p className="text-sm font-light">Experiência Premium</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gradiente para legibilidade */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* CONTEÚDO ANIMADO */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 text-white z-10"
                initial={{ y: 0 }}
                animate={{ y: isExpanded ? -40 : 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <div className="p-8">
                    {/* ESTADO INICIAL: Nome, Nota, Tipo */}
                    <div className="mb-4">
                        <h1
                            className="text-5xl font-black tracking-tight mb-3 leading-tight"
                            style={{
                                WebkitTextFillColor: 'transparent',
                                WebkitTextStroke: '2px white',
                                textShadow: '0 0 30px rgba(255,255,255,0.6), 0 4px 8px rgba(0,0,0,0.8)'
                            }}
                        >
                            {displayName.toUpperCase()}
                        </h1>

                        {/* Rating e Tipo em linha */}
                        <div className="flex items-center gap-4 mb-2">
                            {rating > 0 && (
                                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm">{rating.toFixed(1)}</span>
                                    {userRatingCount > 0 && (
                                        <span className="text-xs text-white/70">({userRatingCount})</span>
                                    )}
                                </div>
                            )}

                            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                                <span className="text-sm font-bold uppercase tracking-wide">{typeName}</span>
                            </div>

                            {priceLevel > 0 && (
                                <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-400/30">
                                    {[...Array(priceLevel)].map((_, i) => (
                                        <DollarSign key={i} className="w-3 h-3 text-green-400" />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Endereço */}
                        {address && (
                            <div className="flex items-center gap-2 text-white/80 text-sm">
                                <MapPin className="w-4 h-4" />
                                <span className="font-medium">{address.split(',')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* ESTADO ATIVO: O PITCH (Texto Descritivo) */}
                    <AnimatePresence>
                        {isExpanded && pitch && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-black/70 backdrop-blur-md p-4 rounded-2xl border-l-4 border-primary mb-4">
                                    <p className="text-base leading-relaxed font-light italic text-white/95">
                                        "{pitch}"
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Features Icons */}
                    {features && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {features.serves_wine && (
                                <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-purple-400/30 flex items-center gap-1">
                                    <Wine className="w-3 h-3 text-purple-300" />
                                    <span className="text-xs font-medium text-purple-200">Vinhos</span>
                                </div>
                            )}
                            {features.serves_cocktails && (
                                <div className="bg-pink-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-pink-400/30 flex items-center gap-1">
                                    <Martini className="w-3 h-3 text-pink-300" />
                                    <span className="text-xs font-medium text-pink-200">Coquetéis</span>
                                </div>
                            )}
                            {features.live_music && (
                                <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-blue-400/30 flex items-center gap-1">
                                    <Music className="w-3 h-3 text-blue-300" />
                                    <span className="text-xs font-medium text-blue-200">Música Ao Vivo</span>
                                </div>
                            )}
                            {features.good_for_groups && (
                                <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-green-400/30 flex items-center gap-1">
                                    <Users className="w-3 h-3 text-green-300" />
                                    <span className="text-xs font-medium text-green-200">Grupos</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3">
                        {onDislike && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDislike();
                                }}
                                className="flex-1 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl py-4 px-6 text-white font-bold hover:bg-red-500/80 hover:border-red-400 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <X className="w-5 h-5" />
                                <span>Pular</span>
                            </button>
                        )}
                        {onLike && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLike();
                                }}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 border-2 border-white/50 rounded-2xl py-4 px-6 text-white font-bold hover:from-pink-600 hover:to-purple-700 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl"
                            >
                                <Heart className="w-5 h-5 fill-current" />
                                <span>Curtir!</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Feature Icons - Top Right (sempre visíveis) */}
            {features && (
                <div className="absolute top-6 right-6 flex gap-2 z-20">
                    {features.serves_beer && (
                        <div className="bg-black/70 backdrop-blur-md rounded-full p-3 border-2 border-amber-400/50 shadow-lg">
                            <Beer className="w-5 h-5 text-amber-400" />
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};
