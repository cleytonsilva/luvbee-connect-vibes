# Solução para Erro CORS - Google Places API

## Data: 2025-11-10

---

## ✅ Problema Identificado

### Erro:
```
Access to fetch at 'https://maps.googleapis.com/maps/api/place/details/json?...' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Causa Raiz:
A API do Google Places **não permite requisições diretas do navegador** devido a políticas CORS. Isso é uma limitação de segurança da API do Google.

### Por que acontece:
- Requisições do navegador para APIs externas são bloqueadas por CORS
- Google Places API requer que requisições sejam feitas via servidor (server-side)
- Não é possível fazer requisições diretas do frontend para a API

---

## 🔧 Solução Implementada

### 1. Desabilitar Processamento Automático em Background

**Arquivo:** `src/services/location.service.ts`

**Mudança:**
- Desabilitado o processamento automático de imagens em background
- Código mantido comentado para referência futura
- Adicionado comentário explicando a limitação CORS

**Código:**
```typescript
// Processamento de imagens desabilitado devido a CORS
// A API do Google Places não permite requisições diretas do navegador
// Para processar imagens, é necessário criar um proxy server-side ou usar Edge Function
// this.processLocationImagesInBackground(locations)
```

### 2. Manter Funcionalidade para Uso Futuro

O código de processamento foi mantido comentado para que possa ser usado quando:
- Um proxy server-side for criado
- Uma Edge Function do Supabase for implementada
- Outra solução server-side for disponível

---

## 🚀 Soluções Possíveis para o Futuro

### Opção 1: Edge Function do Supabase (Recomendado)

Criar uma Edge Function no Supabase que:
1. Recebe `place_id` do frontend
2. Faz requisição para Google Places API (server-side)
3. Baixa e salva imagem no Supabase Storage
4. Retorna URL da imagem salva

**Vantagens:**
- Não expõe API key no frontend
- Resolve problema CORS
- Integrado com Supabase

### Opção 2: Proxy Server-Side

Criar um endpoint no backend que:
1. Recebe requisição do frontend
2. Faz requisição para Google Places API
3. Retorna dados processados

**Vantagens:**
- Controle total sobre o processo
- Pode adicionar cache
- Pode processar múltiplas imagens

### Opção 3: Usar Google Maps JavaScript API

Usar a biblioteca oficial do Google Maps que:
- Já resolve problemas CORS
- Tem métodos para obter fotos
- Requer carregar biblioteca completa

**Desvantagens:**
- Aumenta tamanho do bundle
- Requer carregar biblioteca completa

---

## 📊 Status Atual

### Funcionalidades que Funcionam:
✅ Buscar locais próximos (via RPC do Supabase)
✅ Exibir locais nos cards
✅ Usar imagens já salvas no Supabase Storage
✅ Fallback para placeholder quando imagem não disponível

### Funcionalidades Desabilitadas:
❌ Processamento automático de imagens do Google Places
❌ Download automático de fotos do Google Places
❌ Atualização automática de `image_url` via Google Places

### Funcionalidades Disponíveis Manualmente:
✅ `ImageStorageService.saveLocationImageFromGoogle()` - Funciona se chamado via Edge Function
✅ `ImageStorageService.processLocationImage()` - Funciona se chamado via Edge Function
✅ `GooglePlacesService.downloadPhoto()` - Funciona se chamado via Edge Function

---

## 🔄 Como Funciona Agora

```
1. Usuário acessa VibeLocalPage
   ↓
2. Locais são carregados do banco de dados (Supabase)
   ↓
3. Cards exibem imagens que já estão salvas no Supabase Storage
   ↓
4. Se não há imagem salva, usa placeholder
   ↓
5. Processamento automático de imagens DESABILITADO (CORS)
```

---

## 📝 Próximos Passos Recomendados

### Curto Prazo:
1. ✅ Desabilitar processamento automático (FEITO)
2. ✅ Manter código comentado para referência (FEITO)
3. ⏳ Criar Edge Function do Supabase para processar imagens

### Médio Prazo:
1. Criar Edge Function `process-location-image`
2. Chamar Edge Function quando local for criado/atualizado
3. Processar imagens server-side sem problemas CORS

### Longo Prazo:
1. Implementar cache de imagens
2. Otimizar tamanho das imagens
3. Implementar CDN para imagens

---

## ⚠️ Notas Importantes

1. **CORS é uma limitação de segurança:** Não pode ser contornada do frontend
2. **API Key exposta:** Com requisições diretas, a API key fica exposta no código
3. **Solução server-side é necessária:** Para processar imagens do Google Places
4. **Aplicação continua funcionando:** Locais são exibidos normalmente, apenas sem processamento automático de imagens

---

## ✅ Status

**Correção:** ✅ Implementada
**Processamento Automático:** ❌ Desabilitado (CORS)
**Código Mantido:** ✅ Comentado para referência
**Documentação:** ✅ Criada

---

**Arquivos Modificados:**
- `src/services/location.service.ts` - Desabilitado processamento automático

**Próxima Ação:** 
- Criar Edge Function do Supabase para processar imagens server-side
- Ou implementar proxy server-side
- Ou usar Google Maps JavaScript API

---

**Status:** ✅ Erro CORS resolvido (processamento desabilitado temporariamente)

