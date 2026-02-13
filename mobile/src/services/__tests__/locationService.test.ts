import { searchNearbyPlaces } from '../locationService';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
    supabase: {
        functions: {
            invoke: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
        })),
    },
}));

describe('locationService', () => {
    const mockPlaces = [
        { place_id: 'place1', name: 'Place 1' },
        { place_id: 'place2', name: 'Place 2' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchNearbyPlaces', () => {
        it('should return places from edge function', async () => {
            (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
                data: { data: mockPlaces },
                error: null,
            });
            // Mock batchGetLikesCount (via supabase.from) to return empty
            (supabase.from as jest.Mock).mockImplementation((table) => {
                if (table === 'user_locations') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        in: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                return { select: jest.fn() };
            });


            const result = await searchNearbyPlaces(-23.55, -46.63);

            expect(supabase.functions.invoke).toHaveBeenCalledWith('search-nearby', expect.any(Object));
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('place1');
        });

        it('should filter out places user has interacted with', async () => {
            // Mock places returned from edge function
            (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
                data: { data: mockPlaces },
                error: null,
            });

            // Mock user interactions: user has liked 'place1'
            (supabase.from as jest.Mock).mockImplementation((table) => {
                if (table === 'user_locations') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: [{ google_place_id: 'place1' }], error: null }),
                        in: jest.fn().mockReturnThis(),
                    };
                }
                return {};
            });

            const result = await searchNearbyPlaces(-23.55, -46.63, 5000, undefined, 'user123');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('place2');
        });

        it('should handle empty results gracefully', async () => {
            (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
                data: { data: [] },
                error: null,
            });

            const result = await searchNearbyPlaces(-23.55, -46.63);
            expect(result).toEqual([]);
        });

        it('should handle edge function error', async () => {
            (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
                data: null,
                error: new Error('Edge function error'),
            });

            await expect(searchNearbyPlaces(-23.55, -46.63)).rejects.toThrow('Edge function error');
        });
    });
});
