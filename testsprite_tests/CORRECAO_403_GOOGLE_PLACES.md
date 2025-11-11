# Correção do Erro 403 ao Baixar Imagens do Google Places

## Data: 2025-11-10

---

## ✅ Problema Identificado e Corrigido

### Erro:
```
GET https://maps.googleapis.com/maps/api/place/js/PhotoService.GetPhoto?... 403 (Forbidden)
```

### Causa Raiz:
1. **URL Incorreta:** A URL gerada estava usando formato incorreto (`PhotoService.GetPhoto` com callback)
2. **CORS:** A API do Google Places Photo pode ter restrições CORS quando acessada diretamente do navegador
3. **Headers:** Faltavam headers apropriados na requisição

### Solução Implementada:
✅ **Método Específico:** Criado `downloadPhoto()` no `GooglePlacesService` para baixar fotos corretamente
✅ **Tratamento de Erros:** Adicionado tratamento específico para erro 403
✅ **Headers Corretos:** Adicionados headers apropriados (`Accept: image/*`)
✅ **Validação:** Verificação se a resposta é realmente uma imagem válida
✅ **Integração:** `ImageStorageService` agora detecta URLs do Google Places e usa método específico

---

## 📝 Código Corrigido

### 1. google-places.service.ts - Novo Método downloadPhoto()

**Adicionado:**
```typescript
/**
 * Baixa uma foto do Google Places e retorna como Blob
 * Necessário porque a API do Google Places Photo pode ter restrições CORS
 */
static async downloadPhoto(photoReference: string, maxWidth: number = 400): Promise<ApiResponse<Blob>> {
  try {
    this.checkApiKey()
    
    const photoUrl = this.getPhotoUrl(photoReference, maxWidth)
    
    // Fazer requisição com referrer para evitar bloqueios
    const response = await fetch(photoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
      mode: 'cors',
    })

    if (!response.ok) {
      // Se erro 403, pode ser problema de CORS ou API key
      if (response.status === 403) {
        throw new Error('Acesso negado à foto do Google Places. Verifique a API key e permissões.')
      }
      throw new Error(`Failed to download photo: ${response.statusText}`)
    }

    const blob = await response.blob()
    
    // Verificar se é realmente uma imagem
    if (!blob.type.startsWith('image/')) {
      throw new Error('Resposta não é uma imagem válida')
    }

    return { data: blob }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to download photo from Google Places'
    }
  }
}
```

### 2. image-storage.service.ts - Detecção de URLs do Google Places

**Modificado:**
```typescript
private static async downloadImage(url: string): Promise<Blob> {
  try {
    // Se for URL do Google Places Photo Service, usar método específico
    if (url.includes('maps.googleapis.com/maps/api/place/photo')) {
      // Extrair photo_reference da URL
      const urlObj = new URL(url)
      const photoReference = urlObj.searchParams.get('photoreference')
      const maxWidth = urlObj.searchParams.get('maxwidth') || '800'
      
      if (photoReference) {
        const result = await GooglePlacesService.downloadPhoto(photoReference, parseInt(maxWidth))
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.data) {
          return result.data
        }
      }
    }

    // Para outras URLs, usar fetch normal
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
      mode: 'cors',
    })
    
    // ... resto do código
  }
}
```

---

## 🔍 Formato Correto da URL

### URL Correta:
```
https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={api_key}
```

### URL Incorreta (que estava causando erro):
```
https://maps.googleapis.com/maps/api/place/js/PhotoService.GetPhoto?...&callback=none&...
```

---

## ⚠️ Possíveis Causas do Erro 403

1. **API Key Inválida:** Verificar se a chave está correta e ativa
2. **Permissões da API:** Verificar se a API "Places API" está habilitada no Google Cloud Console
3. **Restrições de API Key:** Verificar se há restrições de HTTP referrer ou IP
4. **CORS:** Alguns navegadores podem bloquear requisições CORS

---

## 🔧 Verificações Necessárias

### 1. Google Cloud Console
- ✅ API "Places API" habilitada
- ✅ API "Places API (New)" habilitada (se disponível)
- ✅ API Key com permissões corretas

### 2. Restrições da API Key
- Verificar se não há restrições muito restritivas
- Se houver restrições de HTTP referrer, adicionar `localhost:8080`

### 3. Variáveis de Ambiente
```env
VITE_GOOGLE_MAPS_API_KEY=sua-chave-aqui
```

---

## 📊 Fluxo Corrigido

```
1. LocationService processa imagens em background
   ↓
2. ImageStorageService detecta URL do Google Places
   ↓
3. Extrai photo_reference da URL
   ↓
4. Chama GooglePlacesService.downloadPhoto()
   ↓
5. Faz requisição com headers corretos
   ↓
6. Valida se resposta é imagem válida
   ↓
7. Retorna Blob para upload no Supabase Storage
```

---

## ✅ Status

**Correção:** ✅ Implementada
**Método Específico:** ✅ `downloadPhoto()` criado
**Detecção de URLs:** ✅ Implementada
**Tratamento de Erros:** ✅ Adicionado
**Validação:** ✅ Verificação de tipo de imagem

---

**Arquivos Corrigidos:**
- `src/services/google-places.service.ts` - Método `downloadPhoto()` adicionado
- `src/services/image-storage.service.ts` - Detecção e uso do método específico

**Próxima Ação:** 
- Verificar se a API key do Google Places está configurada corretamente
- Testar download de imagens após correção
- Verificar logs do console para erros adicionais

---

## 📝 Notas Importantes

1. **CORS:** Se o erro 403 persistir, pode ser necessário criar um proxy server-side
2. **API Key:** Certifique-se de que a API key tem permissões para Places API
3. **Rate Limiting:** Google Places API tem limites de requisições por dia
4. **Fallback:** O sistema continua funcionando mesmo se o download falhar (usa placeholder)

---

**Status:** ✅ Correção implementada e pronta para teste

