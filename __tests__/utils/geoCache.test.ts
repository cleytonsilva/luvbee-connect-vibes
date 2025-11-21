import { describe, it, expect } from 'vitest'
import { useGeoCache, makeRadiusKey } from '@/hooks/useGeoCache'

describe('useGeoCache', () => {
  it('stores and retrieves radius cache within TTL', () => {
    const key = makeRadiusKey(10.123456, -20.123456, 5000)
    const sample = [{ id: '1', name: 'A', address: 'Addr', category: 'bar', rating: 4, is_verified: false, is_active: true, created_at: '', updated_at: '' }]
    useGeoCache.getState().setRadius(key, sample as any)
    const result = useGeoCache.getState().getRadius(key)
    expect(result).not.toBeNull()
    expect(result?.[0].name).toBe('A')
  })

  it('expires entries after TTL', async () => {
    useGeoCache.getState().setTTL(10)
    const key = makeRadiusKey(0, 0, 1000)
    useGeoCache.getState().setRadius(key, [] as any)
    await new Promise(r => setTimeout(r, 20))
    const result = useGeoCache.getState().getRadius(key)
    expect(result).toBeNull()
    useGeoCache.getState().setTTL(5 * 60 * 1000)
  })
})

