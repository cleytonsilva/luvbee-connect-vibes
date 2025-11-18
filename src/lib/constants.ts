/**
 * Constants - LuvBee Core Platform
 * 
 * Constantes do projeto incluindo cores, opções de preferências, configurações, etc.
 */

// ============================================
// Design System Colors (Neo-Brutalist)
// ============================================

export const COLORS = {
  primary: '#ff00ff', // Magenta
  accent: '#FFFF00', // Yellow
  background: '#f8f5f8',
  foreground: '#000000',
  border: '#000000',
} as const

// ============================================
// Fonts
// ============================================

export const FONTS = {
  sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
  mono: ['Space Mono', 'ui-monospace', 'monospace'],
} as const

// ============================================
// Preference Options
// ============================================

export const DRINK_PREFERENCES = [
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

export const FOOD_PREFERENCES = [
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

export const MUSIC_PREFERENCES = [
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

export const VIBE_AMBIENTE = ['calmo', 'animado', 'eclético'] as const
export const VIBE_HORARIO = ['manhã', 'tarde', 'noite', 'madrugada'] as const
export const VIBE_FREQUENCIA = ['diária', 'semanal', 'quinzenal', 'mensal'] as const

// ============================================
// Location Types
// ============================================

export const LOCATION_TYPES = [
  'bar',
  'nightclub',
  'restaurant',
  'pub',
  'lounge',
  'cafe',
  'hotel',
  'event',
  'other',
] as const

export type LocationType = (typeof LOCATION_TYPES)[number]

// ============================================
// Match Status
// ============================================

export const MATCH_STATUS = {
  PENDING: 'pending',
  MUTUAL: 'mutual',
  UNMATCHED: 'unmatched',
} as const

export const LOCATION_MATCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

// ============================================
// App Configuration
// ============================================

export const APP_CONFIG = {
  name: 'LuvBee',
  defaultSearchRadius: 10, // km
  minAge: 18,
  maxAge: 120,
  maxBioLength: 500,
  maxMessageLength: 2000,
  maxPreferencesPerCategory: 10,
  minPreferencesPerCategory: 1,
} as const

// ============================================
// API Configuration
// ============================================

export const API_CONFIG = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultOffset: 0,
} as const

// ============================================
// Routes
// ============================================

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  VIBE_LOCAL: '/dashboard/vibe-local',
  LOCATIONS: '/dashboard/locations',
  LOCATION_DETAIL: '/dashboard/locations/:id',
  PEOPLE: '/dashboard/people',
  MESSAGES: '/dashboard/messages',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  NOT_FOUND: '/404',
} as const

// ============================================
// Storage Buckets
// ============================================

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  LOCATIONS: 'locations',
  PUBLIC: 'public',
} as const

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  UNAUTHORIZED: 'Você precisa estar logado para acessar esta página.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'Recurso não encontrado.',
  VALIDATION_ERROR: 'Dados inválidos. Verifique os campos.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
  UNKNOWN_ERROR: 'Erro desconhecido. Tente novamente.',
} as const

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
  REGISTER_SUCCESS: 'Conta criada com sucesso!',
  LOGIN_SUCCESS: 'Login realizado com sucesso!',
  LOGOUT_SUCCESS: 'Logout realizado com sucesso!',
  PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
  PREFERENCES_SAVED: 'Preferências salvas com sucesso!',
  MATCH_CREATED: 'Match criado com sucesso!',
  MESSAGE_SENT: 'Mensagem enviada com sucesso!',
} as const

// ============================================
// Local Storage Keys
// ============================================

export const STORAGE_KEYS = {
  THEME: 'luvbee-theme',
  ONBOARDING_COMPLETED: 'luvbee-onboarding-completed',
  LAST_LOCATION: 'luvbee-last-location',
} as const

// ============================================
// Google Places API
// ============================================

export const GOOGLE_PLACES_CONFIG = {
  // Tipos de estabelecimentos para buscar no Brasil
  // night_club (baladas), restaurant (restaurantes), bar (botecos), establishment (casas de show)
  types: ['night_club', 'restaurant', 'bar', 'establishment'],
  fields: [
    'name',
    'formatted_address',
    'geometry',
    'photos',
    'rating',
    'price_level',
    'opening_hours',
    'phone_number',
    'website',
    'place_id',
    'types',
  ],
  radius: 5000, // 5km default radius
} as const

