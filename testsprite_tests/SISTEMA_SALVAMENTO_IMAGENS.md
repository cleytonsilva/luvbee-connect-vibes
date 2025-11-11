# Sistema de Salvamento de Imagens dos Locais

## Data: 2025-11-10

---

## ✅ Funcionalidade Implementada

### Objetivo:
Criar uma lógica de salvamento único de imagem para cada local usando a API do Google Places e armazenamento no Supabase Storage.

### Funcionalidades:
✅ **Download de Imagens:** Baixa imagens do Google Places API
✅ **Armazenamento Único:** Salva uma imagem por local no Supabase Storage
✅ **Processamento Automático:** Processa imagens em background quando locais são carregados
✅ **Priorização:** Prioriza imagens salvas no Supabase Storage nos cards
✅ **Fallback Inteligente:** Usa placeholder quando imagem não está disponível

---

## 📝 Arquivos Criados/Modificados

### 1. `src/services/image-storage.service.ts` (NOVO)

Serviço completo para gerenciar download e salvamento de imagens:

**Funcionalidades:**
- `downloadImage()` - Baixa imagem de uma URL
- `saveLocationImageFromGoogle()` - Baixa e salva imagem do Google Places
- `getLocationImageUrl()` - Verifica se local já tem imagem salva
- `processLocationImage()` - Processa imagem para um local
- `deleteLocationImage()` - Remove imagem do storage (limpeza)

**Características:**
- Verifica se imagem já existe antes de baixar (evita duplicação)
- Gera nomes únicos baseados no `locationId`
- Organiza arquivos por pasta (`locationId/nome-arquivo.jpg`)
- Atualiza campo `image_url` na tabela `locations`
- Tratamento de erros robusto

### 2. `src/services/location.service.ts` (MODIFICADO)

**Adicionado:**
- Import do `ImageStorageService`
- Método `processLocationImagesInBackground()` - Processa imagens em background
- Integração no `getNearbyLocations()` para processar imagens automaticamente

**Comportamento:**
- Processa apenas os primeiros 10 locais para não sobrecarregar
- Não bloqueia a resposta da API
- Processa apenas locais que não têm imagem salva
- Ignora erros no processamento em background

### 3. `src/components/location/LocationCard.tsx` (MODIFICADO)

**Melhorias:**
- Prioriza imagens salvas no Supabase Storage
- Verifica se `image_url` é do Supabase Storage antes de usar
- Mantém fallback para outros campos e placeholder

---

## 🔄 Fluxo de Funcionamento

### 1. Carregamento de Locais
```
Usuário acessa VibeLocalPage
  ↓
useLocations busca locais próximos
  ↓
LocationService.getNearbyLocations()
  ↓
Retorna locais + processa imagens em background
```

### 2. Processamento de Imagens (Background)
```
Para cada local sem imagem salva:
  ↓
Verifica se tem place_id do Google
  ↓
Busca photo_reference do Google Places
  ↓
Baixa imagem do Google Places API
  ↓
Salva no Supabase Storage (bucket 'locations')
  ↓
Atualiza campo image_url na tabela locations
```

### 3. Exibição no Card
```
LocationCard recebe location
  ↓
Verifica se image_url é do Supabase Storage
  ↓
Prioriza imagem salva
  ↓
Fallback para photo_url, images[0] ou placeholder
```

---

## 📦 Estrutura de Armazenamento

### Supabase Storage Bucket: `locations`

**Estrutura de pastas:**
```
locations/
  ├── {location-id-1}/
  │   └── {hash}-{timestamp}.jpg
  ├── {location-id-2}/
  │   └── {hash}-{timestamp}.jpg
  └── ...
```

**Características:**
- Uma imagem por local (única)
- Nome único baseado em hash do `locationId` + timestamp
- Formato: JPEG
- Tamanho máximo: 800x600px (otimizado)

---

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente

Certifique-se de ter configurado:
```env
VITE_GOOGLE_MAPS_API_KEY=sua-chave-aqui
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 2. Bucket de Storage

O bucket `locations` deve estar criado no Supabase:
- **Nome:** `locations`
- **Público:** Sim
- **Tamanho máximo:** 10MB
- **Tipos permitidos:** `image/jpeg`, `image/png`, `image/webp`

### 3. Permissões RLS

O bucket deve ter políticas RLS que permitam:
- Leitura pública (para exibir imagens)
- Escrita autenticada (para salvar imagens)

---

## 🎯 Benefícios

1. **Performance:** Imagens salvas localmente carregam mais rápido
2. **Custo:** Reduz chamadas à API do Google Places
3. **Confiabilidade:** Não depende de URLs externas do Google
4. **Consistência:** Uma imagem por local, sempre atualizada
5. **Escalabilidade:** Processamento em background não bloqueia UI

---

## 📊 Métodos Principais

### ImageStorageService

```typescript
// Verificar se local tem imagem salva
const imageUrl = await ImageStorageService.getLocationImageUrl(locationId)

// Salvar imagem do Google Places
const result = await ImageStorageService.saveLocationImageFromGoogle(
  locationId,
  photoReference
)

// Processar imagem automaticamente
const result = await ImageStorageService.processLocationImage(
  locationId,
  googlePlaceId,
  photoReference
)
```

---

## ⚠️ Considerações Importantes

1. **Rate Limiting:** O processamento em background limita a 10 locais por vez
2. **Erros Silenciosos:** Erros no processamento em background são ignorados para não bloquear UI
3. **Cache:** Imagens têm cache de 1 hora (`cacheControl: '3600'`)
4. **Formato:** Todas as imagens são salvas como JPEG para consistência

---

## 🚀 Próximos Passos

1. ✅ Criar bucket `locations` no Supabase (se não existir)
2. ✅ Testar download e salvamento de imagens
3. ✅ Verificar se imagens estão sendo exibidas corretamente
4. ⏳ Implementar retry logic para falhas de download
5. ⏳ Adicionar compressão de imagens antes do upload
6. ⏳ Implementar limpeza de imagens antigas

---

## 📝 Notas Técnicas

- **Google Places API:** Usa endpoint `/place/photo` para baixar imagens
- **Supabase Storage:** Usa bucket público `locations` para armazenar
- **Background Processing:** Não bloqueia a resposta da API principal
- **Unique Storage:** Uma imagem por local, baseada no `locationId`

---

**Status:** ✅ Implementado e pronto para uso

**Arquivos:**
- `src/services/image-storage.service.ts` - Serviço de imagens
- `src/services/location.service.ts` - Integração com processamento
- `src/components/location/LocationCard.tsx` - Priorização de imagens salvas

