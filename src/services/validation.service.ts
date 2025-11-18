import { z } from 'zod'
import { supabase } from '@/integrations/supabase'
import { safeLog } from '@/lib/safe-log'
import { ValidationError } from '@/lib/errors'

// Schemas de validação
export const userSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  age: z.number().int().min(18, 'Idade mínima é 18 anos').max(120, 'Idade inválida').nullable(),
  bio: z.string().max(500, 'Bio muito longa').nullable(),
  avatar_url: z.string().url('URL inválida').nullable(),
  preferences: z.object({}).passthrough().nullable()
})

export const locationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  address: z.string().min(1, 'Endereço é obrigatório').max(500, 'Endereço muito longo'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().max(1000, 'Descrição muito longa').nullable(),
  lat: z.number().min(-90).max(90, 'Latitude inválida'),
  lng: z.number().min(-180).max(180, 'Longitude inválida'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Telefone inválido').nullable(),
  website: z.string().url('URL inválida').nullable(),
  rating: z.number().min(0).max(5, 'Avaliação deve ser entre 0 e 5').nullable(),
  price_level: z.number().int().min(1).max(4, 'Nível de preço deve ser entre 1 e 4').nullable()
})

export const messageSchema = z.object({
  content: z.string().min(1, 'Mensagem não pode estar vazia').max(1000, 'Mensagem muito longa'),
  receiver_id: z.string().uuid('ID do receptor inválido')
})

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Avaliação mínima é 1').max(5, 'Avaliação máxima é 5'),
  comment: z.string().max(1000, 'Comentário muito longo').nullable(),
  images: z.array(z.string().url('URL inválida')).max(5, 'Máximo 5 imagens').nullable()
})

// Tipos derivados dos schemas
export type UserInput = z.infer<typeof userSchema>
export type LocationInput = z.infer<typeof locationSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type ReviewInput = z.infer<typeof reviewSchema>

/**
 * Serviço de validação e segurança de dados
 */
export class ValidationService {
  private static instance: ValidationService
  private readonly sqlInjectionPatterns = [
    /('.+--)/i,
    /(\bor\b|\band\b)\s+\d+=\d+/i,
    /(;\s*drop\s+table)/i,
    /(union\s+select)/i,
    /(\bexec\b|\bexecute\b)\s+/i,
  ]

  private readonly xssPatterns = [
    /<script[\s>]/i,
    /on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i,
    /javascript:/i,
    /data:text\/html/i,
  ]

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService()
    }
    return ValidationService.instance
  }

  /**
   * Validar dados de usuário
   */
  validateUser(data: any): UserInput {
    try {
      return userSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        throw new ValidationError('Dados de usuário inválidos', fieldErrors)
      }
      throw error
    }
  }

  /**
   * Validar dados de localização
   */
  validateLocation(data: any): LocationInput {
    try {
      return locationSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        throw new ValidationError('Dados de localização inválidos', fieldErrors)
      }
      throw error
    }
  }

  /**
   * Validar mensagem
   */
  validateMessage(data: any): MessageInput {
    try {
      const parsed = messageSchema.parse(data)
      this.ensureSecureString(parsed.content, 'content')
      return parsed
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        throw new ValidationError('Dados de mensagem inválidos', fieldErrors)
      }
      throw error
    }
  }

  /**
   * Validar avaliação
   */
  validateReview(data: any): ReviewInput {
    try {
      return reviewSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        throw new ValidationError('Dados de avaliação inválidos', fieldErrors)
      }
      throw error
    }
  }

  /**
   * Sanitizar string para prevenir XSS
   */
  sanitizeString(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Validar e sanitizar email
   */
  validateAndSanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim()
    
    // Validar formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitized)) {
      throw new ValidationError('Email inválido', 'email')
    }

    // Verificar domínio suspeito
    const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'mailinator.com']
    const domain = sanitized.split('@')[1]
    if (suspiciousDomains.includes(domain)) {
      throw new ValidationError('Domínio de email não permitido', 'email')
    }

    return sanitized
  }

  /**
   * Validar senha
   */
  validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Senha deve ter pelo menos 8 caracteres', 'password')
    }

    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Senha deve conter pelo menos uma letra maiúscula', 'password')
    }

    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Senha deve conter pelo menos uma letra minúscula', 'password')
    }

    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Senha deve conter pelo menos um número', 'password')
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new ValidationError('Senha deve conter pelo menos um caractere especial', 'password')
    }

    // Verificar senhas comuns
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]
    
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Senha muito comum, escolha uma senha mais forte', 'password')
    }
  }

  /**
   * Validar UUID
   */
  validateUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(uuid)) {
      throw new ValidationError('UUID inválido', 'id')
    }
  }

  /**
   * Validar URL
   */
  validateUrl(url: string): void {
    try {
      new URL(url)
    } catch {
      throw new ValidationError('URL inválida', 'url')
    }

    // Verificar protocolo
    const allowedProtocols = ['http:', 'https:']
    const parsedUrl = new URL(url)
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new ValidationError('Protocolo não permitido', 'url')
    }
  }

  /**
   * Validar tamanho de arquivo
   */
  validateFileSize(sizeInBytes: number, maxSizeInMB: number): void {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    if (sizeInBytes > maxSizeInBytes) {
      throw new ValidationError(`Arquivo muito grande. Máximo: ${maxSizeInMB}MB`, 'file')
    }
  }

  /**
   * Validar tipo de arquivo
   */
  validateFileType(mimeType: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError(`Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`, 'file')
    }
  }

  /**
   * Validar coordenadas geográficas
   */
  validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new ValidationError('Latitude deve estar entre -90 e 90', 'lat')
    }

    if (lng < -180 || lng > 180) {
      throw new ValidationError('Longitude deve estar entre -180 e 180', 'lng')
    }
  }

  /**
   * Verificar duplicação de dados
   */
  async checkDuplicate(table: string, field: string, value: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from(table)
        .select('id')
        .eq(field, value)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query.limit(1)

      if (error) {
        safeLog('error', 'Erro ao verificar duplicação:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      safeLog('error', 'Erro crítico ao verificar duplicação:', error)
      return false
    }
  }

  /**
   * Validar limite de operações por usuário
   */
  async checkRateLimit(
    userId: string, 
    action: string, 
    limit: number, 
    timeWindow: number // em minutos
  ): Promise<void> {
    try {
      const startTime = new Date()
      startTime.setMinutes(startTime.getMinutes() - timeWindow)

      const { data, error } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('action', action)
        .gte('created_at', startTime.toISOString())

      if (error) {
        safeLog('error', 'Erro ao verificar rate limit:', error)
        return // Não bloquear por erro de verificação
      }

      if (data && data.length >= limit) {
        throw new ValidationError(
          `Limite de ${limit} operações de ${action} excedido. Tente novamente em ${timeWindow} minutos.`,
          'rate_limit'
        )
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      safeLog('error', 'Erro crítico ao verificar rate limit:', error)
    }
  }

  /**
   * Validar dados contra schema do banco de dados
   */
  async validateAgainstSchema(table: string, data: any): Promise<void> {
    try {
      // Obter schema da tabela (simplificado - em produção usar introspection real)
      const { data: tableInfo, error } = await supabase
        .rpc('describe_table', { table_name: table })

      if (error || !tableInfo) {
        safeLog('warn', 'Não foi possível obter schema da tabela:', table)
        return // Não bloquear por falha de validação de schema
      }

      // Validar campos obrigatórios
      const requiredFields = tableInfo.filter((field: any) => field.is_nullable === false)
      for (const field of requiredFields) {
        if (data[field.column_name] === undefined || data[field.column_name] === null) {
          throw new ValidationError(`Campo obrigatório: ${field.column_name}`, field.column_name)
        }
      }

      // Validar tipos de dados (simplificado)
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue

        const field = tableInfo.find((f: any) => f.column_name === key)
        if (!field) continue

        // Validações básicas de tipo
        switch (field.data_type) {
          case 'integer':
          case 'bigint':
            if (!Number.isInteger(value)) {
              throw new ValidationError(`Campo ${key} deve ser um número inteiro`, key)
            }
            break
          case 'numeric':
          case 'real':
          case 'double precision':
            if (typeof value !== 'number') {
              throw new ValidationError(`Campo ${key} deve ser um número`, key)
            }
            break
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new ValidationError(`Campo ${key} deve ser verdadeiro ou falso`, key)
            }
            break
          case 'character varying':
          case 'text':
            if (typeof value !== 'string') {
              throw new ValidationError(`Campo ${key} deve ser um texto`, key)
            }
            break
          case 'timestamp with time zone':
            if (!(value instanceof Date) && isNaN(Date.parse(value as string))) {
              throw new ValidationError(`Campo ${key} deve ser uma data válida`, key)
            }
            break
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      safeLog('error', 'Erro ao validar contra schema:', error)
      // Não bloquear por falha de validação de schema
    }
  }

  /**
   * Validar dados sensíveis
   */
  validateSensitiveData(data: string): void {
    // Verificar PII (Personally Identifiable Information)
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    ]

    for (const pattern of piiPatterns) {
      if (pattern.test(data)) {
        throw new ValidationError('Dados sensíveis detectados no conteúdo', 'content')
      }
    }

    // Verificar palavras proibidas
    const forbiddenWords = [
      'password', 'senha', 'cpf', 'cnpj', 'rg', 'credit card',
      'bank account', 'account number', 'routing number'
    ]

    const lowerData = data.toLowerCase()
    for (const word of forbiddenWords) {
      if (lowerData.includes(word)) {
        throw new ValidationError('Conteúdo contém informações sensíveis proibidas', 'content')
      }
    }
  }

  ensureSecureString(value: string, field: string = 'input'): void {
    if (!value) return
    this.detectSQLInjection(value, field)
    this.detectXSSPayload(value, field)
  }

  detectSQLInjection(value: string, field: string = 'input'): void {
    if (this.sqlInjectionPatterns.some(pattern => pattern.test(value))) {
      throw new ValidationError('Entrada contém padrão suspeito de SQL Injection', {
        [field]: ['Padrão de SQL Injection detectado']
      })
    }
  }

  detectXSSPayload(value: string, field: string = 'input'): void {
    if (this.xssPatterns.some(pattern => pattern.test(value))) {
      throw new ValidationError('Entrada contém padrão suspeito de XSS', {
        [field]: ['Padrão de XSS detectado']
      })
    }
  }
}

// Exportar instância singleton
export const validationService = ValidationService.getInstance()
export default validationService