import { describe, it, expect, beforeEach } from 'vitest'
import { validationService } from '@/services/validation.service'
import { ValidationError } from '@/lib/errors'
import { csrfService } from '@/lib/csrf'

describe('Security validations', () => {
  beforeEach(() => {
    csrfService.resetToken()
  })

  it('blocks SQL injection payloads', () => {
    expect(() => validationService.ensureSecureString("1'; DROP TABLE users; --", 'content'))
      .toThrow(ValidationError)
  })

  it('blocks XSS payloads before sanitization', () => {
    expect(() => validationService.ensureSecureString('<img src=x onerror=alert(1)>', 'content'))
      .toThrow(ValidationError)
  })

  it('requires a valid CSRF token', () => {
    const token = csrfService.ensureToken()
    expect(() => csrfService.requireValidToken(token)).not.toThrow()
    expect(() => csrfService.requireValidToken('invalid-token')).toThrow(ValidationError)
  })
})
