# Guia: Configuração da Chave da API do Google Maps

## 🔴 Problema Identificado

**Erro:** `API keys with referer restrictions cannot be used with this API.`

Este erro ocorre porque a chave da API do Google está configurada com **restrições de referer (domínio)**, mas a API do Google Places **não aceita** chaves com essas restrições quando chamadas do servidor (backend/Edge Functions).

## ✅ Solução: Criar Chave Separada para Backend

Você precisa de **duas chaves de API** separadas:

1. **Chave Frontend** (`VITE_GOOGLE_MAPS_API_KEY`): Para uso no React (ex: componente GoogleMap)
2. **Chave Backend** (`GOOGLE_MAPS_BACKEND_KEY`): Para uso nas Edge Functions do Supabase

---

## 📋 Passo a Passo: Configurar no Google Cloud Console

### Passo 1: Acessar o Google Cloud Console

1. Acesse: https://console.cloud.google.com
2. Selecione seu projeto

### Passo 2: Criar Nova Chave para Backend

1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **+ Criar credenciais** > **Chave de API**
3. Uma nova chave será criada
4. **NÃO configure restrições ainda** - vamos fazer isso depois

### Passo 3: Configurar Restrições da Chave Backend

1. Clique na chave recém-criada para editá-la
2. Em **Restrições de aplicativo**, selecione:
   - ✅ **Restringir chave**
   - Em **Restrições de API**, selecione apenas:
     - ✅ **Places API**
     - ✅ **Places API (New)** (se disponível)
   
3. **NÃO** selecione "Aplicativos da web" em "Restrições de aplicativo"
4. **Opcional:** Se souber os IPs de saída do Supabase, você pode restringir por IP, mas isso é opcional
5. Clique em **Salvar**

### Passo 4: Configurar Restrições da Chave Frontend (se já existir)

1. Se você já tem uma chave para o frontend, edite-a
2. Em **Restrições de aplicativo**, selecione:
   - ✅ **Restringir chave**
   - Em **Restrições de API**, selecione as APIs que você usa no frontend
   - Em **Restrições de aplicativo**, selecione:
     - ✅ **Aplicativos da web**
     - Adicione os domínios permitidos (ex: `localhost`, `seu-dominio.com`)

### Passo 5: Configurar no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** > **Edge Functions**
3. Role até **Secrets** (Variáveis de Ambiente)
4. Adicione uma nova variável:
   - **Nome:** `GOOGLE_MAPS_BACKEND_KEY`
   - **Valor:** Cole a chave de API do backend que você criou
5. Clique em **Save**

### Passo 6: Verificar se as APIs Estão Habilitadas

1. No Google Cloud Console, vá em **APIs e Serviços** > **Biblioteca**
2. Certifique-se de que estas APIs estão **habilitadas**:
   - ✅ **Places API**
   - ✅ **Places API (New)** (se disponível)
   - ✅ **Maps JavaScript API** (para o frontend)

---

## 🔍 Verificação

Após configurar:

1. **Recarregue a aplicação**
2. **Verifique os logs** no Supabase Dashboard:
   - Functions > `get-place-details` > Logs
   - Não deve mais aparecer o erro `REQUEST_DENIED`
3. **Verifique o console do navegador**:
   - Não deve mais aparecer erros 400 Bad Request

---

## 📝 Resumo das Chaves

| Chave | Uso | Restrições |
|-------|-----|------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Frontend (React) | ✅ Aplicativos da web (domínios) |
| `GOOGLE_MAPS_BACKEND_KEY` | Backend (Edge Functions) | ❌ **SEM** restrições de aplicativo web |

---

## ⚠️ Importante

- **Nunca** use a mesma chave para frontend e backend se ela tiver restrições de referer
- A chave do backend **não deve** ter restrições de "Aplicativos da web"
- A chave do backend pode ter restrições de **API** (apenas Places API)
- Mantenha as chaves seguras e nunca as commite no código

---

## 🆘 Troubleshooting

### Erro persiste após configurar?

1. **Verifique se a variável está configurada no Supabase:**
   - Project Settings > Edge Functions > Secrets
   - Certifique-se de que `GOOGLE_MAPS_BACKEND_KEY` está lá

2. **Verifique se a API está habilitada:**
   - Google Cloud Console > APIs e Serviços > Bibliotecas
   - Procure por "Places API" e verifique se está habilitada

3. **Verifique os logs da Edge Function:**
   - Supabase Dashboard > Functions > `get-place-details` > Logs
   - Procure por mensagens de erro específicas

4. **Aguarde alguns minutos:**
   - Mudanças nas restrições de chave podem levar alguns minutos para propagar

---

## ✅ Validação e Teste

Após seguir todos os passos, valide se a configuração está funcionando corretamente:

### Checklist de Validação

- [ ] Chave backend criada no Google Cloud Console
- [ ] Chave backend configurada SEM restrições de "Aplicativos da web"
- [ ] Chave backend restringida apenas por API (Places API)
- [ ] Variável `GOOGLE_MAPS_BACKEND_KEY` configurada no Supabase
- [ ] Places API habilitada no Google Cloud Console
- [ ] Aplicação recarregada após configuração

### Teste 1: Verificar Logs da Edge Function

1. Acesse: **Supabase Dashboard** > **Functions** > **get-place-details** > **Logs**
2. Recarregue sua aplicação ou navegue para uma página que usa fotos de lugares
3. Verifique os logs:
   - ✅ **Sucesso:** Deve aparecer `[get-place-details] Sucesso! Retornando dados do Google Places`
   - ❌ **Erro:** Se ainda aparecer `REQUEST_DENIED`, verifique se a chave está correta

### Teste 2: Testar via Dashboard do Supabase

1. Acesse: **Supabase Dashboard** > **Functions** > **get-place-details**
2. Clique em **"Invoke"** ou **"Test"**
3. Use este body de teste:
```json
{
  "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "fields": ["photos"]
}
```
4. Verifique a resposta:
   - ✅ **Sucesso (200):** Retorna dados com `photos` array
   - ❌ **Erro (400):** Verifique os logs para mensagem específica

### Teste 3: Verificar no Console do Navegador

1. Abra o **DevTools** (F12) > **Console**
2. Recarregue a aplicação
3. Verifique:
   - ✅ **Sem erros 400:** Não deve aparecer `POST .../get-place-details 400 (Bad Request)`
   - ✅ **Logs de sucesso:** Deve aparecer `[DEBUG Frontend] Foto processada com sucesso`
   - ❌ **Se aparecer erro:** Verifique a mensagem e siga as instruções

### Teste 4: Verificar Fotos Carregando

1. Navegue para uma página que exibe lugares (ex: lista de locais próximos)
2. Verifique se as fotos estão carregando:
   - ✅ **Sucesso:** Fotos aparecem corretamente
   - ❌ **Erro:** Placeholder aparece ou imagens quebradas

### Teste 5: Verificar Variável de Ambiente no Supabase

1. Acesse: **Supabase Dashboard** > **Project Settings** > **Edge Functions**
2. Role até **Secrets**
3. Verifique se `GOOGLE_MAPS_BACKEND_KEY` está listada:
   - ✅ **Presente:** A variável está configurada
   - ❌ **Ausente:** Adicione seguindo o Passo 5

---

## 🎯 Resultado Esperado

Após a configuração correta, você deve ver:

### ✅ Sinais de Sucesso:

1. **Logs da Edge Function:**
   ```
   [get-place-details] Buscando detalhes do Google Places: { place_id: '...', ... }
   [get-place-details] Resposta completa do Google Places: { status: 'OK', ... }
   [get-place-details] Sucesso! Retornando dados do Google Places
   ```

2. **Console do Navegador:**
   ```
   [DEBUG Frontend] Preparando para invocar "get-place-details". Payload: { ... }
   [DEBUG Frontend] Resposta recebida de "get-place-details": { hasData: true, ... }
   [DEBUG Frontend] Foto processada com sucesso. URL gerada: ...
   ```

3. **Fotos Carregando:**
   - Imagens dos lugares aparecem corretamente
   - Não há placeholders ou imagens quebradas

### ❌ Se Ainda Houver Erros:

1. **Erro `REQUEST_DENIED`:**
   - Verifique se a chave backend NÃO tem restrições de "Aplicativos da web"
   - Verifique se a Places API está habilitada

2. **Erro `API key not valid`:**
   - Verifique se a chave está correta no Supabase
   - Verifique se copiou a chave completa (sem espaços)

3. **Erro `This API project is not authorized`:**
   - Verifique se a Places API está habilitada no Google Cloud Console

4. **Erro `OVER_QUERY_LIMIT`:**
   - Você excedeu a quota diária
   - Aguarde ou aumente a quota no Google Cloud Console

---

## 📞 Próximos Passos Após Validação

Se tudo estiver funcionando:

1. ✅ **Remover logs de debug** (opcional, para produção):
   - Os logs `[DEBUG Frontend]` podem ser removidos se desejar
   - Mantenha os logs de erro para troubleshooting

2. ✅ **Monitorar uso:**
   - Acompanhe o uso da API no Google Cloud Console
   - Configure alertas de quota se necessário

3. ✅ **Documentar:**
   - Anote qual chave está sendo usada onde
   - Mantenha registro das configurações para referência futura

