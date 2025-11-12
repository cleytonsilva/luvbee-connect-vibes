# Guia de Deploy - LuvBee Connect Vibes

Este documento descreve o processo de deploy na Vercel.

## 📋 Pré-requisitos

1. Conta na Vercel ([vercel.com](https://vercel.com))
2. Projeto Supabase configurado
3. Variáveis de ambiente preparadas

## 🚀 Deploy na Vercel

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. Conecte seu repositório GitHub/GitLab/Bitbucket
4. Selecione o projeto `luvbee-connect-vibes`

### 2. Configurar Variáveis de Ambiente

No painel de configuração do projeto na Vercel, adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps (opcional)
NODE_ENV=production
```

**⚠️ IMPORTANTE**: Não commite arquivos `.env` no repositório!

### 3. Configurações de Build

A Vercel detectará automaticamente as configurações do `vercel.json`:

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Acesse sua aplicação no domínio fornecido pela Vercel

## 🔒 Segurança

### Headers de Segurança

O `vercel.json` já configura automaticamente:

- ✅ Content Security Policy (CSP)
- ✅ X-Content-Type-Options
- ✅ X-Frame-Options
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ Strict-Transport-Security (HSTS)

### Cache

- Assets estáticos: Cache de 1 ano
- Imagens e vídeos: Cache de 1 ano
- HTML: Sem cache (sempre atualizado)

## 📝 Variáveis de Ambiente Necessárias

### Obrigatórias

- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

### Opcionais

- `VITE_GOOGLE_MAPS_API_KEY` - Chave da API do Google Maps (recomendado usar Edge Function)

## 🔧 Troubleshooting

### Build Falha

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Verifique os logs de build na Vercel
3. Teste o build localmente: `npm run build`

### Erro 404 em Rotas

- Verifique se o `vercel.json` tem a configuração de `rewrites` para SPA

### Erro de CORS

- Configure CORS no Supabase Dashboard
- Verifique se a URL da Vercel está nas origens permitidas

## 📚 Recursos

- [Documentação Vercel](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
- [Supabase + Vercel](https://supabase.com/docs/guides/hosting/vercel)

