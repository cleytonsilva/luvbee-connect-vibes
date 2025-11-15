/**
 * Utility functions for sanitizing user input to prevent XSS attacks
 */

import DOMPurify from 'dompurify'

/**
 * Sanitiza texto simples (remove todo HTML)
 * Use para campos como bio, name, etc.
 */
export function sanitizeText(input: string): string {
  if (!input) return ''
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}

/**
 * Sanitiza conteúdo de mensagem (permite formatação básica)
 * Use para mensagens de chat
 */
export function sanitizeMessageContent(input: string): string {
  if (!input) return ''
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  })
}

/**
 * Sanitiza HTML para renderização segura
 * Use quando precisar renderizar HTML de fontes confiáveis
 */
export function sanitizeHTML(input: string): string {
  if (!input) return ''
  return DOMPurify.sanitize(input)
}

