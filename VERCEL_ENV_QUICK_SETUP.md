# 🚨 CONFIGURAÇÃO URGENTE - Variáveis de Ambiente Vercel

## ⚠️ Erro Atual
```
Uncaught Error: Missing Supabase environment variables
```

**Causa:** Variáveis de ambiente não configuradas no Vercel Console.

---

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Acessar Vercel Dashboard
1. Abra: https://vercel.com/dashboard
2. Faça login se necessário
3. Clique no projeto: **luvbee-connect-vibes**

### Passo 2: Ir para Environment Variables
1. Clique em **Settings** (no topo da página)
2. No menu lateral, clique em **Environment Variables**

### Passo 3: Adicionar Variáveis (uma por uma)

#### 🔵 Variável 1: VITE_SUPABASE_URL
```
Key:   VITE_SUPABASE_URL
Value: https://zgxtcawgllsnnernlgim.supabase.co

☑ Production
☑ Preview  
☑ Development
```

Clique em **Save**

---

#### 🔵 Variável 2: VITE_SUPABASE_ANON_KEY
```
Key:   VITE_SUPABASE_ANON_KEY
Value: [Cole sua chave anon aqui]

☑ Production
☑ Preview
☑ Development
```

**Onde encontrar:**
1. Acesse: https://supabase.com/dashboard
2. Selecione projeto: **zgxtcawgllsnnernlgim**
3. Vá em: **Settings** → **API**
4. Copie o valor de **anon public** key

Clique em **Save**

---

#### 🔵 Variável 3: VITE_GOOGLE_MAPS_API_KEY
```
Key:   VITE_GOOGLE_MAPS_API_KEY
Value: [Cole sua chave Google Maps aqui]

☑ Production
☑ Preview
☑ Development
```

**Onde encontrar:**
1. Acesse: https://console.cloud.google.com/
2. Vá em: **APIs & Services** → **Credentials**
3. Copie sua **API Key**

Clique em **Save**

---

### Passo 4: Fazer Redeploy
1. Vá para a aba **Deployments** (no topo)
2. Encontre o último deployment (com erro)
3. Clique nos **3 pontos** (⋯) à direita
4. Selecione **Redeploy**
5. Aguarde o build completar (~2-3 minutos)

---

## ✅ Verificação

Após o redeploy, verifique:

### 1. Build Logs
No Vercel → Deployments → Build Logs:
```
✓ Environment variables loaded
✓ VITE_SUPABASE_URL found
✓ Build completed successfully
```

### 2. Console do Browser
Abra DevTools → Console:
```
✅ Não deve aparecer: "Missing Supabase environment variables"
✅ Deve aparecer: "🔌 Supabase: { configured: true }"
```

### 3. Aplicação Funciona
- ✅ Página carrega sem erros
- ✅ Login funciona
- ✅ Dados carregam do Supabase

---

## 📸 Screenshots de Referência

### Onde Adicionar Variáveis:
```
Vercel Dashboard
  └─ Seu Projeto (luvbee-connect-vibes)
      └─ Settings
          └─ Environment Variables ← AQUI!
```

### Como Adicionar:
```
┌─────────────────────────────────────┐
│ Environment Variables               │
├─────────────────────────────────────┤
│ Key: VITE_SUPABASE_URL              │
│ Value: https://...supabase.co        │
│ ☑ Production ☑ Preview ☑ Dev       │
│ [Save]                               │
└─────────────────────────────────────┘
```

---

## 🆘 Problemas Comuns

### ❌ "Variável não encontrada após adicionar"
**Solução:** Faça **Redeploy** após adicionar variáveis

### ❌ "Build ainda falha"
**Solução:** 
1. Verifique se todas as 3 variáveis foram adicionadas
2. Verifique se estão marcadas para **Production**
3. Verifique se os valores estão corretos (sem espaços extras)

### ❌ "Não consigo encontrar Settings"
**Solução:** 
- Certifique-se de estar no projeto correto
- Use o menu lateral (não o dropdown do topo)

---

## 📋 Checklist Rápido

```
[ ] VITE_SUPABASE_URL adicionada
[ ] VITE_SUPABASE_ANON_KEY adicionada  
[ ] VITE_GOOGLE_MAPS_API_KEY adicionada
[ ] Todas marcadas para Production, Preview, Development
[ ] Redeploy feito
[ ] Build completou sem erros
[ ] Aplicação funciona no browser
```

---

## 🎯 Tempo Estimado

- **Configurar variáveis:** 3-5 minutos
- **Redeploy:** 2-3 minutos
- **Total:** ~5-8 minutos

---

## 📞 Ainda com Problemas?

1. Verifique se está no projeto correto no Vercel
2. Verifique se copiou os valores corretamente (sem espaços)
3. Verifique os Build Logs para mensagens específicas
4. Veja `VERCEL_ENV_SETUP.md` para guia mais detalhado

---

**Status:** ⚠️ Ação Necessária
**Prioridade:** 🔴 ALTA
**Tempo:** 5-8 minutos

