# 🔍 Como Verificar os Logs da Edge Function

## Passo a Passo para Ver o Erro Real

### 1. Acesse o Supabase Dashboard

1. Vá para: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto: `zgxtcawgllsnnernlgim`

### 2. Navegue até os Logs da Edge Function

1. No menu lateral, clique em **"Edge Functions"** (ou **"Functions"**)
2. Clique na função **`get-place-details`**
3. Clique na aba **"Logs"**

### 3. Recarregue a Aplicação

1. Volte para sua aplicação React
2. Recarregue a página (F5 ou Ctrl+R)
3. Isso vai gerar novos logs na Edge Function

### 4. Verifique os Logs Mais Recentes

Procure por logs com nível **"error"** (vermelho). Você deve ver algo como:

```
[get-place-details] Erro do Google Places API: {
  status: "REQUEST_DENIED",
  error_message: "API keys with referer restrictions cannot be used with this API."
}
```

### 5. O Que Procurar

#### ✅ Se Estiver Funcionando:
```
[get-place-details] Sucesso! Retornando dados do Google Places
```

#### ❌ Se Houver Erro, você verá:

**Erro de Restrições de Referer:**
```
[get-place-details] Erro do Google Places API: {
  status: "REQUEST_DENIED",
  error_message: "API keys with referer restrictions cannot be used with this API."
}
```

**Erro de Chave Inválida:**
```
[get-place-details] Erro do Google Places API: {
  status: "REQUEST_DENIED",
  error_message: "This API key is not valid."
}
```

**Erro de API Não Habilitada:**
```
[get-place-details] Erro do Google Places API: {
  status: "REQUEST_DENIED",
  error_message: "This API project is not authorized to use this API."
}
```

---

## 📋 Checklist de Verificação

Após verificar os logs, confirme:

- [ ] A variável `GOOGLE_MAPS_BACKEND_KEY` está configurada no Supabase?
  - **Onde:** Project Settings > Edge Functions > Secrets
  - **Nome exato:** `GOOGLE_MAPS_BACKEND_KEY` (case-sensitive)

- [ ] A chave backend NÃO tem restrições de "Aplicativos da web"?
  - **Onde:** Google Cloud Console > APIs e Serviços > Credenciais
  - **Verifique:** A chave usada no Supabase não deve ter "Aplicativos da web" selecionado

- [ ] A Places API está habilitada?
  - **Onde:** Google Cloud Console > APIs e Serviços > Bibliotecas
  - **Procure por:** "Places API" e verifique se está "Habilitada"

- [ ] Aguardou alguns minutos após configurar?
  - Mudanças podem levar 2-5 minutos para propagar

---

## 🆘 Próximos Passos

### Se o erro for "referer restrictions":

1. Vá para Google Cloud Console
2. Crie uma NOVA chave de API
3. Configure apenas restrições de API (Places API)
4. **NÃO** selecione "Aplicativos da web"
5. Atualize a chave no Supabase

### Se o erro for "API key not valid":

1. Verifique se copiou a chave completa (sem espaços)
2. Verifique se a chave está correta no Supabase
3. Tente criar uma nova chave

### Se o erro for "API not authorized":

1. Vá para Google Cloud Console > APIs e Serviços > Bibliotecas
2. Procure por "Places API"
3. Clique em "Habilitar"

---

## 📸 Onde Está Cada Coisa

### Supabase Dashboard
```
Dashboard > Project Settings > Edge Functions > Secrets
└── GOOGLE_MAPS_BACKEND_KEY = sua-chave-aqui
```

### Google Cloud Console
```
APIs e Serviços > Credenciais
└── [Sua chave backend]
    └── Restrições de aplicativo
        └── Restrições de API: ✅ Places API
        └── Restrições de aplicativo: ❌ NENHUMA (ou IP se souber)
```

---

## 💡 Dica

Se você não conseguir ver os logs ou estiver com dificuldade, copie e cole aqui:
1. A mensagem de erro completa dos logs
2. O status do erro (REQUEST_DENIED, INVALID_REQUEST, etc.)
3. A mensagem de erro do Google (error_message)

Isso vai ajudar a identificar exatamente qual é o problema!

