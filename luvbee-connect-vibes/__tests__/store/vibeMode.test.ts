import { describe, it, expect } from 'vitest'
import { useVibeModeStore, isSoloPlace } from '@/store/useVibeMode'

describe('VibeMode store', () => {
  it('toggles and persists solo mode', () => {
    useVibeModeStore.getState().setSoloMode(false)
    useVibeModeStore.getState().toggleSoloMode()
    expect(useVibeModeStore.getState().soloMode).toBe(true)
  })
})

describe('isSoloPlace', () => {
  it('detects privê/swing by type and name', () => {
    expect(isSoloPlace('Privê X', null, '')).toBe(true)
    expect(isSoloPlace('Lugar', ['swing_club'], 'night_club')).toBe(true)
    expect(isSoloPlace('Bar', null, 'bar')).toBe(false)
  })
})

