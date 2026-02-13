import { supabase } from './supabase';

// ===========================================
// TIPOS
// ===========================================

export interface CompatiblePerson {
    id: string;
    name: string;
    age: number | null;
    photo: string;
    bio: string | null;
    compatibility: number;
    commonPlaces: string[];
    commonPlacesCount: number;
    vibes: string[];
    lastActive: string;
    isOnline: boolean;
}

// ===========================================
// FUNÇÕES
// ===========================================

/**
 * Busca pessoas compatíveis baseado em lugares em comum
 * Usa google_place_id da tabela user_locations
 * Ordena por número de lugares em comum (maior compatibilidade)
 */
export async function getCompatiblePeople(currentUserId: string): Promise<CompatiblePerson[]> {
    try {
        // 1. Buscar lugares que o usuário atual curtiu (com place_data para nomes)
        const { data: myLikedLocations } = await supabase
            .from('user_locations')
            .select('google_place_id, place_data')
            .eq('user_id', currentUserId)
            .eq('status', 'liked');

        // Buscar interesses do usuário atual
        const { data: currentUser } = await supabase
            .from('users')
            .select('preferences')
            .eq('id', currentUserId)
            .single();

        const myInterests: string[] = currentUser?.preferences?.interests || [];


        const myLocationIds = myLikedLocations
            ?.map(l => l.google_place_id)
            .filter(Boolean) || [];

        if (myLocationIds.length === 0) {
            return [];
        }

        // Mapa de google_place_id → nome do lugar (extraído do place_data JSON)
        const placeNameMap = new Map<string, string>();
        myLikedLocations?.forEach(l => {
            const placeData = l.place_data as Record<string, any> | null;
            if (placeData?.name && l.google_place_id) {
                placeNameMap.set(l.google_place_id, placeData.name);
            }
        });

        // 2. Buscar outros usuários que curtiram os mesmos lugares
        const { data: otherUserLikes } = await supabase
            .from('user_locations')
            .select('user_id, google_place_id, place_data')
            .in('google_place_id', myLocationIds)
            .eq('status', 'liked')
            .neq('user_id', currentUserId);

        if (!otherUserLikes || otherUserLikes.length === 0) {
            return [];
        }

        // Coletar nomes de lugares dos dados de outros usuários também
        otherUserLikes.forEach(like => {
            const placeData = like.place_data as Record<string, any> | null;
            if (placeData?.name && like.google_place_id && !placeNameMap.has(like.google_place_id)) {
                placeNameMap.set(like.google_place_id, placeData.name);
            }
        });

        // 3. Agrupar por usuário e contar lugares em comum
        const userLocationMap = new Map<string, string[]>();
        otherUserLikes.forEach(like => {
            const existing = userLocationMap.get(like.user_id) || [];
            existing.push(like.google_place_id);
            userLocationMap.set(like.user_id, existing);
        });

        // 4. Buscar detalhes dos usuários compatíveis
        const compatibleUserIds = Array.from(userLocationMap.keys());

        const { data: users } = await supabase
            .from('users')
            .select('*')
            .in('id', compatibleUserIds)
            .eq('is_active', true);

        if (!users || users.length === 0) {
            return [];
        }

        // 5. Montar lista de pessoas compatíveis
        const compatiblePeople: CompatiblePerson[] = users.map(user => {
            const commonLocationIds = userLocationMap.get(user.id) || [];
            const commonPlaceNames = commonLocationIds
                .map(id => placeNameMap.get(id))
                .filter((name): name is string => !!name);

            // Calcular compatibilidade baseada em lugares (70%) e interesses (30%)
            const placeScore = Math.min(100, Math.round((commonLocationIds.length / Math.max(myLocationIds.length, 1)) * 100));

            // Interesses em comum
            const userInterests: string[] = user.preferences?.interests || [];
            const commonInterests = userInterests.filter(i => myInterests.includes(i));
            const interestScore = myInterests.length > 0
                ? Math.min(100, Math.round((commonInterests.length / myInterests.length) * 100))
                : 0;

            // Peso: 70% Lugares, 30% Interesses (ou 100% Interesses se não tiver lugares, 100% lugares se não tiver interesses?)
            // Vamos manter simples: places tem mais peso pois é ação real vs declaração
            let compatibility = 0;
            if (myLocationIds.length > 0 && myInterests.length > 0) {
                compatibility = Math.round((placeScore * 0.7) + (interestScore * 0.3));
            } else if (myLocationIds.length > 0) {
                compatibility = placeScore;
            } else if (myInterests.length > 0) {
                compatibility = interestScore;
            }

            // Determinar se está online (ativo nos últimos 15 minutos)
            const lastUpdate = new Date(user.updated_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;
            const isOnline = diffMinutes < 15;

            return {
                id: user.id,
                name: formatName(user.name, user.age),
                age: user.age,
                photo: user.photos?.[0] || `https://i.pravatar.cc/400?u=${user.id}`,
                bio: user.bio,
                compatibility,
                commonPlaces: commonPlaceNames,
                commonPlacesCount: commonLocationIds.length,
                vibes: extractVibes(user.preferences),
                lastActive: formatLastActive(user.updated_at, isOnline),
                isOnline,
            };
        });

        // 6. Ordenar por compatibilidade (maior primeiro)
        compatiblePeople.sort((a, b) => b.compatibility - a.compatibility);

        return compatiblePeople;
    } catch (error) {
        console.error('Erro ao buscar pessoas compatíveis:', error);
        throw error;
    }
}

/**
 * Busca estatísticas de compatibilidade do usuário
 */
export async function getCompatibilityStats(userId: string): Promise<{
    totalCompatible: number;
    totalCommonPlaces: number;
}> {
    try {
        const people = await getCompatiblePeople(userId);

        // Conta lugares únicos em comum
        const uniquePlaces = new Set<string>();
        people.forEach(person => {
            person.commonPlaces.forEach(place => uniquePlaces.add(place));
        });

        return {
            totalCompatible: people.length,
            totalCommonPlaces: uniquePlaces.size,
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return { totalCompatible: 0, totalCommonPlaces: 0 };
    }
}

// ===========================================
// HELPERS
// ===========================================

function formatName(name: string | null, age: number | null): string {
    if (!name) return 'Usuário';
    if (!age) return name;
    return `${name}, ${age}`;
}

function formatLastActive(dateString: string, isOnline: boolean): string {
    if (isOnline) return 'Ativo agora';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Ativo há ${diffMins}min`;
    if (diffHours < 24) return `Ativo há ${diffHours}h`;
    if (diffDays === 1) return 'Ativo ontem';
    return `Ativo há ${diffDays} dias`;
}

function extractVibes(preferences: any): string[] {
    if (!preferences?.interests) return ['Explorando'];

    const vibeMap: Record<string, string> = {
        'music': 'Musical',
        'art': 'Artístico',
        'food': 'Foodie',
        'travel': 'Aventureiro',
        'sports': 'Esportivo',
        'books': 'Intelectual',
        'movies': 'Cinéfilo',
        'nature': 'Natural',
        'party': 'Festeiro',
        'coffee': 'Chill',
    };

    const vibes = preferences.interests
        .slice(0, 3)
        .map((interest: string) => vibeMap[interest.toLowerCase()] || interest);

    return vibes.length > 0 ? vibes : ['Explorando'];
}

export default {
    getCompatiblePeople,
    getCompatibilityStats,
};
