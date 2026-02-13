# Configuração de Cache de Imagens e API Keys

Este documento explica as alterações feitas para implementar o cache de imagens e configurar as API keys do Google Maps por plataforma.

## 📁 Arquivos Alterados/Criados

### 1. Cache de Imagens
- **`mobile/src/services/imageCache.ts`** - Novo serviço de cache
- **`supabase/migrations/20250203_create_cached_images.sql`** - Migration do banco
- **`mobile/src/hooks/usePlaceImage.ts`** - Hook React para usar o cache

### 2. Configuração de API Keys por Plataforma
- **`mobile/src/services/googlePlaces.ts`** - Atualizado com seleção de chave por plataforma
- **`mobile/src/services/supabase.ts`** - Atualizado com helper de API key
- **`mobile/app.json`** - Atualizado para usar variáveis de ambiente específicas

## 🔧 Configuração do Supabase

### 1. Execute a Migration

No Dashboard do Supabase:
1. Vá em **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/20250203_create_cached_images.sql`
3. Execute

Ou via CLI:
```bash
supabase db push
```

### 2. Verifique o Bucket Existente

O bucket `places` já existe no seu projeto com imagens.

**Verifique no Dashboard:**
1. Vá em **Storage > Buckets**
2. Clique no bucket **`places`**
3. Verifique se está **Public**: ✅ Habilitado

### 3. Configure as Políticas do Storage (se necessário)

No bucket `places`, verifique se existem estas políticas:

**SELECT (anon, authenticated):**
```sql
bucket_id = 'places'
```

**INSERT (authenticated):**
```sql
bucket_id = 'places'
```

**DELETE (authenticated):**
```sql
bucket_id = 'places'
```

**Se não existirem, adicione-as no Dashboard:**
- Storage → `places` → Policies → New Policy

## 🔑 Configuração das API Keys

### Arquivo `.env` do Mobile

O arquivo `mobile/.env` deve conter:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://zgxtcawgllsnnernlgim.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon

# Google Maps - iOS
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=sua_chave_ios

# Google Maps - Android  
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=sua_chave_android
```

### Google Cloud Console

Configure 2 chaves diferentes:

#### Chave iOS
- **APIs ativas**: Maps SDK for iOS
- **Restrição**: iOS apps
- **Bundle ID**: `com.luvbee.dating`

#### Chave Android
- **APIs ativas**: Maps SDK for Android
- **Restrição**: Android apps
- **Package name**: `com.luvbee.dating`
- **SHA-1**: Sua impressão digital do certificado

## 🚀 Como Funciona o Cache

### Fluxo de Busca de Imagem

```
1. App solicita imagem do lugar X
   ↓
2. Verifica se existe no Supabase Storage
   ↓
3. Se existe → retorna URL do Storage (GRÁTIS)
   ↓
4. Se não existe → busca do Google via Edge Function
   ↓
5. Salva no Storage + registra no banco
   ↓
6. Retorna URL do Storage
```

### Vantagens

- **Custo**: Apenas paga uma vez para buscar a imagem
- **Performance**: URLs do Supabase são mais rápidas que a API do Google
- **Confiabilidade**: Não depende da API do Google estar disponível
- **Cache**: 30 dias de vida útil (configurável)

## 💻 Uso no Código

### Opção 1: Hook React (Recomendado)

```tsx
import { usePlaceImage } from '@/hooks';

function PlaceCard({ place }) {
  const { imageUrl, isLoading } = usePlaceImage(
    place.id,
    place.photos?.[0]?.photo_reference,
    { fallbackCategory: place.category }
  );

  return (
    <Image 
      source={{ uri: imageUrl }}
      style={styles.image}
    />
  );
}
```

### Opção 2: Função Direta

```tsx
import { fetchPlaceImage } from '@/services';

async function loadImage() {
  const url = await fetchPlaceImage(
    placeId,
    photoReference,
    'restaurant'
  );
  setImageUrl(url);
}
```

### Opção 3: Pré-carregamento em Lista

```tsx
import { usePreloadPlaceImages } from '@/hooks';

function PlaceList() {
  const { preloadImages, progress } = usePreloadPlaceImages();

  useEffect(() => {
    if (places.length > 0) {
      preloadImages(places); // Background, não bloqueia UI
    }
  }, [places]);

  return (
    <View>
      {progress > 0 && progress < 100 && (
        <Text>Cacheando imagens: {progress}%</Text>
      )}
      {/* ... lista de lugares */}
    </View>
  );
}
```

## 🔍 Debug

Em desenvolvimento (`__DEV__`), o console mostra:

```
🔷 Platform: IOS
🔗 URL: https://zgxtcawgllsnnernlgim.supabase.co
🔑 Key Status: Present ✅
🗺️  Google Maps API Key: Configurada ✅

📡 Fetching places via Supabase Edge Function (search-nearby)...
✅ Recebidos 20 lugares da Edge Function.
📸 15 lugares têm fotos para cachear
✅ Imagem do cache: place_123
🌐 Buscando imagem do Google: place_456
✅ Imagem salva no cache: place_456
```

## 🧹 Manutenção

### Limpar Cache Expirado

```sql
-- Remove imagens com mais de 30 dias
SELECT clean_expired_image_cache();
```

### Limpar Todo o Cache

```typescript
import { clearImageCache } from '@/services';

await clearImageCache();
```

**Nota:** As imagens serão salvas no bucket `places` com prefixo de hash no nome do arquivo.

## ⚠️ Troubleshooting

### Imagens não aparecem

1. Verifique se o bucket `places` está como **Public**
2. Verifique as políticas RLS do Storage (SELECT para anon, INSERT para authenticated)
3. Verifique se a Edge Function `get-place-photo` está deployada

### Erro "Bucket não disponível"

Verifique no Dashboard se:
- O bucket `places` existe
- Está configurado como **Public: true**
- As políticas permitem SELECT para `anon` e `authenticated`

### API Key não encontrada

Verifique se:
- As variáveis no `.env` estão com os nomes corretos
- O app foi reiniciado após alterar o `.env`
- No iOS: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS`
- No Android: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID`

## 📊 Custo

### Antes (sem cache)
- 1000 usuários/dia × 20 lugares × $7/1000 = **$140/dia**

### Depois (com cache)
- Primeira vez: $140
- Dias seguintes: **$0** (imagens no Storage)
- Storage: ~$0.023/GB/mês

**Economia**: ~99% após o primeiro dia!
