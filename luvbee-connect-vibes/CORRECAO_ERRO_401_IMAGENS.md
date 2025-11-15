# 🔧 Correção: Erro 401 ao Carregar Imagens da Edge Function

## ❌ Problema Identificado

**Erro:** `{"code":401,"message":"Missing authorization header"}`

**Ocorrência:** Ao tentar carregar imagens da Edge Function `get-place-photo` via tags `<img>`.

**Causa:** Tags `<img>` não podem enviar headers de autenticação, mas o Supabase estava exigindo autenticação para acessar a Edge Function.

---

## ✅ Solução Implementada

### 1. Edge Function Atualizada (`get-place-photo/index.ts`)

A função agora aceita autenticação de três formas:

1. **Header `apikey`:** `apikey: YOUR_ANON_KEY`
2. **Header `Authorization`:** `Authorization: Bearer YOUR_ANON_KEY`
3. **Query Parameter `apikey`:** `?apikey=YOUR_ANON_KEY` (para uso em tags `<img>`)

**Validação adicionada:**
- Verifica se há alguma forma de autenticação antes de processar a requisição
- Retorna erro 401 claro se não houver autenticação
- Logs detalhados para debug

### 2. Funções Helper Criadas (`edge-function-image-loader.ts`)

Criado arquivo com funções helper:

- **`loadEdgeFunctionImage()`:** Carrega imagem com autenticação e retorna blob URL
- **`getEdgeFunctionImageUrl()`:** Gera URL com `apikey` como query parameter
- **`clearImageBlobCache()`:** Limpa cache de blob URLs

### 3. Arquivos Atualizados

Todos os lugares que geram URLs da Edge Function foram atualizados para incluir `apikey`:

- ✅ `src/lib/image-url-utils.ts` - Função `normalizeImageUrl()`
- ✅ `src/services/google-places-photo.service.ts` - Método `getPlacePhotoUrl()`
- ✅ `src/hooks/useLocations.ts` - Conversão de Google Places para Location
- ✅ `src/services/location-image-scraper.service.ts` - Scraping de imagens

---

## 📋 Como Funciona Agora

### Para Tags `<img>` (URLs Diretas)

Quando uma URL é gerada para uso em tag `<img>`, ela agora inclui o `apikey` como query parameter:

```typescript
// Antes (causava erro 401):
`${supabaseUrl}/functions/v1/get-place-photo?photoreference=...&maxwidth=400`

// Depois (funciona):
`${supabaseUrl}/functions/v1/get-place-photo?photoreference=...&maxwidth=400&apikey=YOUR_ANON_KEY`
```

### Para Fetch com Headers

Quando fazendo fetch programático, você pode usar headers:

```typescript
fetch(url, {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
```

### Para Blob URLs (Alternativa)

Se preferir não expor o `apikey` na URL, use a função helper:

```typescript
import { loadEdgeFunctionImage } from '@/lib/edge-function-image-loader'

const blobUrl = await loadEdgeFunctionImage(
  '/functions/v1/get-place-photo?photoreference=...&maxwidth=400'
)
// blobUrl pode ser usado em tags <img>
```

---

## 🔒 Segurança

### Por que `apikey` na URL é aceitável?

- A chave `VITE_SUPABASE_ANON_KEY` é **pública por design**
- Ela já está exposta no código JavaScript do frontend
- O Supabase usa RLS (Row Level Security) para proteger dados
- A chave anon tem permissões limitadas (não pode fazer operações privilegiadas)

### Alternativa Mais Segura

Se preferir não expor o `apikey` na URL, use `loadEdgeFunctionImage()` que:
- Faz fetch com headers
- Retorna blob URL
- Não expõe a chave na URL

---

## 🧪 Como Testar

1. **Recarregue a aplicação**
2. **Abra o DevTools** > Network
3. **Procure por requisições** para `get-place-photo`
4. **Verifique:**
   - ✅ Status deve ser 200 (não mais 401)
   - ✅ URL deve incluir `apikey=` como query parameter
   - ✅ Imagens devem carregar corretamente

---

## 📝 Arquivos Modificados

- ✅ `supabase/functions/get-place-photo/index.ts` - Validação de autenticação
- ✅ `src/lib/edge-function-image-loader.ts` - **NOVO** - Funções helper
- ✅ `src/lib/image-url-utils.ts` - Inclui `apikey` nas URLs
- ✅ `src/services/google-places-photo.service.ts` - Inclui `apikey` nas URLs
- ✅ `src/hooks/useLocations.ts` - Inclui `apikey` nas URLs
- ✅ `src/services/location-image-scraper.service.ts` - Inclui `apikey` nas URLs

---

## 🆘 Se Ainda Houver Erro 401

1. **Verifique se `VITE_SUPABASE_ANON_KEY` está configurada:**
   - Arquivo `.env` ou `.env.local`
   - Deve começar com `eyJ...`

2. **Verifique se a URL inclui `apikey`:**
   - Abra o DevTools > Network
   - Clique na requisição que falhou
   - Verifique se a URL tem `&apikey=...` ou `?apikey=...`

3. **Verifique os logs da Edge Function:**
   - Supabase Dashboard > Functions > get-place-photo > Logs
   - Procure por mensagens de erro

4. **Faça deploy da Edge Function atualizada:**
   - Use o MCP para fazer deploy novamente
   - Ou: `supabase functions deploy get-place-photo`

---

## ✅ Próximos Passos

1. ⏳ **Fazer deploy da Edge Function atualizada**
2. ⏳ **Testar carregamento de imagens**
3. ⏳ **Verificar se não há mais erros 401**

---

**Última atualização:** Correção implementada. Faça deploy da Edge Function e teste! ✅

