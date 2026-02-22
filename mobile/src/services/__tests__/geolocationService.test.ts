import { getUserLocation } from '../geolocationService';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
    geocodeAsync: jest.fn(),
    Accuracy: { Balanced: 3 },
}));

describe('geolocationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserLocation', () => {
        it('should return GPS location when available', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
                coords: { latitude: 10, longitude: 10 },
            });
            (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ city: 'GPS City' }]);

            const result = await getUserLocation();

            expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
            expect(result).toEqual({
                latitude: 10,
                longitude: 10,
                source: 'gps',
                cityName: 'GPS City',
            });
        });

        it('should fallback to Profile coordinates when GPS denied', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

            const result = await getUserLocation('Profile City', 20, 20);

            expect(result).toEqual({
                latitude: 20,
                longitude: 20,
                source: 'profile',
                cityName: 'Profile City',
            });
        });

        it('should fallback to Geocoding when profile has city but no coords', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            (Location.geocodeAsync as jest.Mock).mockResolvedValue([{ latitude: 30, longitude: 30 }]);

            const result = await getUserLocation('Geocoded City');

            expect(Location.geocodeAsync).toHaveBeenCalledWith('Geocoded City');
            expect(result).toEqual({
                latitude: 30,
                longitude: 30,
                source: 'geocoded',
                cityName: 'Geocoded City',
            });
        });

        it('should fallback to Default when everything fails', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            // No profile city provided

            const result = await getUserLocation();

            expect(result.source).toBe('default');
            expect(result.cityName).toBe('São Paulo');
        });
    });
});
