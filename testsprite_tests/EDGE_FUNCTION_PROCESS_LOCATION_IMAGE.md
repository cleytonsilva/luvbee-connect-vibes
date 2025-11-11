# Edge Function: process-location-image - Guia Completo

## Data: 2025-11-10

---

## ✅ Edge Function Criada

### Objetivo:
Criar Edge Function do Supabase para processar imagens server-side, resolvendo problemas CORS e mantendo API key segura.

### Funcionalidades:
✅ **Processamento Server-Side:** Baixa imagens do Google Places API no servidor
✅ **Upload Automático:** Salva imagens no Supabase Storage
✅ **Atualização de Banco:** Atualiza campo `image_url` na tabela `locations`
✅ **Verificação de Duplicatas:** Evita processar imagens já existentes
✅ **Tratamento de Erros:** Erros robustos e mensagens claras
✅ **CORS Resolvido:** Não há problemas de CORS (server-side)

---

## 📝 Arquivos Criados

### 1. `supabase/functions/process-location-image/index.ts`

Edge Function completa para processar imagens:

**Funcionalidades:**
- Recebe `locationId`, `googlePlaceId` e `photoReference`
- Verifica se imagem já existe
- Busca `photo_reference` do Google Places se necessário
- Baixa imagem do Google Places API
- Faz upload para Supabase Storage
- Atualiza campo `image_url` na tabela `locations`
- Retorna URL da imagem salva

**Características:**
- CORS configurado corretamente
- Validação de entrada
- Tratamento de erros robusto
- Logs detalhados

### 2. `supabase/functions/process-location-image/deno.json`

Configuração de imports para Deno:
- `@supabase/functions-js` - Runtime types
- `@supabase/supabase-js` - Cliente Supabase

### 3. `supabase/functions/process-location-image/README.md`

Documentação completa da Edge Function:
- Como fazer deploy
- Variáveis de ambiente
- Exemplos de uso
- Troubleshooting

### 4. `src/services/image-storage.service.ts` (MODIFICADO)

**Mudanças:**
- `processLocationImage()` agora usa Edge Function
- Chama `supabase.functions.invoke('process-location-image')`
- Mantém compatibilidade com código existente

---

## 🔧 Como Fazer Deploy

### Método 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Dashboard:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/functions
   ```

2. **Crie Nova Função:**
   - Clique em **"Create a new function"**
   - Nome: `process-location-image`

3. **Cole o Código:**
   - Copie conteúdo de `supabase/functions/process-location-image/index.ts`
   - Cole no editor

4. **Configure Variáveis de Ambiente:**
   - Vá em **Settings** > **Secrets**
   - Adicione: `GOOGLE_MAPS_API_KEY=AIzaSyBu-Xerf1F_Q-yXaEMGM17hMpuKaNa8jXw`

5. **Deploy:**
   - Clique em **"Deploy"**

### Método 2: Via Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar ao projeto
supabase link --project-ref zgxtcawgllsnnernlgim

# Deploy da função
supabase functions deploy process-location-image

# Configurar variável de ambiente
supabase secrets set GOOGLE_MAPS_API_KEY=AIzaSyBu-Xerf1F_Q-yXaEMGM17hMpuKaNa8jXw
```

---

## 🔄 Fluxo de Funcionamento

### 1. Frontend
```
ImageStorageService.processLocationImage()
  ↓
supabase.functions.invoke('process-location-image')
  ↓
Envia: { locationId, googlePlaceId?, photoReference? }
```

### 2. Edge Function (Server-Side)
```
Recebe request
  ↓
Verifica se imagem já existe no Storage
  ↓
Se não existe:
  - Busca photo_reference (se necessário)
  - Baixa imagem do Google Places API
  - Faz upload para Supabase Storage
  - Atualiza campo image_url
  ↓
Retorna URL da imagem salva
```

### 3. Frontend
```
Recebe resposta
  ↓
Atualiza UI com imagem salva
```

---

## 📊 Request/Response

### Request Body
```typescript
{
  locationId: string        // UUID do local (obrigatório)
  googlePlaceId?: string    // Place ID do Google Places
  photoReference?: string   // Photo reference do Google Places
}
```

### Response Success (200)
```json
{
  "success": true,
  "imageUrl": "https://zgxtcawgllsnnernlgim.supabase.co/storage/v1/object/public/locations/...",
  "message": "Imagem processada e salva com sucesso"
}
```

### Response Error (400/404/500)
```json
{
  "error": "Mensagem de erro descritiva"
}
```

---

## 🔒 Segurança

### Variáveis de Ambiente
- `GOOGLE_MAPS_API_KEY` - Configurada no Supabase Dashboard (não exposta)
- `SUPABASE_URL` - Disponível automaticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Disponível automaticamente (bypass RLS)

### Benefícios de Segurança:
1. **API Key Protegida:** Não exposta no frontend
2. **Service Role:** Usado apenas server-side
3. **Validação:** Entrada validada na Edge Function
4. **CORS:** Configurado corretamente

---

## ✅ Status

**Edge Function:** ✅ Criada
**Código:** ✅ Implementado
**Documentação:** ✅ Criada
**Integração Frontend:** ✅ Atualizada
**Deploy:** ⏳ Pendente

---

## 📝 Próximos Passos

1. ⏳ **Fazer Deploy:** Deployar Edge Function no Supabase
2. ⏳ **Configurar Secrets:** Adicionar `GOOGLE_MAPS_API_KEY` nas variáveis de ambiente
3. ⏳ **Testar:** Testar função com um local real
4. ⏳ **Verificar Logs:** Verificar logs no Dashboard
5. ⏳ **Monitorar:** Monitorar uso e performance

---

## 🧪 Como Testar

### Via Dashboard:
1. Acesse Edge Functions > process-location-image
2. Clique em **"Invoke"**
3. Body:
```json
{
  "locationId": "uuid-do-local",
  "googlePlaceId": "ChIJ..."
}
```

### Via Frontend:
```typescript
const result = await ImageStorageService.processLocationImage(
  'location-id',
  'google-place-id'
)

console.log('Resultado:', result)
```

---

## 📊 Monitoramento

### Logs:
- Dashboard: Edge Functions > process-location-image > Logs
- CLI: `supabase functions logs process-location-image`

### Métricas:
- Número de invocações
- Tempo de execução
- Taxa de erro
- Uso de storage

---

**Arquivos Criados:**
- `supabase/functions/process-location-image/index.ts` - Código da função
- `supabase/functions/process-location-image/deno.json` - Configuração
- `supabase/functions/process-location-image/README.md` - Documentação

**Arquivos Modificados:**
- `src/services/image-storage.service.ts` - Usa Edge Function

**Status:** ✅ Pronto para deploy

