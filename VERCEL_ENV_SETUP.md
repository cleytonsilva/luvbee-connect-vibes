# 🔧 Configuração de Variáveis de Ambiente no Vercel

## ⚠️ Problema Resolvido

**Erro:** `Environment Variable "VITE_SUPABASE_URL" references Secret "VITE_SUPABASE_URL", which does not exist.`

**Causa:** O `vercel.json` estava tentando referenciar Secrets que não existiam.

**Solução:** Removida a seção `env` do `vercel.json`. As variáveis devem ser configuradas apenas no **Vercel Console**.

---

## 📋 Passo a Passo - Configurar Variáveis no Vercel

### 1. Acessar Vercel Dashboard
1. Vá para: https://vercel.com/dashboard
2. Selecione seu projeto: **luvbee-connect-vibes**

### 2. Ir para Settings → Environment Variables
1. Clique em **Settings** (no topo)
2. Clique em **Environment Variables** (menu lateral)

### 3. Adicionar Variáveis (uma por uma)

#### ✅ Variável 1: VITE_SUPABASE_URL
```
Name:  VITE_SUPABASE_URL
Value: https://zgxtcawgllsnnernlgim.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development
```

#### ✅ Variável 2: VITE_SUPABASE_ANON_KEY
```
Name:  VITE_SUPABASE_ANON_KEY
Value: [sua chave anon do Supabase]
Environments: ☑ Production ☑ Preview ☑ Development
```

#### ✅ Variável 3: VITE_GOOGLE_MAPS_API_KEY
```
Name:  VITE_GOOGLE_MAPS_API_KEY
Value: [sua chave do Google Maps API]
Environments: ☑ Production ☑ Preview ☑ Development
```

### 4. Salvar e Redeploy
1. Clique em **Save** para cada variável
2. Vá para **Deployments**
3. Clique nos **3 pontos** do último deployment
4. Selecione **Redeploy**

---

## 🔍 Onde Encontrar os Valores

### Supabase URL e Anon Key
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Google Maps API Key
1. Acesse: https://console.cloud.google.com/
2. Vá em **APIs & Services** → **Credentials**
3. Copie sua **API Key** → `VITE_GOOGLE_MAPS_API_KEY`

---

## ✅ Checklist

```
[ ] VITE_SUPABASE_URL configurada no Vercel Console
[ ] VITE_SUPABASE_ANON_KEY configurada no Vercel Console
[ ] VITE_GOOGLE_MAPS_API_KEY configurada no Vercel Console
[ ] Todas marcadas para Production, Preview e Development
[ ] Redeploy feito após adicionar variáveis
[ ] Build completou sem erros
[ ] Variáveis aparecem no build log
```

---

## 🎯 Verificação

Após configurar, você pode verificar no **Build Logs**:

```
> vite build
✓ VITE_SUPABASE_URL found
✓ VITE_SUPABASE_ANON_KEY found
✓ VITE_GOOGLE_MAPS_API_KEY found
```

---

## 📝 Nota Importante

**NÃO** adicione variáveis no `vercel.json` usando `@SecretName`.

**FAÇA** configure-as apenas no **Vercel Console** → **Settings** → **Environment Variables**.

O `vercel.json` atualizado não tem mais a seção `env` - isso está correto!

---

**Status:** ✅ Configuração corrigida
**Próximo Passo:** Adicionar variáveis no Vercel Console

