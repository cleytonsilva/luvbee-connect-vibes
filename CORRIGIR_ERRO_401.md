# 🔴 Correção do Erro 401 em get-place-photo

## ❌ Problema Identificado

**Erro:** `GET | 401 | .../get-place-photo`

A Edge Function `get-place-photo` está retornando erro 401 (Unauthorized), o que indica um problema de autenticação/autorização.

---

## 🔍 Possíveis Causas

### Causa 1: Edge Function Exigindo Autenticação (Mais Provável)

O Supabase pode estar configurado para exigir autenticação em todas as Edge Functions por padrão.

**Solução:** Verificar se a função está configurada como pública no Supabase Dashboard.

### Causa 2: Headers de Autenticação Ausentes

A função pode estar sendo chamada sem os headers de autenticação necessários.

**Solução:** Garantir que a função aceita chamadas sem autenticação (pública).

---

## ✅ Correções Aplicadas

### 1. Atualização da Função `get-place-photo`

- ✅ Atualizada para usar `GOOGLE_MAPS_BACKEND_KEY` (em vez de `GOOGLE_MAPS_API_KEY`)
- ✅ Adicionados headers CORS em todas as respostas
- ✅ Adicionados logs para debug
- ✅ Melhorado tratamento de erros

### 2. Verificação no Supabase Dashboard

**IMPORTANTE:** Verifique se a função está configurada como pública:

1. Acesse: **Supabase Dashboard** > **Functions** > **get-place-photo**
2. Verifique as configurações de autenticação
3. Se houver opção "Require authentication", **desative** para esta função

---

## 🔧 Solução Alternativa: Verificar Configuração do Supabase

Se o erro 401 persistir, pode ser necessário verificar:

### Opção 1: Verificar se a Função Está Pública

No Supabase Dashboard:
1. Vá em **Functions** > **get-place-photo**
2. Verifique se há configurações de autenticação
3. Certifique-se de que a função pode ser chamada sem autenticação

### Opção 2: Verificar Headers na Chamada

Se a função exigir autenticação, você precisa incluir os headers:

```typescript
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'apikey': supabaseAnonKey
  }
})
```

Mas para funções públicas, isso não deveria ser necessário.

---

## 🧪 Teste Após Correções

1. **Faça o deploy da função atualizada:**
   - Use o MCP para fazer deploy novamente
   - Ou use: `supabase functions deploy get-place-photo`

2. **Teste via Dashboard:**
   - Supabase Dashboard > Functions > get-place-photo > Invoke
   - Use: `?photoreference=TEST&maxwidth=400`
   - Deve retornar status 200 ou erro do Google (não 401)

3. **Teste via Aplicação:**
   - Recarregue a aplicação
   - Verifique se as fotos carregam
   - Verifique os logs da Edge Function

---

## 📋 Checklist de Verificação

- [ ] Função `get-place-photo` atualizada para usar `GOOGLE_MAPS_BACKEND_KEY`
- [ ] Headers CORS adicionados em todas as respostas
- [ ] Função deployada novamente
- [ ] Verificado se a função está configurada como pública no Supabase
- [ ] Testado via Dashboard do Supabase
- [ ] Testado via aplicação React

---

## 🆘 Se o Erro 401 Persistir

1. **Verifique os logs da Edge Function:**
   - Supabase Dashboard > Functions > get-place-photo > Logs
   - Procure por mensagens de erro específicas

2. **Verifique a configuração do Supabase:**
   - Project Settings > Edge Functions
   - Veja se há configurações globais de autenticação

3. **Teste com curl:**
   ```bash
   curl -X GET "https://zgxtcawgllsnnernlgim.supabase.co/functions/v1/get-place-photo?photoreference=TEST&maxwidth=400" \
     -H "apikey: YOUR_ANON_KEY"
   ```

4. **Se necessário, adicione autenticação na chamada:**
   - Modifique o código que chama a função para incluir headers de autenticação

---

## 📝 Nota sobre o Erro 400 em get-place-details

O erro 400 em `get-place-details` ainda mostra "referer restrictions", o que significa:

1. **A chave ainda tem restrições** - Verifique novamente no Google Cloud Console
2. **Está usando a chave errada** - Confirme qual chave está no Supabase
3. **Não aguardou tempo suficiente** - Aguarde mais 5 minutos

**Ação:** Verifique novamente a configuração da chave no Google Cloud Console e confirme que está usando a chave correta no Supabase.

---

**Última atualização:** Correções aplicadas na função `get-place-photo`. Faça o deploy e teste novamente.

