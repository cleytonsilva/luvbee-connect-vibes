import { supabase } from "@/integrations/supabase";
import { Location } from "@/types/location.types";
import { GooglePlacesService } from "./google-places.service";
import { LocationService } from "./location.service";
import { toast } from "sonner";
import { safeLog } from "@/lib/safe-log";
import SupabaseErrorHandler from "./supabase-error-handler.service";
import { getDistanceFromLatLonInKm } from "@/lib/utils";
import { UserPreferences, User } from "@/types/user.types";

export interface DiscoveryFeedItem extends Location {
    is_event: boolean;
    event_date?: string;
    ticket_url?: string | null;
    match_score?: number;
}

export class DiscoveryService {
    private static readonly MIN_FEED_ITEMS = 5;
    private static readonly CACHE_RADIUS_KM = 5; // 5km radius
    private static readonly EVENT_SPIDER_RADIUS_KM = 50; // Event spider searches in a larger area
    private static lastPopulatedAt: Map<string, number> = new Map();
    private static inFlightFeeds: Map<string, Promise<DiscoveryFeedItem[]>> = new Map();
    private static readonly POPULATE_TTL_MS = 15 * 60 * 1000;

    static async getFeed(
        lat?: number | null,
        lng?: number | null,
        radius: number = 5000, // meters
        userId?: string,
        vibe_category?: 'date' | 'party' | 'culture'
    ): Promise<DiscoveryFeedItem[]> {
        console.log('[DiscoveryService] Getting feed for:', { lat, lng, radius, vibe_category });

        // Phase 0: Validate Coords and Fallback to Profile
        let finalLat = lat;
        let finalLng = lng;

        if ((finalLat === null || finalLat === undefined || finalLng === null || finalLng === undefined || (finalLat === 0 && finalLng === 0)) && userId) {
            console.log('[DiscoveryService] Invalid coordinates. Attempting fallback to user profile location...');
            try {
                // Fetch profile to get location string/city
                // IMPORTANTE: A tabela correta é 'users' (não 'profiles')
                const { data: profile } = await supabase
                    .from('users')
                    .select('location')
                    .eq('id', userId)
                    .maybeSingle();

                // Note: The UserProfile interface in app.types.ts suggests 'location' can be Record or string.
                // We'll handle it if it is a string like "City, State" or object
                const locationData = profile?.location;

                if (locationData) {
                    let addressToGeocode = '';
                    if (typeof locationData === 'string') {
                        addressToGeocode = locationData;
                    } else if (typeof locationData === 'object' && locationData !== null) {
                        // Try to extract city/state if stored as object
                        const locObj = locationData as any;
                        if (locObj.city && locObj.state) {
                            addressToGeocode = `${locObj.city}, ${locObj.state}`;
                        } else if (locObj.address) {
                            addressToGeocode = locObj.address;
                        }
                    }

                    if (addressToGeocode) {
                        console.log(`[DiscoveryService] Geocoding profile location: ${addressToGeocode}`);
                        const geocodeResult = await GooglePlacesService.geocodeAddress(addressToGeocode);
                        if (geocodeResult.data) {
                            finalLat = geocodeResult.data.lat;
                            finalLng = geocodeResult.data.lng;
                            console.log(`[DiscoveryService] Fallback successful. New coords: ${finalLat}, ${finalLng}`);
                            toast.info(`Usando localização do seu perfil: ${addressToGeocode}`);
                        } else {
                            console.warn('[DiscoveryService] Failed to geocode profile location');
                        }
                    }
                }
            } catch (err) {
                console.warn('[DiscoveryService] Error fetching profile for location fallback:', err);
            }
        }

        // If still invalid, default to SP (or handle as error)
        if (finalLat === null || finalLat === undefined || finalLng === null || finalLng === undefined) {
            console.warn('[DiscoveryService] Coordinates still invalid after fallback. Defaulting to São Paulo for demo.');
            finalLat = -23.5505;
            finalLng = -46.6333;
        }

        // Ensure typescript knows they are numbers now
        const effectiveLat = finalLat!;
        const effectiveLng = finalLng!;

        const locationKey = `${effectiveLat}|${effectiveLng}|${radius}|${userId || ''}|${vibe_category || ''}`;
        if (this.inFlightFeeds.has(locationKey)) {
            return await this.inFlightFeeds.get(locationKey)!;
        }

        const feedPromise = (async (): Promise<DiscoveryFeedItem[]> => {
            try {
                // 0. Fetch User Preferences (if logged in)
                let userPreferences: UserPreferences | null = null;
                if (userId) {
                    const { data } = await supabase
                        .from('user_preferences' as any)
                        .select('*')
                        .eq('user_id', userId)
                        .maybeSingle();
                    userPreferences = data as UserPreferences | null;
                }

                // 1. Cache First: Query Supabase for locations and events
                let items = await this.fetchFromSupabase(effectiveLat, effectiveLng, radius);
                console.log(`[DiscoveryService] Found ${items.length} items in cache`);

                // Filter out rejected/matched items if userId is provided
                if (userId) {
                    items = await this.filterUserInteractions(items, userId);
                    console.log(`[DiscoveryService] After filtering user interactions: ${items.length} items`);
                }

                // 2. Fallback: Lazy Population if cache is insufficient
                // Only trigger population if we don't have enough items (vibe_category filtering happens later)
                if (items.length < this.MIN_FEED_ITEMS) {
                    console.log('[DiscoveryService] Cache miss/low. Triggering lazy population...', {
                        currentItems: items.length,
                        minRequired: this.MIN_FEED_ITEMS,
                        vibeCategory: vibe_category
                    });

                    const now = Date.now();
                    const ttlOk = !this.lastPopulatedAt.has(locationKey) || (now - (this.lastPopulatedAt.get(locationKey) || 0)) > this.POPULATE_TTL_MS;

                    if (ttlOk) {
                        // Decouple Strategies: Run reverse geocode for events, but don't block Google population
                        const googlePopulationPromise = this.populateFromGoogle(effectiveLat, effectiveLng, radius, vibe_category);

                        // Event population depends on city/state
                        const eventPopulationPromise = (async () => {
                            try {
                                const { city, state } = await this.reverseGeocode(effectiveLat, effectiveLng);
                                console.log(`[DiscoveryService] Location for events: ${city}, ${state}`);
                                await this.populateFromEvents(effectiveLat, effectiveLng, city, state);
                            } catch (e) {
                                console.warn('[DiscoveryService] Event population skipped due to geocode error', e);
                            }
                        })();

                        const results = await Promise.allSettled([
                            googlePopulationPromise,
                            eventPopulationPromise
                        ]);

                        this.lastPopulatedAt.set(locationKey, Date.now());

                        results.forEach((result, index) => {
                            const type = index === 0 ? 'Google' : 'Events';
                            if (result.status === 'fulfilled') {
                                console.log(`[DiscoveryService] Population ${type} succeeded`);
                            } else {
                                console.error(`[DiscoveryService] Population ${type} failed:`, result.reason);
                            }
                        });

                        // Small delay to allow DB replication/indexing
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Refetch after population
                        items = await this.fetchFromSupabase(effectiveLat, effectiveLng, radius);
                        if (userId) {
                            items = await this.filterUserInteractions(items, userId);
                        }
                        console.log(`[DiscoveryService] After population: ${items.length} items`);
                    }
                }

                if (items.length === 0) {
                    console.warn('[DiscoveryService] Still 0 items after population attempts. Radius might be too small or no data available.');
                }

                // 2.5. Fallback de Cidade: Se tivermos poucos locais (< 3), expandir a busca para a cidade (20km)
                if (items.length < 3) {
                    console.log(`[DiscoveryService] Poucos locais no raio de ${radius}m. Expandindo para modo Cidade (20km)...`);

                    // Expande o raio para 20km para pegar a cidade toda
                    const expandedRadius = 20000;

                    // Buscar novamente no Supabase com raio maior
                    // Reutilizamos o fetchFromSupabase que já lida com bounding box
                    let cityItems = await this.fetchFromSupabase(effectiveLat, effectiveLng, expandedRadius);

                    if (userId) {
                        cityItems = await this.filterUserInteractions(cityItems, userId);
                    }

                    if (cityItems.length > 0) {
                        console.log(`[DiscoveryService] Modo Cidade encontrou ${cityItems.length} locais.`);

                        // Combinar os resultados, evitando duplicatas por ID
                        const existingIds = new Set(items.map(i => i.id));
                        const newItems = cityItems.filter(i => !existingIds.has(i.id));

                        items = [...items, ...newItems];

                        // Misturar para não ficar viciado na ordem de distância apenas
                        items = this.shuffleArray(items);
                    } else {
                        console.log('[DiscoveryService] Modo Cidade também não encontrou novos locais.');
                    }
                }

                // 3. Apply vibe_category filter if specified (before scoring)
                if (vibe_category && items.length > 0) {
                    const beforeVibeFilter = items.length;

                    // Define type mappings for each vibe category (aligned with Google Places types)
                    const vibeTypeMap: Record<string, string[]> = {
                        'date': [
                            // Romantic & dining
                            'restaurant', 'cafe', 'bakery', 'wine_bar', 'cocktail_bar',
                            'french_restaurant', 'italian_restaurant', 'japanese_restaurant',
                            'fine_dining_restaurant', 'art_gallery', 'museum',
                            'book_store', 'coffee_shop', 'dessert_shop', 'ice_cream_shop',
                            'tea_house', 'bistro', 'brunch_restaurant', 'romantic', 'lounge'
                        ],
                        'party': [
                            // Nightlife & entertainment
                            'night_club', 'bar', 'cocktail_bar', 'dance_club', 'karaoke',
                            'live_performance_venue', 'music_venue', 'disco',
                            'pub', 'club', 'balada', 'sports_bar', 'beer_garden'
                        ],
                        'culture': [
                            // Arts & culture
                            'museum', 'art_gallery', 'theater', 'cultural_center',
                            'library', 'exhibition_hall', 'cultural_landmark',
                            'historical_landmark', 'performing_arts_theater', 'concert_hall',
                            'book_store', 'opera_house', 'planetarium', 'science_museum'
                        ]
                    };

                    const allowedTypes = vibeTypeMap[vibe_category] || [];

                    // Explicitly excluded types/keywords (Blocklist)
                    const excludedKeywords = [
                        'hospital', 'clinica', 'clínica', 'médico', 'medico', 'escola', 'faculdade', 'universidade', 'college', 'university', 'school', 'health', 'saude', 'saúde', 'doctor', 'dentist', 'pharmacy', 'farmacia', 'drugstore', 'gym', 'academia', 'fitness', 'police', 'policia', 'bank', 'banco', 'atm', 'finance', 'lawyer', 'advogado', 'supermarket', 'supermercado', 'grocery', 'convenience_store',
                        // New blocklist additions
                        'paraplegic', 'paraplégico', 'deficiência', 'deficiencia', 'reabilitação', 'reabilitacao', 'fisioterapia', 'associacao', 'associação', 'sindicato', 'union', 'gremio', 'grêmio', 'clube de campo', 'sports club', 'clube esportivo', 'swimming', 'natação', 'natacao', 'futebol', 'soccer', 'football'
                    ];

                    items = items.filter(item => {
                        // For events, we ALSO apply the filter to ensure they match the vibe
                        // (e.g. "Theatre" event should not appear in "Party" tab)

                        // BLOCKLIST CHECK (Name & Description)
                        const text = `${item.name} ${item.description || ''} ${item.type || ''}`.toLowerCase();
                        if (excludedKeywords.some(bad => text.includes(bad))) {
                            // Except if it is a specific cultural venue that might have these words (unlikely for hospital)
                            // But "University Theater" might be valid. For now, block to be safe.
                            return false;
                        }

                        // Check location type field
                        if (item.type) {
                            const typeMatch = allowedTypes.some(t =>
                                item.type?.toLowerCase().includes(t.toLowerCase())
                            );
                            if (typeMatch) return true;
                        }

                        // Check Google Places types from google_place_data
                        const googleTypes = (item.google_place_data as any)?.types || [];
                        if (Array.isArray(googleTypes)) {
                            const googleMatch = googleTypes.some((t: string) =>
                                allowedTypes.some(allowed =>
                                    t.toLowerCase().includes(allowed.toLowerCase()) ||
                                    allowed.toLowerCase().includes(t.toLowerCase())
                                )
                            );
                            if (googleMatch) return true;
                        }

                        // For party vibe, also check for keywords in name/description
                        if (vibe_category === 'party') {
                            const text = `${item.name} ${item.description || ''}`.toLowerCase();
                            const partyKeywords = ['bar', 'pub', 'club', 'balada', 'festa', 'night', 'cerveja', 'drinks', 'chopp', 'boteco', 'karaoke', 'disco', 'dance'];
                            if (partyKeywords.some(keyword => text.includes(keyword))) {
                                return true;
                            }
                        }

                        // For date vibe, check romantic keywords
                        if (vibe_category === 'date') {
                            const text = `${item.name} ${item.description || ''}`.toLowerCase();
                            const dateKeywords = ['romântico', 'romantic', 'café', 'coffee', 'wine', 'vinho', 'restaurante', 'jantar', 'dinner', 'bistro', 'confeitaria', 'patisserie', 'gelato', 'sorvete'];
                            if (dateKeywords.some(keyword => text.includes(keyword))) {
                                return true;
                            }
                        }

                        // For culture vibe, check cultural keywords
                        if (vibe_category === 'culture') {
                            const text = `${item.name} ${item.description || ''}`.toLowerCase();
                            const cultureKeywords = ['museu', 'museum', 'galeria', 'gallery', 'teatro', 'theater', 'arte', 'art', 'cultural', 'exposição', 'exhibition', 'planetário', 'ópera', 'opera', 'concerto', 'concert'];
                            if (cultureKeywords.some(keyword => text.includes(keyword))) {
                                return true;
                            }
                        }

                        return false;
                    });

                    console.log(`[DiscoveryService] Vibe filter "${vibe_category}": ${beforeVibeFilter} -> ${items.length} items`);

                    // Se a filtragem removeu TODOS os itens, relaxar os critérios e manter alguns
                    if (items.length === 0 && beforeVibeFilter > 0) {
                        console.warn('[DiscoveryService] Vibe filter removed all items. Relaxing criteria...');
                        // Não aplicar filtro vibe neste caso, retornar os originais
                        items = await this.fetchFromSupabase(effectiveLat, effectiveLng, radius);
                        if (userId) {
                            items = await this.filterUserInteractions(items, userId);
                        }
                    }
                }

                // 4. Score and Sort
                if (userPreferences && items.length > 0) {
                    items = this.scoreAndSortItems(items, userPreferences);
                    console.log(`[DiscoveryService] Sorted ${items.length} items by preference score`);
                } else if (items.length > 0) {
                    // Default shuffle if no preferences
                    items = this.shuffleArray(items);
                    console.log(`[DiscoveryService] Shuffled ${items.length} items (no preferences)`);
                }

                console.log(`[DiscoveryService] ✅ Final feed result: ${items.length} items ready to display`);
                return items;

            } catch (error: any) {
                console.error('[DiscoveryService] Error getting feed:', error);
                safeLog('error', '[DiscoveryService] Discovery error', { error: error.message, lat: effectiveLat, lng: effectiveLng });
                // Não retornar array vazio silenciosamente se for um erro crítico de infraestrutura
                // Mas para a UI, array vazio = "sem resultados" ou "erro tratado".
                // Vamos logar bem o erro.
                return [];
            } finally {
                this.inFlightFeeds.delete(`${effectiveLat}|${effectiveLng}|${radius}|${userId || ''}|${vibe_category || ''}`);
            }
        })();

        this.inFlightFeeds.set(locationKey, feedPromise);
        return await feedPromise;
    }

    private static async fetchFromSupabase(lat: number, lng: number, radius: number): Promise<DiscoveryFeedItem[]> {
        try {
            // Convert radius from meters to degrees (approximate)
            const latDelta = radius / 111000; // 1 degree lat ≈ 111km
            const lngDelta = radius / (111000 * Math.cos(lat * (Math.PI / 180)));

            console.log(`[DiscoveryService] Fetching from Supabase with bounding box: lat±${latDelta}, lng±${lngDelta}`, {
                minLat: lat - latDelta,
                maxLat: lat + latDelta,
                minLng: lng - lngDelta,
                maxLng: lng + lngDelta
            });

            // Validar parâmetros antes da query
            SupabaseErrorHandler.validateQueryParams({ lat, lng, radius }, 'fetchFromSupabase');

            // Query locations table with bounding box and event-specific columns
            const result = await SupabaseErrorHandler.executeWithRetry(
                async () => {
                    const res = await supabase
                        .from('locations')
                        .select('id, name, address, image_url, image_storage_path, type, lat, lng, place_id, event_start_date, event_end_date, ticket_url, description, rating, price_level, opening_hours, city, state, is_active, created_at, updated_at, google_place_data')
                        .eq('is_active', true)
                        .gte('lat', lat - latDelta)
                        .lte('lat', lat + latDelta)
                        .gte('lng', lng - lngDelta)
                        .lte('lng', lng + lngDelta)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    if (res.error) {
                        throw res.error;
                    }
                    return res;
                },
                'fetchFromSupabase.query'
            );

            const locations = (result as any)?.data || [];
            console.log(`[DiscoveryService] Raw locations from DB: ${locations.length}`, {
                searchLat: lat,
                searchLng: lng,
                radiusMeters: radius,
                boundingBox: {
                    minLat: lat - latDelta,
                    maxLat: lat + latDelta,
                    minLng: lng - lngDelta,
                    maxLng: lng + lngDelta
                }
            });

            if (locations.length > 0) {
                // Log sample location coords to debug distance filter
                const sampleDist = getDistanceFromLatLonInKm(lat, lng, locations[0].lat, locations[0].lng);
                console.log('[DiscoveryService] Sample location coords:', {
                    name: locations[0].name,
                    lat: locations[0].lat,
                    lng: locations[0].lng,
                    dist: sampleDist.toFixed(2) + 'km',
                    isActive: locations[0].is_active,
                    type: locations[0].type
                });

                // Log all locations for debugging
                if (locations.length <= 10) {
                    console.log('[DiscoveryService] All locations from DB:', locations.map((loc: any) => ({
                        name: loc.name,
                        lat: loc.lat,
                        lng: loc.lng,
                        dist: getDistanceFromLatLonInKm(lat, lng, loc.lat, loc.lng).toFixed(2) + 'km'
                    })));
                }
            } else {
                console.warn('[DiscoveryService] No locations found in bounding box. This might indicate:', {
                    issue: 'No data in area OR bounding box too restrictive',
                    suggestion: 'Check if locations exist in database for this area'
                });
            }

            // Client-side distance filter and mapping to DiscoveryFeedItem
            const items = (locations)
                .map((loc: any) => {
                    // Handle events without coordinates (lat: 0, lng: 0)
                    let dist = getDistanceFromLatLonInKm(lat, lng, loc.lat, loc.lng);

                    // If coordinates are 0,0 (city center fallback), calculate distance to city center
                    if (loc.lat === 0 && loc.lng === 0 && loc.city) {
                        // For events without coordinates, use a larger radius tolerance
                        dist = getDistanceFromLatLonInKm(lat, lng, loc.lat, loc.lng);
                        // If user is in the same city/state, consider it valid
                        const isSameCity = this.isUserInSameCity(lat, lng, loc.city, loc.state);
                        if (isSameCity) {
                            dist = 1; // Consider 1km away for sorting purposes
                        }
                    }

                    return {
                        ...loc,
                        distance: dist,
                        is_event: !!loc.event_start_date, // Mark as event if has start date
                        event_date: loc.event_start_date, // Alias for convenience
                    };
                })
                // FILTRO DE QUALIDADE: Remover locais de baixa qualidade
                .filter((loc: any) => {
                    // Eventos têm regras diferentes
                    if (loc.is_event) {
                        return true; // Eventos já foram curados
                    }

                    // 1. Rating mínimo de 4.0 (ou sem rating para locais novos)
                    if (loc.rating && loc.rating < 4.0) {
                        console.log(`[DiscoveryService] ❌ Filtrado \"${loc.name}\" - Rating baixo: ${loc.rating}`);
                        return false;
                    }

                    // 2. Bloqueio de nomes suspeitos
                    const suspiciousPatterns = [
                        /playground/i,
                        /parquinho/i,
                        /pracinha/i,
                        /quadra/i,
                        /campo de futebol/i,
                        /pista de skate/i,
                        /academia ao ar livre/i,
                        /ponto de ônibus/i,
                        /parada de ônibus/i,
                        /estação de metrô/i,
                        /terminal/i,
                        /cemitério/i,
                        /igreja/i,
                        /escola/i,
                        /hospital/i,
                        /posto de saúde/i,
                        /delegacia/i,
                        /correios/i
                    ];

                    if (suspiciousPatterns.some(pattern => pattern.test(loc.name))) {
                        console.log(`[DiscoveryService] ❌ Filtrado \"${loc.name}\" - Nome suspeito`);
                        return false;
                    }

                    return true;
                })
                .filter((loc: any) => {
                    // More permissive filtering for events
                    if (loc.is_event) {
                        // Events: accept if within 50km OR same city/state
                        return loc.distance <= 50 || (loc.lat === 0 && loc.lng === 0);
                    } else {
                        // Regular places: use original radius with more permissive buffer (30%)
                        // This accounts for coordinate precision issues and ensures we don't miss nearby places
                        const maxDistanceKm = (radius / 1000) * 1.3;
                        const isWithinRadius = loc.distance <= maxDistanceKm;

                        if (!isWithinRadius && locations.length > 0) {
                            // Log when filtering out items for debugging
                            console.log(`[DiscoveryService] Filtered out location "${loc.name}" - distance: ${loc.distance.toFixed(2)}km, max: ${maxDistanceKm.toFixed(2)}km`);
                        }

                        return isWithinRadius;
                    }
                })
                .sort((a: any, b: any) => {
                    // Sort by distance, but prioritize events (mix events and places)
                    const aIsEvent = a.is_event ? 0 : 1;
                    const bIsEvent = b.is_event ? 0 : 1;

                    if (aIsEvent !== bIsEvent) return aIsEvent - bIsEvent;
                    return a.distance - b.distance;
                });

            console.log(`[DiscoveryService] Filtered and sorted items: ${items.length}`, {
                beforeFilter: locations.length,
                afterFilter: items.length,
                filteredOut: locations.length - items.length,
                radiusKm: (radius / 1000).toFixed(2),
                maxDistanceKm: ((radius / 1000) * 1.3).toFixed(2)
            });

            if (items.length === 0 && locations.length > 0) {
                console.warn('[DiscoveryService] ⚠️ All locations were filtered out by distance!', {
                    closestLocation: locations.length > 0 ? {
                        name: locations[0].name,
                        distance: getDistanceFromLatLonInKm(lat, lng, locations[0].lat, locations[0].lng).toFixed(2) + 'km',
                        searchRadius: (radius / 1000).toFixed(2) + 'km'
                    } : null
                });
            }

            return items as DiscoveryFeedItem[];

        } catch (error) {
            const errorDetails = SupabaseErrorHandler.handleError(error, 'fetchFromSupabase');

            // Mostrar mensagem amigável ao usuário apenas para erros críticos
            if (errorDetails.statusCode && errorDetails.statusCode >= 500) {
                toast.error('Erro ao carregar locais', {
                    description: SupabaseErrorHandler.getUserFriendlyMessage(errorDetails)
                });
            }

            return [];
        }
    }

    private static async filterUserInteractions(items: DiscoveryFeedItem[], userId: string): Promise<DiscoveryFeedItem[]> {
        try {
            // Fetch user's matches and rejections
            const [{ data: matches }, { data: rejections }] = await Promise.all([
                supabase
                    .from('location_matches' as any)
                    .select('location_id')
                    .eq('user_id', userId),
                supabase
                    .from('location_rejections' as any)
                    .select('location_id')
                    .eq('user_id', userId)
            ]);

            // Create sets for both UUID (id) and place_id matching
            // location_id can be either UUID or place_id (TEXT field)
            const matchedIds = new Set((matches as any[])?.map(m => m.location_id) || []);
            const rejectedIds = new Set((rejections as any[])?.map(r => r.location_id) || []);

            // Filter out matched and rejected items
            // Check both item.id (UUID) and item.place_id
            const filtered = items.filter(item => {
                const isMatched = matchedIds.has(item.id) || (item.place_id && matchedIds.has(item.place_id));
                const isRejected = rejectedIds.has(item.id) || (item.place_id && rejectedIds.has(item.place_id));
                return !isMatched && !isRejected;
            });

            console.log(`[DiscoveryService] Filtered out ${items.length - filtered.length} matched/rejected items`, {
                totalItems: items.length,
                matchedCount: matches?.length || 0,
                rejectedCount: rejections?.length || 0,
                remainingItems: filtered.length
            });
            return filtered;

        } catch (error) {
            console.error('[DiscoveryService] Error filtering user interactions:', error);
            return items; // Return unfiltered on error
        }
    }

    private static async populateFromGoogle(lat: number, lng: number, radius: number, vibe_category?: string) {
        try {
            console.log('[DiscoveryService] Populating from Google Places...');
            const result = await GooglePlacesService.searchNearby({
                latitude: lat,
                longitude: lng,
                radius,
                vibe_category: vibe_category as any
            });

            if (result.data && result.data.length > 0) {
                console.log(`[DiscoveryService] Found ${result.data.length} places from Google. Saving to DB...`);

                // Save to DB in parallel (with concurrency limit)
                const batchSize = 5;
                const createdLocations: any[] = [];

                for (let i = 0; i < result.data.length; i += batchSize) {
                    const batch = result.data.slice(i, i + batchSize);
                    const promises = batch.map(place => LocationService.createLocationFromGooglePlace(place));

                    const results = await Promise.allSettled(promises);

                    results.forEach(res => {
                        if (res.status === 'fulfilled' && res.value.data) {
                            createdLocations.push(res.value.data);
                        }
                    });

                    // Small delay to be nice to the DB/Edge Functions
                    if (i + batchSize < result.data.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                console.log(`[DiscoveryService] Saved ${createdLocations.length} locations to DB`);

                // Trigger image scraping for the new locations
                if (createdLocations.length > 0) {
                    console.log('[DiscoveryService] Triggering background image scraping...');
                    LocationService.processLocationImagesInBackground(createdLocations);
                }
            } else {
                console.log('[DiscoveryService] No places found from Google');
            }

            console.log('[DiscoveryService] Google Places population completed');
        } catch (error) {
            console.error('[DiscoveryService] Google population failed:', error);
            safeLog('error', '[DiscoveryService] Google Places error', { error: error instanceof Error ? error.message : String(error), lat, lng });
        }
    }

    private static async populateFromEvents(lat: number, lng: number, city: string, state: string) {
        try {
            if (!city || !state) {
                console.warn('[DiscoveryService] No city/state for event population');
                return;
            }

            console.log(`[DiscoveryService] Triggering spider-events for ${city}, ${state}`);

            const { data, error } = await supabase.functions.invoke('spider-events', {
                body: { lat, lng, city, state }
            });

            if (error) {
                console.error('[DiscoveryService] Spider-events error:', error);
                safeLog('error', '[DiscoveryService] Event spider error', { error: error.message, city, state });
                return;
            }

            console.log('[DiscoveryService] Spider-events completed:', data);

            if (data?.count > 0) {
                toast.success('Novos eventos encontrados!', {
                    description: `${data.count} eventos adicionados próximos a você`
                });
            }

        } catch (error: unknown) {
            console.error('[DiscoveryService] Event population failed:', error);
            safeLog('error', '[DiscoveryService] Event population error', { error: error instanceof Error ? error.message : String(error), city, state });
        }
    }

    private static async reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string }> {
        try {
            // PRIORIDADE 1: Usar Google Geocoding API (preciso e confiável)
            console.log(`[DiscoveryService] Iniciando reverse geocode para: ${lat}, ${lng}`);

            const result = await GooglePlacesService.reverseGeocode(lat, lng);

            if (result.data && result.data.city && result.data.state) {
                console.log(`[DiscoveryService] Reverse geocoded via API: ${result.data.city}, ${result.data.state}`);
                return { city: result.data.city, state: result.data.state };
            }

            console.warn('[DiscoveryService] API retornou dados incompletos, tentando fallback por coordenadas...');

        } catch (error) {
            console.warn('[DiscoveryService] Erro na API de geocoding:', error);
        }

        // PRIORIDADE 2: Fallback robusto baseado em coordenadas
        // (apenas usado quando a API falha)
        const cityBounds: Array<{
            city: string;
            state: string;
            latMin: number;
            latMax: number;
            lngMin: number;
            lngMax: number;
        }> = [
                // Sul
                { city: 'porto-alegre', state: 'rs', latMin: -30.3, latMax: -29.9, lngMin: -51.4, lngMax: -51.0 },
                { city: 'curitiba', state: 'pr', latMin: -25.7, latMax: -25.2, lngMin: -49.5, lngMax: -49.1 },
                { city: 'florianopolis', state: 'sc', latMin: -27.8, latMax: -27.4, lngMin: -48.7, lngMax: -48.3 },

                // Sudeste
                { city: 'sao-paulo', state: 'sp', latMin: -24.0, latMax: -23.0, lngMin: -47.2, lngMax: -46.0 },
                { city: 'rio-de-janeiro', state: 'rj', latMin: -23.5, latMax: -22.5, lngMin: -44.0, lngMax: -43.0 },
                { city: 'belo-horizonte', state: 'mg', latMin: -20.5, latMax: -19.5, lngMin: -44.5, lngMax: -43.5 },
                { city: 'vitoria', state: 'es', latMin: -20.5, latMax: -20.2, lngMin: -40.5, lngMax: -40.2 },
                { city: 'campinas', state: 'sp', latMin: -23.1, latMax: -22.7, lngMin: -47.2, lngMax: -46.9 },

                // Centro-Oeste
                { city: 'brasilia', state: 'df', latMin: -16.0, latMax: -15.5, lngMin: -48.2, lngMax: -47.7 },
                { city: 'goiania', state: 'go', latMin: -16.9, latMax: -16.5, lngMin: -49.5, lngMax: -49.1 },
                { city: 'cuiaba', state: 'mt', latMin: -15.8, latMax: -15.4, lngMin: -56.2, lngMax: -55.8 },
                { city: 'campo-grande', state: 'ms', latMin: -20.6, latMax: -20.3, lngMin: -54.7, lngMax: -54.4 },

                // Nordeste
                { city: 'salvador', state: 'ba', latMin: -13.1, latMax: -12.8, lngMin: -38.6, lngMax: -38.3 },
                { city: 'recife', state: 'pe', latMin: -8.2, latMax: -7.9, lngMin: -35.0, lngMax: -34.7 },
                { city: 'fortaleza', state: 'ce', latMin: -3.9, latMax: -3.6, lngMin: -38.7, lngMax: -38.4 },
                { city: 'natal', state: 'rn', latMin: -5.9, latMax: -5.7, lngMin: -35.3, lngMax: -35.1 },
                { city: 'joao-pessoa', state: 'pb', latMin: -7.2, latMax: -7.0, lngMin: -34.9, lngMax: -34.7 },
                { city: 'maceio', state: 'al', latMin: -9.7, latMax: -9.5, lngMin: -35.8, lngMax: -35.6 },
                { city: 'aracaju', state: 'se', latMin: -11.0, latMax: -10.8, lngMin: -37.1, lngMax: -36.9 },
                { city: 'teresina', state: 'pi', latMin: -5.2, latMax: -4.9, lngMin: -42.9, lngMax: -42.6 },
                { city: 'sao-luis', state: 'ma', latMin: -2.6, latMax: -2.4, lngMin: -44.3, lngMax: -44.1 },

                // Norte
                { city: 'manaus', state: 'am', latMin: -3.2, latMax: -2.9, lngMin: -60.1, lngMax: -59.8 },
                { city: 'belem', state: 'pa', latMin: -1.5, latMax: -1.3, lngMin: -48.5, lngMax: -48.3 },
                { city: 'porto-velho', state: 'ro', latMin: -8.8, latMax: -8.6, lngMin: -64.0, lngMax: -63.7 },
            ];

        // Verificar se as coordenadas estão dentro de alguma cidade conhecida
        for (const bounds of cityBounds) {
            if (lat >= bounds.latMin && lat <= bounds.latMax &&
                lng >= bounds.lngMin && lng <= bounds.lngMax) {
                console.log(`[DiscoveryService] Fallback por coordenadas: ${bounds.city}, ${bounds.state}`);
                return { city: bounds.city, state: bounds.state };
            }
        }

        // ÚLTIMO RECURSO: Default São Paulo (apenas quando tudo falhar)
        console.warn('[DiscoveryService] Cidade não identificada, usando São Paulo como padrão');
        return { city: 'sao-paulo', state: 'sp' };
    }

    private static shuffleArray(array: any[]) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private static isUserInSameCity(userLat: number, userLng: number, eventCity: string, eventState: string): boolean {
        try {
            // Mapa ampliado de cidades brasileiras com coordenadas aproximadas
            const cityBounds: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
                // Sul
                'porto-alegre': { latMin: -30.3, latMax: -29.9, lngMin: -51.4, lngMax: -51.0 },
                'curitiba': { latMin: -25.6, latMax: -25.2, lngMin: -49.5, lngMax: -49.1 },
                'florianopolis': { latMin: -27.8, latMax: -27.4, lngMin: -48.7, lngMax: -48.3 },

                // Sudeste
                'sao-paulo': { latMin: -24.0, latMax: -23.0, lngMin: -47.0, lngMax: -46.0 },
                'rio-de-janeiro': { latMin: -23.5, latMax: -22.5, lngMin: -44.0, lngMax: -43.0 },
                'belo-horizonte': { latMin: -20.5, latMax: -19.5, lngMin: -44.5, lngMax: -43.5 },
                'vitoria': { latMin: -20.5, latMax: -20.2, lngMin: -40.5, lngMax: -40.2 },
                'campinas': { latMin: -23.1, latMax: -22.7, lngMin: -47.2, lngMax: -46.9 },

                // Centro-Oeste
                'brasilia': { latMin: -16.0, latMax: -15.5, lngMin: -48.2, lngMax: -47.7 },
                'goiania': { latMin: -16.9, latMax: -16.5, lngMin: -49.5, lngMax: -49.1 },
                'cuiaba': { latMin: -15.8, latMax: -15.4, lngMin: -56.2, lngMax: -55.8 },
                'campo-grande': { latMin: -20.6, latMax: -20.3, lngMin: -54.7, lngMax: -54.4 },

                // Nordeste
                'salvador': { latMin: -13.1, latMax: -12.8, lngMin: -38.6, lngMax: -38.3 },
                'recife': { latMin: -8.2, latMax: -7.9, lngMin: -35.0, lngMax: -34.7 },
                'fortaleza': { latMin: -3.9, latMax: -3.6, lngMin: -38.7, lngMax: -38.4 },
                'natal': { latMin: -5.9, latMax: -5.7, lngMin: -35.3, lngMax: -35.1 },
                'joao-pessoa': { latMin: -7.2, latMax: -7.0, lngMin: -34.9, lngMax: -34.7 },
                'maceio': { latMin: -9.7, latMax: -9.5, lngMin: -35.8, lngMax: -35.6 },
                'aracaju': { latMin: -11.0, latMax: -10.8, lngMin: -37.1, lngMax: -36.9 },
                'teresina': { latMin: -5.2, latMax: -4.9, lngMin: -42.9, lngMax: -42.6 },
                'sao-luis': { latMin: -2.6, latMax: -2.4, lngMin: -44.3, lngMax: -44.1 },

                // Norte
                'manaus': { latMin: -3.2, latMax: -2.9, lngMin: -60.1, lngMax: -59.8 },
                'belem': { latMin: -1.5, latMax: -1.3, lngMin: -48.5, lngMax: -48.3 },
                'porto-velho': { latMin: -8.8, latMax: -8.6, lngMin: -64.0, lngMax: -63.7 },
            };

            const cleanCity = eventCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-');
            const bounds = cityBounds[cleanCity];

            if (bounds) {
                return userLat >= bounds.latMin && userLat <= bounds.latMax &&
                    userLng >= bounds.lngMin && userLng <= bounds.lngMax;
            }

            return false;
        } catch {
            return false;
        }
    }

    private static scoreAndSortItems(items: DiscoveryFeedItem[], preferences: UserPreferences): DiscoveryFeedItem[] {
        const scoredItems = items.map(item => {
            const score = this.calculateScore(item, preferences);
            return { ...item, match_score: score };
        });

        // Sort by score (descending), then distance (ascending)
        return scoredItems.sort((a, b) => {
            if ((b.match_score || 0) !== (a.match_score || 0)) {
                return (b.match_score || 0) - (a.match_score || 0);
            }
            // Use fallback or safe access for distance
            const distA = (a as any).distance || 0;
            const distB = (b as any).distance || 0;
            return distA - distB;
        });
    }

    private static calculateScore(item: DiscoveryFeedItem, preferences: UserPreferences): number {
        let score = 0;

        // Base score
        score += 10;

        // Category Match
        const preferredTypes = new Set([
            ...(preferences.drink_preferences || []),
            ...(preferences.food_preferences || []),
            ...(preferences.music_preferences || [])
        ].map(p => p.toLowerCase()));

        if (item.type && preferredTypes.has(item.type.toLowerCase())) {
            score += 20;
        }

        if (item.category && preferredTypes.has(item.category.toLowerCase())) {
            score += 20;
        }

        // Description/Name Keywords Match
        const text = `${item.name} ${item.description || ''}`.toLowerCase();

        // Vibe preferences
        if (preferences.vibe_preferences) {
            const vibePrefs = preferences.vibe_preferences as Record<string, any>;
            if (vibePrefs.ambiente && text.includes(String(vibePrefs.ambiente).toLowerCase())) score += 15;
        }

        // Music preferences in text
        if (preferences.music_preferences) {
            preferences.music_preferences.forEach((genre: string) => {
                if (text.includes(genre.toLowerCase())) score += 10;
            });
        }

        // Distance Penalty (small)
        const distance = (item as any).distance || 0;
        score -= (distance * 0.5); // -0.5 point per km

        return score;
    }
}
