# 🧪 Teste Pós-Deploy da Edge Function

## ✅ Status Atual

- ✅ Edge Function `get-place-details` deployada no Supabase
- ✅ Chave backend configurada: `GOOGLE_MAPS_BACKEND_KEY` no Supabase Dashboard
- ✅ Configuração do Google Cloud correta (sem restrições de referer)
- ✅ Aguardando propagação (2-5 minutos)

---

## 🧪 Teste 1: Via Dashboard do Supabase

### Passo a Passo:

1. **Acesse:** Supabase Dashboard > Functions > `get-place-details`
2. **Clique em:** "Invoke" ou "Test"
3. **Cole este body:**
```json
{
  "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "fields": ["photos"]
}
```
4. **Clique em:** "Invoke"

### ✅ Resultado Esperado (Sucesso):

```json
{
  "data": {
    "photos": [
      {
        "photo_reference": "Aap_uEA...",
        "height": 3024,
        "width": 4032
      }
    ]
  }
}
```

### ❌ Se Houver Erro:

Verifique a mensagem de erro e compare com:
- `REQUEST_DENIED` → Chave ainda tem restrições de referer
- `API key not valid` → Chave incorreta no Supabase
- `This API project is not authorized` → Places API não habilitada

---

## 🧪 Teste 2: Via Aplicação React

### Passo a Passo:

1. **Recarregue a aplicação** (F5 ou Ctrl+R)
2. **Abra o Console do Navegador** (F12 > Console)
3. **Navegue para uma página** que exibe lugares

### ✅ Resultado Esperado (Sucesso):

**Console do Navegador:**
```
[DEBUG Frontend] Preparando para invocar "get-place-details". Payload: { ... }
[DEBUG Frontend] Resposta recebida de "get-place-details": { hasData: true, ... }
[DEBUG Frontend] Foto processada com sucesso. URL gerada: ...
```

**Network Tab:**
- `POST .../get-place-details` → Status: **200 OK** ✅

**Visual:**
- Fotos dos lugares aparecem corretamente
- Não há placeholders ou imagens quebradas

### ❌ Se Houver Erro:

**Console do Navegador:**
```
POST .../get-place-details 400 (Bad Request)
[usePlacePhoto] Erro ao buscar detalhes: { ... }
```

**Ação:**
- Verifique os logs da Edge Function (Teste 3)

---

## 🧪 Teste 3: Verificar Logs da Edge Function

### Passo a Passo:

1. **Acesse:** Supabase Dashboard > Functions > `get-place-details` > **Logs**
2. **Recarregue a aplicação** para gerar novos logs
3. **Procure pelos logs mais recentes**

### ✅ Resultado Esperado (Sucesso):

```
[get-place-details] Body recebido: {"place_id":"...","fields":["photos"]}
[get-place-details] Buscando detalhes do Google Places: { place_id: '...', ... }
[get-place-details] Resposta completa do Google Places: { status: 'OK', ... }
[get-place-details] Sucesso! Retornando dados do Google Places
```

### ❌ Se Houver Erro:

**Erro de Restrições de Referer:**
```
[get-place-details] Erro do Google Places API: {
  status: "REQUEST_DENIED",
  error_message: "API keys with referer restrictions cannot be used with this API."
}
```
**Solução:** Verifique se a chave no Google Cloud Console tem "Application restrictions: None"

**Erro de Chave Inválida:**
```
[get-place-details] Google Maps API key não configurada
```
**Solução:** Verifique se `GOOGLE_MAPS_BACKEND_KEY` está configurada no Supabase

---

## 📋 Checklist de Verificação

Antes de testar, confirme:

- [ ] Aguardou pelo menos 2-5 minutos após configurar a chave no Supabase?
- [ ] A chave `GOOGLE_MAPS_BACKEND_KEY` está no Supabase Dashboard?
- [ ] A chave no Google Cloud tem "Application restrictions: None"?
- [ ] A Places API está habilitada no Google Cloud Console?
- [ ] A Edge Function foi deployada com sucesso?

---

## 🔍 Troubleshooting

### Problema: Ainda aparece erro `REQUEST_DENIED`

**Possíveis causas:**
1. Não aguardou tempo suficiente (aguarde mais 5 minutos)
2. Está usando a chave errada no Supabase
3. A chave no Google Cloud ainda tem restrições

**Solução:**
1. Verifique qual chave está configurada no Supabase
2. Confirme que essa mesma chave no Google Cloud tem "Application restrictions: None"
3. Aguarde mais alguns minutos

### Problema: Erro "API key not configured"

**Causa:** A variável não está configurada no Supabase

**Solução:**
1. Vá em: Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. Adicione: `GOOGLE_MAPS_BACKEND_KEY` = `<NOVA_GOOGLE_MAPS_BACKEND_KEY>`
3. Clique em "Save"
4. Aguarde alguns minutos

### Problema: Edge Function não responde

**Causa:** A função pode não ter sido deployada corretamente

**Solução:**
1. Verifique se a função aparece no Dashboard do Supabase
2. Verifique os logs para ver se há erros de deploy
3. Faça um novo deploy se necessário

---

## ✅ Próximos Passos Após Sucesso

Se todos os testes passarem:

1. ✅ **Remover logs de debug** (opcional):
   - Remova os `console.log('[DEBUG Frontend]...')` do código
   - Mantenha apenas logs de erro

2. ✅ **Monitorar uso:**
   - Acompanhe o uso da API no Google Cloud Console
   - Configure alertas de quota se necessário

3. ✅ **Atualizar outras Edge Functions** (opcional):
   - `get-place-photo` → Atualizar para usar `GOOGLE_MAPS_BACKEND_KEY`
   - `search-nearby` → Atualizar para usar `GOOGLE_MAPS_BACKEND_KEY`

---

## 📞 Suporte

Se após seguir todos os passos ainda houver erro:

1. Copie a mensagem de erro completa dos logs
2. Verifique qual chave está configurada no Supabase
3. Confirme as configurações no Google Cloud Console
4. Compartilhe essas informações para análise

---

**Boa sorte com os testes! 🚀**

