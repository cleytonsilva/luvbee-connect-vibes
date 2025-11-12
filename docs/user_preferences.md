# User Preferences

Descrição das preferências do usuário e fluxo de persistência no Supabase.

## Descrição
- Persiste preferências selecionadas no onboarding: `drink_preferences`, `food_preferences`, `music_preferences` e `vibe_preferences`.
- Atualiza `users.onboarding_completed = true` após sucesso.

## Dependências
- Supabase (Database, Auth)
- Tabelas: `public.users`, `public.user_preferences`
- RLS ativo em todas as tabelas

## Schema Atual
Tabela `public.user_preferences`:
- `id` (`uuid`, PK)
- `user_id` (`uuid`, único, FK → `auth.users.id`)
- `drink_preferences` (`TEXT[]`, `NOT NULL`, default `{}`)
- `food_preferences` (`TEXT[]`, `NOT NULL`, default `{}`)
- `music_preferences` (`TEXT[]`, `NOT NULL`, default `{}`)
- `vibe_preferences` (`JSONB`, opcional)
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

Índices:
- `GIN` em `drink_preferences`, `food_preferences`, `music_preferences`

## API/Serviço
- `UserService.saveUserPreferences(userId, preferences)` faz `upsert` em `user_preferences` com `onConflict: 'user_id'` e marca onboarding como completo.

Payload esperado:
```
{
  drink_preferences: string[] (1–10),
  food_preferences: string[] (1–10),
  music_preferences: string[] (1–10),
  vibe_preferences?: Record<string, any> | null
}
```

Validação (Zod):
- Esquemas em `src/lib/validations.ts` (`userPreferencesSchema` e `updatePreferencesSchema`).

## Instruções de Uso
1. Obter `user.id` via `useAuth()`.
2. Validar preferências com Zod.
3. Chamar `UserService.saveUserPreferences(user.id, validatedData)`.
4. Redirecionar o usuário após sucesso.

## Troubleshooting
- Erro: `Could not find the 'drink_preferences' column ... schema cache`.
  - Causa: cache do PostgREST desatualizado ou coluna ausente.
  - Fix: migração `supabase/migrations/add_user_preferences_columns.sql` adiciona colunas e aciona reload do cache.
  - Após aplicar: fazer hard refresh no app e reautenticar.
- Erros de RLS (403): verificar sessão e policies de `user_preferences`.
- Erros de validação (Zod): exibir mensagens detalhadas no UI.

## Exemplos
- Frontend: `src/components/auth/OnboardingFlow.tsx` coleta preferências e envia ao serviço.
- Serviço: `src/services/user.service.ts` realiza `upsert` e atualiza `users.onboarding_completed`.

## Registro
- Migração adicionada: `supabase/migrations/add_user_preferences_columns.sql`
- Tipos atualizados: `src/integrations/database.types.ts` inclui `public.Tables.user_preferences`