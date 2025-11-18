import { ValidationError } from './errors'

const STORAGE_KEY = 'luvbee:csrf-token'
const memoryStore: Record<string, string | null> = {}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window?.localStorage) {
    return window.localStorage
  }
  return null
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

class CsrfService {
  private generateToken(): string {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const buffer = new Uint8Array(32)
      crypto.getRandomValues(buffer)
      return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  ensureToken(): string {
    const existing = this.getToken()
    if (existing) return existing
    const fresh = this.generateToken()
    this.persistToken(fresh)
    return fresh
  }

  getToken(): string | null {
    const storage = getStorage()
    if (storage) {
      const stored = storage.getItem(STORAGE_KEY)
      if (stored) {
        memoryStore[STORAGE_KEY] = stored
        return stored
      }
    }
    return memoryStore[STORAGE_KEY] ?? null
  }

  persistToken(token: string): void {
    const storage = getStorage()
    if (storage) {
      storage.setItem(STORAGE_KEY, token)
    }
    memoryStore[STORAGE_KEY] = token
  }

  resetToken(): void {
    const storage = getStorage()
    if (storage) {
      storage.removeItem(STORAGE_KEY)
    }
    memoryStore[STORAGE_KEY] = null
  }

  validateToken(token?: string | null): boolean {
    const stored = this.getToken()
    if (!token || !stored) return false
    return timingSafeEqual(token, stored)
  }

  requireValidToken(token?: string | null): void {
    if (!this.validateToken(token)) {
      throw new ValidationError('Token CSRF inválido ou ausente', {
        csrfToken: ['CSRF token inválido ou não encontrado']
      })
    }
  }
}

export const csrfService = new CsrfService()
export type CsrfServiceType = CsrfService
