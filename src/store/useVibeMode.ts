import { create } from 'zustand'

interface VibeModeState {
  soloMode: boolean
  setSoloMode: (value: boolean) => void
  toggleSoloMode: () => void
}

const STORAGE_KEY = 'luvbee-vibe-solo-mode'

export const useVibeModeStore = create<VibeModeState>((set, get) => {
  const initial = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) === 'true') : false
  return {
    soloMode: initial,
    setSoloMode: (value) => {
      set({ soloMode: value })
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(value))
    },
    toggleSoloMode: () => {
      const next = !get().soloMode
      set({ soloMode: next })
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(next))
    },
  }
})

export const isSoloPlace = (name?: string, types?: string[] | null, type?: string) => {
  const t = (types || []).map((x) => x.toLowerCase())
  const ty = (type || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (ty.includes('prive') || ty.includes('swing')) return true
  if (t.some((x) => x.includes('prive') || x.includes('swing'))) return true
  if (n.includes('privê') || n.includes('prive') || n.includes('swing')) return true
  return false
}

