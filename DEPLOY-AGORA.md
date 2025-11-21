# 🚀 Deploy na Vercel - Próximos Passos

## ✅ O que já foi feito:

1. ✅ Vercel CLI instalada globalmente
2. ✅ Script de deploy automatizado criado (`deploy-vercel.ps1`)
3. ✅ Guia completo criado (`GUIA-DEPLOY-VERCEL.md`)
4. ✅ Configuração `vercel.json` verificada

## 🎯 Próximos Passos (Execute na ordem):

### 1. Fazer Login na Vercel

Execute no terminal:

```bash
vercel login
```

Isso abrirá seu navegador para autenticação. Após fazer login, volte ao terminal.

### 2. Executar Deploy

**Opção A: Usar o script automatizado (Recomendado)**

```powershell
.\deploy-vercel.ps1
```

**Opção B: Deploy manual**

```bash
# Criar build de produção
npm run build

# Fazer deploy
vercel --prod
```

### 3. Configurar Variáveis de Ambiente

Após o primeiro deploy, você **DEVE** configurar as variáveis de ambiente:

**Via Dashboard (Mais fácil):**
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps (opcional)
```

**Via CLI:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GOOGLE_MAPS_API_KEY production
```

### 4. Fazer Redeploy

Após configurar as variáveis, faça um novo deploy:

```bash
vercel --prod
```

## 📋 Checklist Rápido

- [ ] Login na Vercel feito (`vercel login`)
- [ ] Build local funciona (`npm run build`)
- [ ] Deploy inicial realizado (`vercel --prod`)
- [ ] Variáveis de ambiente configuradas no Vercel Dashboard
- [ ] Redeploy realizado após configurar variáveis
- [ ] Aplicação testada na URL fornecida pela Vercel

## 🔒 Configuração no Supabase

Não esqueça de configurar CORS no Supabase:

1. Acesse Supabase Dashboard > Settings > API
2. Adicione a URL da Vercel em **Allowed Origins**
3. Formato: `https://seu-projeto.vercel.app`

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `GUIA-DEPLOY-VERCEL.md` - Guia completo passo a passo
- `DEPLOY.md` - Documentação original de deploy

## ⚠️ Importante

- As variáveis de ambiente são **obrigatórias** para a aplicação funcionar
- Sem elas, a aplicação não conseguirá conectar ao Supabase
- Configure-as antes de testar a aplicação em produção

---

**Pronto para começar? Execute `vercel login` no terminal!**

