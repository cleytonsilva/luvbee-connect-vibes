import { supabase } from "@/integrations/supabase";
import { Location } from "@/types/location.types";
import { GooglePlacesService } from "./google-places.service";
import { LocationService } from "./location.service";
import { toast } from "sonner";
import { safeLog } from "@/lib/safe-log";
import SupabaseErrorHandler from "./supabase-error-handler.service";

export interface DiscoveryFeedItem extends Location {
    is_event: boolean;
    event_date?: string;
    ticket_url?: string;
}

export class DiscoveryService {
    private static readonly MIN_FEED_ITEMS = 5;
    private static readonly CACHE_RADIUS_KM = 5; // 5km radius
    private static readonly EVENT_SPIDER_RADIUS_KM = 50; // Event spider searches in a larger area
    private static lastPopulatedAt: Map<string, number> = new Map();
    private static inFlightFeeds: Map<string, Promise<DiscoveryFeedItem[]>> = new Map();
    private static readonly POPULATE_TTL_MS = 15 * 60 * 1000;

    static async getFeed(
        lat: number,
        lng: number,
        radius: number = 5000, // meters
        userId?: string
    ): Promise<DiscoveryFeedItem[]> {
        console.log('[DiscoveryService] Getting feed for:', { lat, lng, radius });

        const locationKey = `${lat}|${lng}|${radius}|${userId || ''}`;
        if (this.inFlightFeeds.has(locationKey)) {
            return await this.inFlightFeeds.get(locationKey)!;
        }

        const feedPromise = (async (): Promise<DiscoveryFeedItem[]> => {
            try {
            // 1. Cache First: Query Supabase for locations and events
            let items = await this.fetchFromSupabase(lat, lng, radius);
            console.log(`[DiscoveryService] Found ${items.length} items in cache`);

            // Filter out rejected/matched items if userId is provided
            if (userId) {
                items = await this.filterUserInteractions(items, userId);
                console.log(`[DiscoveryService] After filtering user interactions: ${items.length} items`);
            }

            // 2. Fallback: Lazy Population if cache is insufficient
            if (items.length < this.MIN_FEED_ITEMS) {
                console.log('[DiscoveryService] Cache miss/low. Triggering lazy population...');
                
                // Get city/state for event spider
                const { city, state } = await this.reverseGeocode(lat, lng);
                console.log(`[DiscoveryService] Location: ${city}, ${state}`);

                // Run population strategies in parallel
                const now = Date.now();
                const ttlOk = !this.lastPopulatedAt.has(locationKey) || (now - (this.lastPopulatedAt.get(locationKey) || 0)) > this.POPULATE_TTL_MS;
                let populationResults: PromiseSettledResult<any>[] = [];
                if (ttlOk) {
                    populationResults = await Promise.allSettled([
                        this.populateFromGoogle(lat, lng, radius),
                        this.populateFromEvents(lat, lng, city, state)
                    ]);
                    this.lastPopulatedAt.set(locationKey, Date.now());
                    try {
                        if (typeof window !== 'undefined') {
                            window.localStorage.setItem(`discover:last:${locationKey}`, String(Date.now()));
                        }
                    } catch {}
                }

                // Log population results
                populationResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        console.log(`[DiscoveryService] Population ${index === 0 ? 'Google' : 'Events'} succeeded`);
                    } else {
                        console.error(`[DiscoveryService] Population ${index === 0 ? 'Google' : 'Events'} failed:`, result.reason);
                    }
                });

                if (ttlOk) {
                    items = await this.fetchFromSupabase(lat, lng, radius);
                    if (userId) {
                        items = await this.filterUserInteractions(items, userId);
                    }
                    console.log(`[DiscoveryService] After population: ${items.length} items`);
                }
            }

            // 3. Shuffle and Return
            const shuffledItems = this.shuffleArray(items);
            console.log(`[DiscoveryService] Returning ${shuffledItems.length} items`);
            
            return shuffledItems;

            } catch (error: any) {
                console.error('[DiscoveryService] Error getting feed:', error);
                safeLog('error', '[DiscoveryService] Discovery error', { error: error.message, lat, lng });
                toast.error('Erro ao carregar locais e eventos', { 
                    description: 'Não foi possível carregar os locais próximos. Tente novamente.' 
                });
                return [];
            } finally {
                this.inFlightFeeds.delete(`${lat}|${lng}|${radius}|${userId || ''}`);
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

            console.log(`[DiscoveryService] Fetching from Supabase with bounding box: lat±${latDelta}, lng±${lngDelta}`);

            // Validar parâmetros antes da query
            SupabaseErrorHandler.validateQueryParams({ lat, lng, radius }, 'fetchFromSupabase');

            // Query locations table with bounding box and event-specific columns
            // Now includes opening_hours and is_active columns after migration
            const result = await SupabaseErrorHandler.executeWithRetry(
                async () => {
                    const res = await supabase
                        .from('locations')
                        .select('id, name, address, image_url, type, lat, lng, event_start_date, event_end_date, ticket_url, description, rating, price_level, opening_hours, city, state, is_active, created_at, updated_at')
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
            console.log(`[DiscoveryService] Raw locations from DB: ${locations.length}`);

            // Client-side distance filter and mapping to DiscoveryFeedItem
            const items = (locations)
                .map(loc => {
                    // Handle events without coordinates (lat: 0, lng: 0)
                    let dist = this.getDistanceFromLatLonInKm(lat, lng, loc.lat, loc.lng);
                    
                    // If coordinates are 0,0 (city center fallback), calculate distance to city center
                    if (loc.lat === 0 && loc.lng === 0 && loc.city) {
                        // For events without coordinates, use a larger radius tolerance
                        dist = this.getDistanceFromLatLonInKm(lat, lng, loc.lat, loc.lng);
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
                .filter(loc => {
                    // More permissive filtering for events
                    if (loc.is_event) {
                        // Events: accept if within 50km OR same city/state
                        return loc.distance <= 50 || (loc.lat === 0 && loc.lng === 0);
                    } else {
                        // Regular places: use original radius
                        return loc.distance <= (radius / 1000);
                    }
                })
                .sort((a, b) => {
                    // Sort by distance, but prioritize events (mix events and places)
                    const aIsEvent = a.is_event ? 0 : 1;
                    const bIsEvent = b.is_event ? 0 : 1;
                    
                    if (aIsEvent !== bIsEvent) return aIsEvent - bIsEvent;
                    return a.distance - b.distance;
                });

            console.log(`[DiscoveryService] Filtered and sorted items: ${items.length}`);
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
                    .from('location_matches')
                    .select('location_id')
                    .eq('user_id', userId),
                supabase
                    .from('location_rejections')
                    .select('location_id')
                    .eq('user_id', userId)
            ]);

            const matchedIds = new Set(matches?.map(m => m.location_id) || []);
            const rejectedIds = new Set(rejections?.map(r => r.location_id) || []);

            // Filter out matched and rejected items
            const filtered = items.filter(item => 
                !matchedIds.has(item.id) && !rejectedIds.has(item.id)
            );

            console.log(`[DiscoveryService] Filtered out ${items.length - filtered.length} matched/rejected items`);
            return filtered;

        } catch (error) {
            console.error('[DiscoveryService] Error filtering user interactions:', error);
            return items; // Return unfiltered on error
        }
    }

    private static async populateFromGoogle(lat: number, lng: number, radius: number) {
        try {
            console.log('[DiscoveryService] Populating from Google Places...');
            await GooglePlacesService.searchNearby({ latitude: lat, longitude: lng, radius });
            console.log('[DiscoveryService] Google Places population completed');
        } catch (error) {
            console.error('[DiscoveryService] Google population failed:', error);
            safeLog('error', '[DiscoveryService] Google Places error', { error: error.message, lat, lng });
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

        } catch (error) {
            console.error('[DiscoveryService] Event population failed:', error);
            safeLog('error', '[DiscoveryService] Event population error', { error: error.message, city, state });
        }
    }

    private static async reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string }> {
        try {
            // Try to use a simple geocoding approach first
            // In a real app, you'd want to use a proper geocoding service
            
            // Fallback to common Brazilian cities based on coordinates
            // This is a very rough approximation for demo purposes
            
            // São Paulo region (approximate)
            if (lat >= -24.0 && lat <= -23.0 && lng >= -47.0 && lng <= -46.0) {
                return { city: 'sao-paulo', state: 'sp' };
            }
            
            // Rio de Janeiro region (approximate)
            if (lat >= -23.5 && lat <= -22.5 && lng >= -44.0 && lng <= -43.0) {
                return { city: 'rio-de-janeiro', state: 'rj' };
            }
            
            // Belo Horizonte region (approximate)
            if (lat >= -20.5 && lat <= -19.5 && lng >= -44.5 && lng <= -43.5) {
                return { city: 'belo-horizonte', state: 'mg' };
            }
            
            // Brasília region (approximate)
            if (lat >= -16.0 && lat <= -15.0 && lng >= -48.5 && lng <= -47.5) {
                return { city: 'brasilia', state: 'df' };
            }
            
            // Default to São Paulo for demo
            console.log('[DiscoveryService] Using default city/state (São Paulo)');
            return { city: 'sao-paulo', state: 'sp' };
            
        } catch (error) {
            console.error('[DiscoveryService] Reverse geocoding error:', error);
            return { city: 'sao-paulo', state: 'sp' }; // Safe fallback
        }
    }

    private static shuffleArray(array: any[]) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private static getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private static deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    private static isUserInSameCity(userLat: number, userLng: number, eventCity: string, eventState: string): boolean {
        try {
            // Simple city detection based on coordinate ranges for major Brazilian cities
            const cityBounds = {
                'sao-paulo': { latMin: -24.0, latMax: -23.0, lngMin: -47.0, lngMax: -46.0 },
                'rio-de-janeiro': { latMin: -23.5, latMax: -22.5, lngMin: -44.0, lngMax: -43.0 },
                'belo-horizonte': { latMin: -20.5, latMax: -19.5, lngMin: -44.5, lngMax: -43.5 },
                'brasilia': { latMin: -16.0, latMax: -15.0, lngMin: -48.5, lngMax: -47.5 },
                'salvador': { latMin: -13.0, latMax: -12.5, lngMin: -38.6, lngMax: -38.3 },
                'fortaleza': { latMin: -3.8, latMax: -3.6, lngMin: -38.6, lngMax: -38.4 },
                'curitiba': { latMin: -25.5, latMax: -25.3, lngMin: -49.3, lngMax: -49.2 },
                'recife': { latMin: -8.1, latMax: -8.0, lngMin: -34.9, lngMax: -34.8 },
                'porto-alegre': { latMin: -30.1, latMax: -30.0, lngMin: -51.3, lngMax: -51.1 },
                'goiania': { latMin: -16.8, latMax: -16.6, lngMin: -49.4, lngMax: -49.2 }
            };
            
            const cleanCity = eventCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-');
            const bounds = cityBounds[cleanCity as keyof typeof cityBounds];
            
            if (bounds) {
                return userLat >= bounds.latMin && userLat <= bounds.latMax && 
                       userLng >= bounds.lngMin && userLng <= bounds.lngMax;
            }
            
            return false;
        } catch {
            return false;
        }
    }
}
