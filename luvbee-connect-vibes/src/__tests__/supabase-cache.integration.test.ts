import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../integrations/supabase';

// Test data
const TEST_PLACE_ID = 'test-place-id-123';
const TEST_PHOTO_REFERENCE = 'test-photo-ref-456';

describe('Supabase Cache Integration', () => {
  let testCacheId: string | null = null;

  beforeAll(async () => {
    // Clean up any existing test data
    await supabase
      .from('cached_place_photos')
      .delete()
      .eq('place_id', TEST_PLACE_ID);
  });

  afterAll(async () => {
    // Clean up test data
    if (testCacheId) {
      await supabase
        .from('cached_place_photos')
        .delete()
        .eq('id', testCacheId);
    }
  });

  describe('cached_place_photos table', () => {
    it('should create a new cache entry', async () => {
      const { data, error } = await supabase
        .from('cached_place_photos')
        .insert({
          place_id: TEST_PLACE_ID,
          photo_reference: TEST_PHOTO_REFERENCE,
          storage_path: 'div/test-image.jpg',
          public_url: 'https://example.com/test-image.jpg'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.place_id).toBe(TEST_PLACE_ID);
      expect(data.photo_reference).toBe(TEST_PHOTO_REFERENCE);
      expect(data.storage_path).toBe('div/test-image.jpg');
      expect(data.public_url).toBe('https://example.com/test-image.jpg');
      
      testCacheId = data.id;
    });

    it('should retrieve cache entry by place_id', async () => {
      const { data, error } = await supabase
        .from('cached_place_photos')
        .select('*')
        .eq('place_id', TEST_PLACE_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.place_id).toBe(TEST_PLACE_ID);
    });

    it('should use the get_cached_photo_url function', async () => {
      const { data, error } = await supabase
        .rpc('get_cached_photo_url', { place_id_param: TEST_PLACE_ID });

      expect(error).toBeNull();
      expect(data).toBe('https://example.com/test-image.jpg');
    });
  });

  describe('Storage bucket "div"', () => {
    it('should exist and be public', async () => {
      const { data, error } = await supabase
        .storage
        .from('div')
        .list();

      // The bucket should exist (error should be null or not "not found")
      expect(error?.message).not.toContain('not found');
    });
  });

  describe('RLS Policies', () => {
    it('should allow public read access to cached photos', async () => {
      // Test with anonymous client (no auth)
      const anonClient = supabase;
      
      const { data, error } = await anonClient
        .from('cached_place_photos')
        .select('*')
        .eq('place_id', TEST_PLACE_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });
  });
});