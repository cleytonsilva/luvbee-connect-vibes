# 🔴 CORREÇÃO URGENTE: Remover Restrições de Referer

## ❌ Problema Identificado

**Erro nos logs:**
```
API keys with referer restrictions cannot be used with this API.
```

**Causa:** A chave `GOOGLE_MAPS_BACKEND_KEY` configurada no Supabase ainda tem restrições de "Aplicativos da web" (referer).

---

## ✅ Solução: Remover Restrições de Referer

### Opção 1: Editar a Chave Existente (Mais Rápido)

1. **Acesse o Google Cloud Console:**
   - https://console.cloud.google.com
   - Selecione seu projeto

2. **Vá para Credenciais:**
   - Menu lateral: **APIs e Serviços** > **Credenciais**

3. **Encontre a chave que você está usando no Supabase:**
   - Procure pela chave que você configurou como `GOOGLE_MAPS_BACKEND_KEY`
   - **Dica:** Se não souber qual é, você pode verificar no Supabase Dashboard qual chave está configurada

4. **Clique na chave para editá-la**

5. **Na seção "Restrições de aplicativo":**
   - **IMPORTANTE:** Procure por "Restrições de aplicativo" (não "Restrições de API")
   - Você deve ver algo como:
     ```
     Restrições de aplicativo
     ○ Nenhuma restrição
     ● Restringir chave
       ○ Aplicativos da web (referenciadores HTTP)
       ○ Aplicativos Android
       ○ Aplicativos iOS
       ○ Endereços IP
     ```

6. **Selecione "Nenhuma restrição":**
   - Clique em **"Nenhuma restrição"** (primeira opção)
   - **OU** se quiser manter restrições de API, certifique-se de que **"Aplicativos da web"** NÃO está selecionado

7. **Na seção "Restrições de API":**
   - Mantenha **"Restringir chave"** selecionado
   - Selecione apenas: **"Places API"**
   - **NÃO** selecione outras APIs desnecessárias

8. **Clique em "Salvar"**

9. **Aguarde 2-5 minutos** para as mudanças propagarem

---

### Opção 2: Criar Nova Chave (Recomendado se não souber qual chave está usando)

1. **Acesse o Google Cloud Console:**
   - https://console.cloud.google.com
   - Selecione seu projeto

2. **Crie uma nova chave:**
   - **APIs e Serviços** > **Credenciais**
   - Clique em **"+ Criar credenciais"** > **"Chave de API"**
   - Uma nova chave será criada

3. **Configure as restrições:**
   - Clique na chave recém-criada para editá-la
   - Em **"Restrições de aplicativo"**: Selecione **"Nenhuma restrição"**
   - Em **"Restrições de API"**: Selecione **"Restringir chave"** e escolha apenas **"Places API"**
   - Clique em **"Salvar"**

4. **Copie a nova chave**

5. **Configure no Supabase:**
   - Acesse: Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - Edite ou adicione: `GOOGLE_MAPS_BACKEND_KEY`
   - Cole a nova chave
   - Clique em **"Save"**

6. **Aguarde 2-5 minutos** para as mudanças propagarem

---

## 🔍 Como Verificar se Está Correto

### Verificação Visual no Google Cloud Console:

Quando você editar a chave, deve ver:

```
Restrições de aplicativo
● Nenhuma restrição  ← DEVE ESTAR ASSIM

Restrições de API
● Restringir chave
  ☑ Places API       ← APENAS ESTA DEVE ESTAR MARCADA
```

**NÃO deve ter:**
- ❌ "Aplicativos da web" selecionado
- ❌ "Aplicativos Android" selecionado
- ❌ "Aplicativos iOS" selecionado
- ❌ "Endereços IP" com IPs configurados (a menos que você saiba os IPs do Supabase)

---

## ⚠️ Erros Comuns

### Erro 1: "Mas eu não selecionei 'Aplicativos da web'"

**Possível causa:** A chave pode ter sido criada com restrições anteriormente e você não percebeu.

**Solução:** 
1. Vá até a chave no Google Cloud Console
2. Verifique TODAS as seções de restrições
3. Certifique-se de que "Nenhuma restrição" está selecionado em "Restrições de aplicativo"

### Erro 2: "A chave não funciona mais"

**Possível causa:** Você removeu todas as restrições, mas também removeu as restrições de API.

**Solução:**
- Mantenha "Restrições de API" com apenas "Places API" selecionada
- Remova apenas as restrições de "Aplicativos da web"

### Erro 3: "Ainda está dando erro após configurar"

**Possíveis causas:**
1. Não aguardou tempo suficiente (aguarde 5 minutos)
2. Está usando a chave errada no Supabase
3. A Places API não está habilitada

**Solução:**
1. Aguarde 5 minutos após salvar
2. Verifique qual chave está configurada no Supabase
3. Verifique se a Places API está habilitada

---

## 📋 Checklist Final

Antes de testar novamente, verifique:

- [ ] Acessei o Google Cloud Console
- [ ] Encontrei a chave usada no Supabase
- [ ] Em "Restrições de aplicativo": Selecionei **"Nenhuma restrição"**
- [ ] Em "Restrições de API": Selecionei apenas **"Places API"**
- [ ] Cliquei em **"Salvar"**
- [ ] Aguardei pelo menos 2-5 minutos
- [ ] Verifiquei que a Places API está habilitada

---

## 🧪 Teste Após Configurar

1. **Recarregue a aplicação**
2. **Verifique os logs da Edge Function:**
   - Supabase Dashboard > Functions > `get-place-details` > Logs
   - Deve aparecer: `[get-place-details] Sucesso! Retornando dados do Google Places`
   - **NÃO** deve aparecer: `REQUEST_DENIED` ou `referer restrictions`

3. **Verifique o console do navegador:**
   - Não deve aparecer erros 400
   - Deve aparecer: `[DEBUG Frontend] Foto processada com sucesso`

---

## 🆘 Ainda Não Funciona?

Se após seguir todos os passos ainda houver erro:

1. **Crie uma chave completamente nova:**
   - Sem nenhuma restrição de aplicativo
   - Apenas restrição de API (Places API)

2. **Configure no Supabase:**
   - Remova a chave antiga
   - Adicione a nova chave

3. **Aguarde 5 minutos**

4. **Teste novamente**

5. **Se ainda não funcionar, compartilhe:**
   - Screenshot das configurações da chave no Google Cloud Console
   - Logs da Edge Function após o teste
   - Mensagem de erro completa

---

## 📸 Onde Está Cada Configuração

### Google Cloud Console:
```
APIs e Serviços > Credenciais > [Sua Chave]
├── Restrições de aplicativo
│   └── ○ Nenhuma restrição  ← DEVE ESTAR ASSIM
└── Restrições de API
    └── ● Restringir chave
        └── ☑ Places API     ← APENAS ESTA
```

### Supabase Dashboard:
```
Project Settings > Edge Functions > Secrets
└── GOOGLE_MAPS_BACKEND_KEY = sua-chave-sem-referer-restrictions
```

---

**Lembre-se:** O problema é que a chave tem restrições de "Aplicativos da web". Você precisa remover essas restrições mantendo apenas as restrições de API (Places API).

