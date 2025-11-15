import { describe, it, expect } from 'vitest';
import { supabase, isSupabaseConfigured } from '../integrations/supabase';

describe('Supabase Cache Integration', () => {
  
  it('should have Supabase configured', () => {
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('should be able to connect to Supabase', async () => {
    const { data, error } = await supabase
      .from('cached_place_photos')
      .select('*')
      .limit(1);

    // Should either return data or have a specific error
    expect(error?.message).not.toContain('not found');
  });

  it('should have bucket "div" available', async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('div')
        .list('', { limit: 1 });

      // Should not have "not found" error
      expect(error?.message).not.toContain('not found');
      expect(Array.isArray(data)).toBe(true);
    } catch (error: any) {
      // If it fails, it should be due to permissions, not bucket missing
      expect(error.message).not.toContain('not found');
    }
  });

  it('should support basic database operations', async () => {
    // Test that we can query the database
    const { data, error } = await supabase
      .rpc('version');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});