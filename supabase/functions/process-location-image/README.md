# Edge Function: process-location-image

## Descrição

Edge Function do Supabase para processar e salvar imagens de locais do Google Places API no Supabase Storage.

## Benefícios

✅ **Resolve CORS:** Processamento server-side não tem restrições CORS
✅ **Segurança:** API key do Google Maps não fica exposta no frontend
✅ **Confiabilidade:** Processamento mais estável e confiável
✅ **Performance:** Pode fazer cache e otimizações server-side

## Estrutura

```
supabase/functions/process-location-image/
  ├── index.ts          # Código da Edge Function
  └── deno.json         # Configuração Deno/imports
```

## Variáveis de Ambiente Necessárias

Configure no Supabase Dashboard > Edge Functions > Settings:

```env
GOOGLE_MAPS_API_KEY=AIzaSyBu-Xerf1F_Q-yXaEMGM17hMpuKaNa8jXw
```

As seguintes variáveis já estão disponíveis automaticamente:
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (para bypass RLS)

## Como Deployar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/functions
2. Clique em **"Create a new function"**
3. Nome: `process-location-image`
4. Cole o conteúdo de `supabase/functions/process-location-image/index.ts`
5. Configure variável de ambiente `GOOGLE_MAPS_API_KEY`
6. Clique em **"Deploy"**

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se não tiver)
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

## Uso no Frontend

A função é chamada automaticamente pelo `ImageStorageService.processLocationImage()`:

```typescript
// Exemplo de uso
const result = await ImageStorageService.processLocationImage(
  locationId,
  googlePlaceId,
  photoReference
)

if (result.data) {
  console.log('Imagem salva:', result.data)
}
```

## Request Body

```typescript
{
  locationId: string        // UUID do local (obrigatório)
  googlePlaceId?: string    // Place ID do Google Places (opcional)
  photoReference?: string   // Photo reference do Google Places (opcional)
}
```

## Response

### Sucesso (200)
```json
{
  "success": true,
  "imageUrl": "https://zgxtcawgllsnnernlgim.supabase.co/storage/v1/object/public/locations/...",
  "message": "Imagem processada e salva com sucesso"
}
```

### Erro (400/404/500)
```json
{
  "error": "Mensagem de erro"
}
```

## Fluxo de Funcionamento

```
1. Frontend chama ImageStorageService.processLocationImage()
   ↓
2. Service chama Edge Function via supabase.functions.invoke()
   ↓
3. Edge Function:
   - Verifica se imagem já existe
   - Busca photo_reference do Google Places (se necessário)
   - Baixa imagem do Google Places API
   - Faz upload para Supabase Storage
   - Atualiza campo image_url na tabela locations
   ↓
4. Retorna URL da imagem salva
   ↓
5. Frontend recebe URL e atualiza UI
```

## Segurança

- ✅ API key do Google Maps não exposta no frontend
- ✅ Service role key usado apenas server-side
- ✅ Validação de entrada na Edge Function
- ✅ CORS configurado corretamente
- ✅ Tratamento de erros robusto

## Logs

Os logs da Edge Function podem ser visualizados em:
- Supabase Dashboard > Edge Functions > process-location-image > Logs
- Ou via CLI: `supabase functions logs process-location-image`

## Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"
- Verifique se `GOOGLE_MAPS_API_KEY` está configurada no Supabase Dashboard

### Erro: "Foto não encontrada no Google Places"
- Verifique se `googlePlaceId` é válido
- Verifique se o local tem fotos no Google Places

### Erro: "Erro ao baixar imagem"
- Verifique se a API key tem permissões para Places API
- Verifique se há créditos disponíveis na conta Google Cloud

## Próximos Passos

1. ✅ Criar Edge Function (FEITO)
2. ⏳ Fazer deploy no Supabase
3. ⏳ Configurar variável de ambiente
4. ⏳ Testar função
5. ⏳ Verificar logs

