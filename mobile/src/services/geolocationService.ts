// geolocationService.ts - Geolocalização com fallbacks inteligentes
// Fluxo: GPS → Perfil (lat/lng) → Geocodificação da cidade → São Paulo

import * as Location from 'expo-location';

export interface UserLocation {
    latitude: number;
    longitude: number;
    source: 'gps' | 'profile' | 'geocoded' | 'default';
    cityName?: string;
}

// Coordenadas padrão: São Paulo, SP
const DEFAULT_LOCATION: UserLocation = {
    latitude: -23.5505,
    longitude: -46.6333,
    source: 'default',
    cityName: 'São Paulo',
};

/**
 * Obtém a localização do usuário com fallbacks inteligentes:
 * 1. GPS real (pede permissão)
 * 2. Coordenadas salvas no perfil
 * 3. Geocodificação do nome da cidade do perfil
 * 4. São Paulo como padrão
 */
export async function getUserLocation(
    profileCity?: string | null,
    profileLat?: number | null,
    profileLng?: number | null,
    profileState?: string | null,
    profileCountry?: string | null
): Promise<UserLocation> {
    // 1. Tentar GPS real
    const gpsLocation = await tryGPS(profileCountry, profileState);
    if (gpsLocation) return gpsLocation;


    // 2. Tentar coordenadas do perfil
    if (profileLat && profileLng) {
        return {
            latitude: profileLat,
            longitude: profileLng,
            source: 'profile',
            cityName: profileCity || undefined,
        };
    }

    // 3. Tentar geocodificar a cidade do cadastro
    // 3. Tentar geocodificar a cidade/estado do cadastro
    // Prioridade: Cidade > Estado > País
    const queryParts = [];
    if (profileCity) queryParts.push(profileCity);
    if (profileState) queryParts.push(profileState);
    if (profileCountry) queryParts.push(countryNameFromCode(profileCountry));

    if (queryParts.length > 0) {
        const searchQuery = queryParts.join(', ');
        const geocoded = await tryGeocode(searchQuery);
        if (geocoded) return geocoded;
    }

    // 4. Fallback: São Paulo
    return DEFAULT_LOCATION;
}

/**
 * Tenta obter localização via GPS
 * Solicita permissão ao usuário
 */
async function tryGPS(countryCode?: string | null, state?: string | null): Promise<UserLocation | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        // Tentar reverse geocoding para obter nome da cidade
        let cityName: string | undefined;
        try {
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            if (address) {
                cityName = address.city || address.subregion || address.region || undefined;
            }
        } catch {
            // Reverse geocoding falhou - tudo bem, temos as coordenadas
        }

        // NOTA: Se o usuário pediu "lugares do meu estado" mesmo com GPS ativo,
        // isso geralmente significa "perto de mim dentro do estado".
        // A busca por raio já garante proximidade.
        // Se quiséssemos filtrar estritamente pelo estado, precisaríamos checar
        // se o reverse geocode bate com o profileState.
        // Por ora, assumimos que GPS manda na localização.

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            source: 'gps',
            cityName: cityName,
        };
    } catch (error) {
        console.warn('📍 Erro ao obter GPS:', error);
        return null;
    }
}

/**
 * Geocodifica o nome de uma cidade para coordenadas
 */
async function tryGeocode(searchQuery: string): Promise<UserLocation | null> {
    try {
        const results = await Location.geocodeAsync(searchQuery);

        if (results.length > 0) {
            return {
                latitude: results[0].latitude,
                longitude: results[0].longitude,
                source: 'geocoded',
                cityName: searchQuery.split(',')[0],
            };
        }

        console.warn(`📍 Não foi possível geocodificar: ${searchQuery}`);
        return null;
    } catch (error) {
        console.warn('📍 Erro ao geocodificar:', error);
        return null;
    }
}

// Helper rápido para nome do país (pode ser melhorado com i18n real)
function countryNameFromCode(code: string | null): string {
    if (!code) return '';
    if (code === 'BR') return 'Brasil';
    if (code === 'AR') return 'Argentina';
    if (code === 'MX') return 'México';
    // Adicionar outros conforme necessário, ou deixar o código passar se a API aceitar
    return code;
}

/**
 * Verifica se temos permissão de localização (sem solicitar)
 */
export async function hasLocationPermission(): Promise<boolean> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status === 'granted';
    } catch {
        return false;
    }
}

export default {
    getUserLocation,
    hasLocationPermission,
};
