# Edge Function: process-location-image

## ✅ Edge Function Criada com Sucesso!

A Edge Function foi criada para processar imagens de locais server-side, resolvendo problemas CORS e mantendo a API key segura.

---

## 📁 Estrutura Criada

```
supabase/functions/process-location-image/
  ├── index.ts          # Código da Edge Function
  ├── deno.json         # Configuração Deno
  └── README.md         # Documentação completa
```

---

## 🚀 Como Fazer Deploy

### Opção 1: Via Supabase Dashboard (Mais Fácil)

1. **Acesse o Dashboard:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/functions
   ```

2. **Crie Nova Função:**
   - Clique em **"Create a new function"** ou **"New Function"**
   - Nome da função: `process-location-image`
   - Runtime: `Deno` (padrão)

3. **Cole o Código:**
   - Abra o arquivo `supabase/functions/process-location-image/index.ts`
   - Copie TODO o conteúdo
   - Cole no editor do Dashboard

4. **Configure Secrets (Variáveis de Ambiente):**
   - Vá em **Settings** > **Secrets** (ou **Edge Functions** > **Settings**)
   - Clique em **"Add new secret"**
   - Nome: `GOOGLE_MAPS_API_KEY`
   - Valor: `AIzaSyBu-Xerf1F_Q-yXaEMGM17hMpuKaNa8jXw`
   - Clique em **"Save"**

5. **Deploy:**
   - Clique em **"Deploy"** ou **"Save"**
   - Aguarde o deploy completar (alguns segundos)

### Opção 2: Via Supabase CLI

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Linkar ao projeto
supabase link --project-ref zgxtcawgllsnnernlgim

# 4. Deploy da função
supabase functions deploy process-location-image

# 5. Configurar variável de ambiente
supabase secrets set GOOGLE_MAPS_API_KEY=AIzaSyBu-Xerf1F_Q-yXaEMGM17hMpuKaNa8jXw
```

---

## ✅ Verificação

Após o deploy, verifique:

1. **Status da Função:**
   - Dashboard > Edge Functions > `process-location-image`
   - Status deve estar **"Active"** (verde)

2. **Secrets Configurados:**
   - Dashboard > Edge Functions > Settings > Secrets
   - Deve ter `GOOGLE_MAPS_API_KEY` listada

3. **Teste Manual:**
   - Dashboard > Edge Functions > `process-location-image` > **"Invoke"**
   - Body:
   ```json
   {
     "locationId": "seu-location-id-aqui",
     "googlePlaceId": "ChIJ..."
   }
   ```
   - Deve retornar sucesso com `imageUrl`

---

## 🔧 Integração Frontend

O frontend já está configurado! O `ImageStorageService` automaticamente usa a Edge Function:

```typescript
// Já funciona automaticamente!
const result = await ImageStorageService.processLocationImage(
  locationId,
  googlePlaceId,
  photoReference
)
```

---

## 📊 Monitoramento

### Logs:
- Dashboard: Edge Functions > `process-location-image` > **Logs**
- CLI: `supabase functions logs process-location-image`

### Métricas:
- Dashboard: Edge Functions > `process-location-image` > **Metrics**
- Visualize invocações, erros, tempo de execução

---

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"
- ✅ Verifique se `GOOGLE_MAPS_API_KEY` está configurada em Settings > Secrets

### Erro: "Function not found"
- ✅ Verifique se o deploy foi concluído com sucesso
- ✅ Verifique se o nome da função está correto: `process-location-image`

### Erro: "Foto não encontrada no Google Places"
- ✅ Verifique se `googlePlaceId` é válido
- ✅ Verifique se o local tem fotos no Google Places

### Erro: "Erro ao baixar imagem"
- ✅ Verifique se a API key tem permissões para Places API
- ✅ Verifique se há créditos disponíveis na conta Google Cloud

---

## 📝 Próximos Passos

1. ✅ **Criar Edge Function** - FEITO
2. ⏳ **Fazer Deploy** - PENDENTE (siga instruções acima)
3. ⏳ **Configurar Secrets** - PENDENTE
4. ⏳ **Testar Função** - PENDENTE
5. ⏳ **Verificar Logs** - PENDENTE

---

## ✅ Status Atual

- ✅ Código da Edge Function criado
- ✅ Documentação criada
- ✅ Frontend integrado
- ⏳ Deploy pendente
- ⏳ Configuração de secrets pendente

---

**Pronto para deploy!** Siga as instruções acima para fazer o deploy da função.

