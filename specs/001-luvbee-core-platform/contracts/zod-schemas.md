# Zod Validation Schemas: LuvBee Core Platform

**Branch**: `001-luvbee-core-platform` | **Date**: 2025-01-27

## Overview

Este documento define todos os schemas de validação Zod que devem ser implementados em `src/lib/validations.ts`.

## User Schemas

### Signup Schema

```typescript
export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),
  age: z.number()
    .int('Idade deve ser um número inteiro')
    .min(18, 'Você deve ter pelo menos 18 anos')
    .max(120, 'Idade inválida'),
});
```

### Login Schema

```typescript
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});
```

### Update User Schema

```typescript
export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  age: z.number().int().min(18).max(120).optional(),
  photo_url: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  location_latitude: z.number().min(-90).max(90).nullable().optional(),
  location_longitude: z.number().min(-180).max(180).nullable().optional(),
  search_radius_km: z.number().int().min(1).max(100).optional(),
}).strict();
```

---

## Preferences Schemas

### Preference Options

```typescript
export const DRINK_OPTIONS = [
  'cerveja', 'vinho', 'cocktail', 'whisky', 'vodka',
  'cachaça', 'gin', 'rum', 'tequila', 'champagne',
] as const;

export const FOOD_OPTIONS = [
  'pizza', 'hamburguer', 'sushi', 'mexicana', 'italiana',
  'brasileira', 'japonesa', 'chinesa', 'francesa', 'vegetariana',
] as const;

export const MUSIC_OPTIONS = [
  'rock', 'pop', 'eletrônica', 'sertanejo', 'funk',
  'hip-hop', 'reggae', 'samba', 'pagode', 'forró',
] as const;
```

### User Preferences Schema

```typescript
export const preferencesSchema = z.object({
  user_id: z.string().uuid('ID de usuário inválido'),
  drink_preferences: z.array(
    z.enum(DRINK_OPTIONS)
  ).min(1, 'Selecione pelo menos uma preferência de drink')
    .max(10, 'Máximo 10 preferências de drinks'),
  food_preferences: z.array(
    z.enum(FOOD_OPTIONS)
  ).min(1, 'Selecione pelo menos uma preferência de comida')
    .max(10, 'Máximo 10 preferências de comida'),
  music_preferences: z.array(
    z.enum(MUSIC_OPTIONS)
  ).min(1, 'Selecione pelo menos uma preferência musical')
    .max(10, 'Máximo 10 preferências musicais'),
  vibe_preferences: z.record(z.any()).optional(),
}).strict();
```

### Update Preferences Schema

```typescript
export const updatePreferencesSchema = preferencesSchema.partial().extend({
  user_id: z.string().uuid(),
}).strict();
```

---

## Location Schemas

### Location Type Enum

```typescript
export const LOCATION_TYPES = [
  'bar', 'nightclub', 'restaurant', 'event', 'cafe',
  'lounge', 'pub', 'club', 'venue', 'other',
] as const;

export const locationTypeSchema = z.enum(LOCATION_TYPES);
```

### Location Match Schema

```typescript
export const locationMatchSchema = z.object({
  user_id: z.string().uuid('ID de usuário inválido'),
  location_id: z.string().uuid('ID de local inválido'),
}).strict();
```

### Location Filter Schema

```typescript
export const locationFilterSchema = z.object({
  type: z.enum(LOCATION_TYPES).optional(),
  is_curated: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().int().min(1).max(100).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_price_level: z.number().int().min(1).max(4).optional(),
}).strict();
```

---

## People Match Schemas

### People Match Schema

```typescript
export const peopleMatchSchema = z.object({
  user1_id: z.string().uuid('ID de usuário 1 inválido'),
  user2_id: z.string().uuid('ID de usuário 2 inválido'),
}).refine(
  (data) => data.user1_id < data.user2_id,
  {
    message: 'user1_id deve ser menor que user2_id',
    path: ['user1_id'],
  }
).strict();
```

---

## Chat Schemas

### Chat ID Schema

```typescript
export const chatIdSchema = z.string().uuid('ID de chat inválido');
```

---

## Message Schemas

### Message Schema

```typescript
export const messageSchema = z.object({
  chat_id: z.string().uuid('ID de chat inválido'),
  sender_id: z.string().uuid('ID de remetente inválido'),
  content: z.string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem muito longa (máximo 2000 caracteres)'),
}).strict();
```

### Update Message Schema

```typescript
export const updateMessageSchema = z.object({
  read_at: z.string().datetime().optional(),
  is_deleted: z.boolean().optional(),
}).strict();
```

---

## Google Places Schemas

### Nearby Search Schema

```typescript
export const nearbySearchSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  radius: z.number().int().min(1).max(50000),
  type: z.enum(LOCATION_TYPES).optional(),
}).strict();
```

### Place Details Schema

```typescript
export const placeDetailsSchema = z.object({
  place_id: z.string().min(1),
}).strict();
```

---

## Type Exports

Todos os schemas devem exportar também os tipos TypeScript inferidos:

```typescript
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type LocationMatchInput = z.infer<typeof locationMatchSchema>;
export type PeopleMatchInput = z.infer<typeof peopleMatchSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
// ... etc
```

---

## Validation Helpers

Funções auxiliares para validação:

```typescript
export function validateSignup(data: unknown): SignupInput {
  return signupSchema.parse(data);
}

export function validateLogin(data: unknown): LoginInput {
  return loginSchema.parse(data);
}

// ... etc para cada schema
```

---

## Error Handling

Todos os schemas devem usar `.safeParse()` para validação com tratamento de erros:

```typescript
const result = schema.safeParse(data);
if (!result.success) {
  // Retornar erros formatados para o usuário
  return {
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
```

