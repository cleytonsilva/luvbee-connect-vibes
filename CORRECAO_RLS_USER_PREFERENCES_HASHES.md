# 🔧 Correção: Erro RLS na tabela user_preferences_hashes

## ❌ Problema Identificado

**Erro:** `new row violates row-level security policy for table "user_preferences_hashes"`

**Causa:** A tabela `user_preferences_hashes` tem RLS habilitado, mas só possui política para SELECT. Quando o trigger `trg_user_preferences_hash` tenta fazer INSERT ou UPDATE após salvar preferências, o RLS bloqueia a operação.

## ✅ Solução

Foi criada uma migração (`20250130000001_fix_user_preferences_hashes_rls.sql`) que adiciona políticas INSERT e UPDATE para a tabela.

### Como Aplicar

#### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o seguinte SQL:

```sql
-- Fix RLS policies for user_preferences_hashes table
BEGIN;

-- Drop existing policy if it exists (only SELECT)
DROP POLICY IF EXISTS user_preferences_hashes_owner_select ON public.user_preferences_hashes;

-- Create policies for SELECT, INSERT, and UPDATE
-- SELECT: Users can only see their own hashes
CREATE POLICY user_preferences_hashes_owner_select ON public.user_preferences_hashes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Allow inserts when the user_id matches the authenticated user
-- This is needed for the trigger that computes the hash
CREATE POLICY user_preferences_hashes_owner_insert ON public.user_preferences_hashes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow updates when the user_id matches the authenticated user
-- This is needed for the trigger that updates the hash on preference changes
CREATE POLICY user_preferences_hashes_owner_update ON public.user_preferences_hashes 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
```

#### Opção 2: Via CLI do Supabase

```bash
# Se estiver usando Supabase local
supabase db reset

# Ou aplicar apenas esta migração
supabase migration up
```

## 📋 Verificação

Após aplicar a migração, verifique se as políticas foram criadas:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_preferences_hashes';
```

Você deve ver 3 políticas:
- `user_preferences_hashes_owner_select` (SELECT)
- `user_preferences_hashes_owner_insert` (INSERT)
- `user_preferences_hashes_owner_update` (UPDATE)

## 🔍 Problema Adicional: CityAutocomplete

O erro `CityAutocomplete is not defined` é causado por cache do navegador. 

**Solução:**
1. Faça um hard refresh: `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. Ou limpe o cache do navegador
3. Ou reinicie o servidor de desenvolvimento

O código já está correto e usando `LocationSelect` ao invés de `CityAutocomplete`.

