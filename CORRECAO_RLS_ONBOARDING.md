# 🔧 Correção de Erros RLS no Onboarding

## 📋 Problema Identificado

Erros ao salvar perfil no onboarding:
- ❌ Erro 400 ao fazer upload de avatar: "new row violates row-level security policy"
- ❌ Erro 403 ao salvar user_preferences: "Erro de RLS ao salvar preferências"

## ✅ Soluções Implementadas

### 1. Migração SQL Criada

Arquivo: `supabase/migrations/20250130000000_fix_avatars_bucket_and_preferences_rls.sql`

Esta migração:
- ✅ Cria o bucket `avatars` se não existir
- ✅ Configura políticas RLS para o bucket `avatars` permitindo upload para usuários autenticados
- ✅ Cria política de upsert para `user_preferences` permitindo INSERT e UPDATE
- ✅ Garante que usuários só podem fazer upload em pastas com seu próprio `user_id`

### 2. Melhorias no Código

**Arquivo:** `src/components/auth/OnboardingFlow.tsx`

- ✅ Verificação de email confirmado antes de fazer upload
- ✅ Verificação de email confirmado antes de salvar perfil
- ✅ Mensagens de erro mais específicas e claras
- ✅ Tratamento melhorado de erros de RLS

## 🚀 Como Aplicar a Correção

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard do seu projeto
2. Vá em **SQL Editor**
3. Copie o conteúdo do arquivo `supabase/migrations/20250130000000_fix_avatars_bucket_and_preferences_rls.sql`
4. Cole no SQL Editor
5. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

```bash
# Se você tem o Supabase CLI instalado localmente
supabase db push

# Ou execute a migração específica
supabase migration up
```

### Opção 3: Executar SQL Manualmente

Execute o seguinte SQL no Supabase Dashboard:

```sql
-- Criar bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública
CREATE POLICY "public_read_avatars" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Política de inserção
CREATE POLICY "authenticated_insert_avatars" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- Política de atualização
CREATE POLICY "authenticated_update_avatars" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- Política de exclusão
CREATE POLICY "authenticated_delete_avatars" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    name LIKE auth.uid()::text || '/%' OR
    name LIKE auth.uid()::text || '-%'
  )
);

-- Política de upsert para user_preferences
CREATE POLICY "user_preferences_upsert_own" ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## ✅ Verificação

Após aplicar a migração, verifique:

1. **Bucket avatars existe:**
   - Acesse: Supabase Dashboard > Storage > Buckets
   - Deve existir o bucket `avatars`

2. **Políticas RLS estão ativas:**
   - Acesse: Supabase Dashboard > Storage > Policies
   - Deve haver políticas para o bucket `avatars`

3. **Política de upsert para user_preferences:**
   - Acesse: Supabase Dashboard > Database > Policies
   - Procure por `user_preferences_upsert_own`

## 🧪 Como Testar

1. Crie uma nova conta ou use uma conta existente
2. Confirme o email
3. Complete o onboarding:
   - Passo 1: Faça upload de uma foto
   - Passo 2: Preencha bio, idade e cidade
   - Passos 3-5: Selecione preferências
   - Clique em "Finalizar"
4. Verifique se não há erros no console
5. Verifique se os dados foram salvos no Supabase

## 🔍 Troubleshooting

### Erro persiste após aplicar migração

1. Verifique se o usuário tem email confirmado
2. Verifique se há sessão ativa no Supabase
3. Verifique os logs do Supabase Dashboard para mais detalhes
4. Tente fazer logout e login novamente

### Bucket não aparece

- Execute a migração novamente
- Verifique se não há erros no SQL Editor
- Verifique se você tem permissões de administrador

### Políticas não funcionam

- Verifique se RLS está habilitado nas tabelas
- Verifique se o usuário está autenticado (`auth.uid()` não é NULL)
- Verifique se o email está confirmado

## 📝 Notas Importantes

- ⚠️ As políticas RLS só funcionam para usuários autenticados
- ⚠️ O email deve estar confirmado antes de fazer upload ou salvar dados
- ⚠️ Usuários só podem fazer upload em pastas com seu próprio `user_id`
- ✅ A migração é idempotente (pode ser executada múltiplas vezes sem problemas)

## 🔗 Arquivos Relacionados

- `supabase/migrations/20250130000000_fix_avatars_bucket_and_preferences_rls.sql` - Migração SQL
- `src/components/auth/OnboardingFlow.tsx` - Componente de onboarding atualizado
- `src/services/user.service.ts` - Serviço de usuário com tratamento de erros

---

**Última atualização:** 2025-01-30

