/**
 * Validation Schemas - LuvBee Core Platform
 * 
 * Baseado em: specs/001-luvbee-core-platform/contracts/zod-schemas.md
 * 
 * Todos os schemas Zod para validação de dados do frontend antes de enviar para o backend.
 */

import { z } from 'zod'
import { sanitizeText } from './sanitize'

// ============================================
// User Schemas
// ============================================

export const userRegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os Termos de Uso para criar uma conta',
  }),
})

export const userLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeText).optional(),
  bio: z.string().max(500, 'Bio muito longa').transform(sanitizeText).optional(),
  age: z.number().int().min(18, 'Idade mínima é 18 anos').max(120, 'Idade inválida').optional(),
  location_latitude: z.number().min(-90).max(90).optional(),
  location_longitude: z.number().min(-180).max(180).optional(),
  search_radius_km: z.number().int().min(1).max(100).optional(),
  avatar_url: z.string().url().optional().nullable(),
})

// Alias para compatibilidade
export const updateUserSchema = userUpdateSchema

export type UserRegisterInput = z.infer<typeof userRegisterSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

// ============================================
// User Preferences Schemas
// ============================================

// Opções pré-definidas de preferências
export const DRINK_OPTIONS = [
  'cerveja',
  'vinho',
  'cocktail',
  'whisky',
  'vodka',
  'gin',
  'rum',
  'cachaça',
  'champagne',
  'refrigerante',
  'água',
  'suco',
] as const

export const FOOD_OPTIONS = [
  'pizza',
  'hamburguer',
  'sushi',
  'mexicana',
  'italiana',
  'japonesa',
  'brasileira',
  'vegetariana',
  'vegana',
  'fast-food',
  'petiscos',
  'sobremesa',
] as const

export const MUSIC_OPTIONS = [
  'rock',
  'pop',
  'eletrônica',
  'sertanejo',
  'funk',
  'hip-hop',
  'reggae',
  'jazz',
  'samba',
  'pagode',
  'forró',
  'indie',
] as const

export const userPreferencesSchema = z.object({
  drink_preferences: z
    .array(z.enum(DRINK_OPTIONS))
    .min(1, 'Selecione pelo menos uma preferência de bebida')
    .max(10, 'Máximo 10 preferências de bebida'),
  food_preferences: z
    .array(z.enum(FOOD_OPTIONS))
    .min(1, 'Selecione pelo menos uma preferência de comida')
    .max(10, 'Máximo 10 preferências de comida'),
  music_preferences: z
    .array(z.enum(MUSIC_OPTIONS))
    .min(1, 'Selecione pelo menos uma preferência musical')
    .max(10, 'Máximo 10 preferências musicais'),
  vibe_preferences: z
    .object({
      ambiente: z.enum(['calmo', 'animado', 'eclético']).optional(),
      horario_preferido: z.enum(['manhã', 'tarde', 'noite', 'madrugada']).optional(),
      frequencia: z.enum(['diária', 'semanal', 'quinzenal', 'mensal']).optional(),
    })
    .optional()
    .nullable(),
})

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>

// Schema para atualização de preferências (todos os campos opcionais)
export const updatePreferencesSchema = userPreferencesSchema.partial().extend({
  drink_preferences: z.array(z.enum(DRINK_OPTIONS)).min(1).max(10).optional(),
  food_preferences: z.array(z.enum(FOOD_OPTIONS)).min(1).max(10).optional(),
  music_preferences: z.array(z.enum(MUSIC_OPTIONS)).min(1).max(10).optional(),
})

// Alias para compatibilidade
export const preferencesSchema = userPreferencesSchema

// ============================================
// Location Schemas
// ============================================

export const locationTypeSchema = z.enum([
  'bar',
  'nightclub',
  'restaurant',
  'pub',
  'lounge',
  'cafe',
  'hotel',
  'event',
  'other',
])

export const locationCreateSchema = z.object({
  google_place_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  type: locationTypeSchema,
  address: z.string().min(1, 'Endereço é obrigatório'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().max(1000).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url().optional().nullable(),
  price_level: z.number().int().min(1).max(4).optional().nullable(),
})

export const locationUpdateSchema = locationCreateSchema.partial()

export type LocationCreateInput = z.infer<typeof locationCreateSchema>
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>

// ============================================
// Location Match Schemas
// ============================================

export const locationMatchCreateSchema = z.object({
  location_id: z.string().uuid('ID de local inválido'),
  status: z.enum(['active', 'inactive']).default('active'),
})

export type LocationMatchInput = z.infer<typeof locationMatchCreateSchema>

// ============================================
// People Match Schemas
// ============================================

export const peopleMatchLikeSchema = z.object({
  matched_user_id: z.string().uuid('ID de usuário inválido'),
})

export type PeopleMatchLikeInput = z.infer<typeof peopleMatchLikeSchema>

// ============================================
// Chat Schemas
// ============================================

export const chatCreateSchema = z.object({
  user2_id: z.string().uuid('ID de usuário inválido'),
  people_match_id: z.string().uuid('ID de match inválido').optional().nullable(),
})

export type ChatCreateInput = z.infer<typeof chatCreateSchema>

// ============================================
// Message Schemas
// ============================================

export const messageCreateSchema = z.object({
  chat_id: z.string().uuid('ID de chat inválido'),
  content: z
    .string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem muito longa (máximo 2000 caracteres)')
    .transform((val) => {
      // Sanitização será feita no MessageService.sendMessage
      return val
    }),
})

export const messageUpdateSchema = z.object({
  is_deleted: z.boolean().optional(),
})

export type MessageCreateInput = z.infer<typeof messageCreateSchema>
export type MessageUpdateInput = z.infer<typeof messageUpdateSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Valida dados usando um schema Zod e retorna resultado tipado
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Valida dados e lança erro se inválido
 */
export function validateOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data)
}

/**
 * Formata erros de validação Zod para exibição ao usuário
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
}

