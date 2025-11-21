import { create } from 'zustand'
import type { LocationData } from '@/types/app.types'

interface CacheEntry<T> {
  data: T
  ts: number
}

interface GeoCacheState {
  ttlMs: number
  radiusCache: Record<string, CacheEntry<LocationData[]>>
  popularCache: Record<string, CacheEntry<LocationData[]>>
  setTTL: (ms: number) => void
  getRadius: (key: string) => LocationData[] | null
  setRadius: (key: string, data: LocationData[]) => void
  getPopular: (key: string) => LocationData[] | null
  setPopular: (key: string, data: LocationData[]) => void
  clear: () => void
}

export const useGeoCache = create<GeoCacheState>((set, get) => ({
  ttlMs: 5 * 60 * 1000,
  radiusCache: {},
  popularCache: {},
  setTTL: (ms) => set({ ttlMs: ms }),
  getRadius: (key) => {
    const entry = get().radiusCache[key]
    if (!entry) return null
    if (Date.now() - entry.ts > get().ttlMs) return null
    return entry.data
  },
  setRadius: (key, data) => {
    const radiusCache = { ...get().radiusCache }
    radiusCache[key] = { data, ts: Date.now() }
    set({ radiusCache })
  },
  getPopular: (key) => {
    const entry = get().popularCache[key]
    if (!entry) return null
    if (Date.now() - entry.ts > get().ttlMs) return null
    return entry.data
  },
  setPopular: (key, data) => {
    const popularCache = { ...get().popularCache }
    popularCache[key] = { data, ts: Date.now() }
    set({ popularCache })
  },
  clear: () => set({ radiusCache: {}, popularCache: {} })
}))

export const makeRadiusKey = (lat: number, lng: number, radius: number) => `${lat.toFixed(6)}:${lng.toFixed(6)}:${radius}`

