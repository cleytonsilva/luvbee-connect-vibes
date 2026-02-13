# Deploy das Alterações

## 🚀 Passo a Passo

### 1. Deploy da Edge Function Atualizada

```bash
cd C:\Users\LENOVO\Documents\Luvbee-Mobile

# Deploy apenas da função get-place-photo
supabase functions deploy get-place-photo
```

### 2. Configurar Secrets no Supabase (se ainda não tiver)

```bash
# Chave do Google Maps (backend)
supabase secrets set GOOGLE_MAPS_BACKEND_KEY=sua_chave_backend

# Ou se preferir usar o mesmo nome
supabase secrets set GOOGLE_MAPS_API_KEY=sua_chave_backend
```

### 3. Executar Migration do Banco

```bash
# Aplicar migration
supabase db push
```

Ou via Dashboard:
1. Acesse https://supabase.com/dashboard/project/zgxtcawgllsnnernlgim
2. SQL Editor → New Query
3. Cole o conteúdo de `supabase/migrations/20250203_create_cached_images.sql`
4. Run

### 4. Verificar Bucket Existente

O bucket `places` já existe com imagens. **Apenas verifique:**

1. Acesse: https://supabase.com/dashboard/project/zgxtcawgllsnnernlgim/storage
2. Clique no bucket **`places`**
3. Verifique se está **Public: ✅**

### 5. Verificar Políticas do Storage

No bucket `places`, verifique se existem estas políticas:

**SELECT:**
- Allowed operation: SELECT
- Target roles: anon, authenticated
- Policy definition: `bucket_id = 'places'`

**INSERT:**
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition: `bucket_id = 'places'`

**DELETE:**
- Allowed operation: DELETE
- Target roles: authenticated
- Policy definition: `bucket_id = 'places'`

### 6. Configurar Variáveis de Ambiente do Mobile

No arquivo `mobile/.env`:

```env
# Supabase (já deve ter)
EXPO_PUBLIC_SUPABASE_URL=https://zgxtcawgllsnnernlgim.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps iOS
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=AIzaSyDgoGLWa0FRv8Jquni6zepPczCeqqpgPeU

# Google Maps Android
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=AIzaSyB3IKZwvn-mEg6957LaqVRjJb8UeNPNK6A
```

### 7. Limpar Cache do Expo (importante!)

```bash
cd mobile

# Limpar cache
npx expo start --clear

# Ou
rm -rf node_modules/.cache
npx expo start
```

### 8. Testar

Verifique no console:
```
🔷 Platform: IOS (ou ANDROID)
🗺️  Google Maps API Key: Configurada ✅
```

## ✅ Checklist

- [ ] Edge Function `get-place-photo` deployada
- [ ] Secret `GOOGLE_MAPS_BACKEND_KEY` configurada
- [ ] Migration `cached_images` aplicada
- [ ] Bucket `places` verificado (já existe)
- [ ] Políticas do Storage configuradas (se necessário)
- [ ] `.env` atualizado com as duas chaves
- [ ] App testado em iOS
- [ ] App testado em Android

## 🔧 Comandos Úteis

```bash
# Ver logs da Edge Function
supabase functions logs get-place-photo

# Redeploy
supabase functions deploy get-place-photo --no-verify

# Ver status do banco
supabase db status
```
