import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageService } from '../message.service'
import { csrfService } from '@/lib/csrf'

let lastInsertedPayload: any = null

const singleMock = vi.fn(async () => ({
  data: {
    id: 'message-id',
    chat_id: lastInsertedPayload?.chat_id ?? 'chat',
    sender_id: lastInsertedPayload?.sender_id ?? 'user',
    content: lastInsertedPayload?.content ?? '',
    read_at: null,
    created_at: new Date().toISOString(),
    sender: null,
  },
  error: null,
}))

const selectMock = vi.fn(() => ({
  single: singleMock,
}))

const insertMock = vi.fn((payload) => {
  lastInsertedPayload = Array.isArray(payload) ? payload[0] : payload
  return {
    select: selectMock,
  }
})

vi.mock('../../integrations/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}))

describe('MessageService security', () => {
  beforeEach(() => {
    lastInsertedPayload = null
    insertMock.mockClear()
    selectMock.mockClear()
    singleMock.mockClear()
    csrfService.resetToken()
  })

  it('rejects SQL injection attempts before touching the database', async () => {
    const csrfToken = csrfService.ensureToken()
    const result = await MessageService.sendMessage('chat', 'user', "1'; DROP TABLE users; --", { csrfToken })
    expect(result.error).toContain('SQL Injection')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('sanitizes HTML payloads before persisting', async () => {
    const csrfToken = csrfService.ensureToken()
    const result = await MessageService.sendMessage('chat', 'user', '<img src=x onerror=alert(1)>Olá', { csrfToken })
    expect(result.error).toContain('XSS')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('fails when CSRF token is missing', async () => {
    const result = await MessageService.sendMessage('chat', 'user', 'Olá sem token')
    expect(result.error).toContain('Token CSRF')
  })
})
