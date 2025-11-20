# 📋 Guia de Configuração de Variáveis de Ambiente

## ✅ Arquivos Corretos

### `.env` e `.env.local` (Frontend)

Estes arquivos são para variáveis do **frontend** (React/Vite). Todas as variáveis devem começar com `VITE_`:

```env
# Google Maps API (Frontend - para uso no React)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
```

### ⚠️ O que NÃO deve estar aqui:

- ❌ `VITE_SUPABASE_ACCESS_TOKEN` - Tokens de acesso são apenas para CLI/backend
- ❌ `GOOGLE_MAPS_BACKEND_KEY` - Esta chave vai no Supabase Dashboard (Secrets)
- ❌ Service Role Keys - Nunca exponha no frontend

---

## 🔐 Configuração de Chaves

### Frontend (`.env` / `.env.local`)

**Chave:** `VITE_GOOGLE_MAPS_API_KEY`
- **Uso:** Componentes React, Google Maps JavaScript API
- **Restrições:** Pode ter restrições de "Aplicativos da web" (domínios)
- **Onde:** Arquivo `.env` ou `.env.local`

### Backend (Supabase Dashboard)

**Chave:** `GOOGLE_MAPS_BACKEND_KEY`
- **Uso:** Edge Functions do Supabase
- **Restrições:** NÃO deve ter restrições de "Aplicativos da web"
- **Onde:** Supabase Dashboard > Project Settings > Edge Functions > Secrets

---

## 📝 Checklist de Segurança

- [ ] `.env` está no `.gitignore` ✅ (já configurado)
- [ ] `.env.local` está no `.gitignore` ✅ (já configurado)
- [ ] Nenhum token privilegiado nos arquivos `.env`
- [ ] Chave backend configurada no Supabase Dashboard
- [ ] Chave frontend configurada no `.env.local`

---

## 🆘 Troubleshooting

### "Chave não encontrada" no Frontend

1. Verifique se a variável começa com `VITE_`
2. Reinicie o servidor de desenvolvimento após alterar `.env`
3. Verifique se está usando `import.meta.env.VITE_*`

### "Chave não encontrada" no Backend

1. Verifique se configurou `GOOGLE_MAPS_BACKEND_KEY` no Supabase Dashboard
2. Verifique se o nome está correto (case-sensitive)
3. Aguarde alguns minutos após adicionar (propagação)

### Token de Acesso do Supabase

Se precisar usar o Supabase CLI:

```bash
# Opção 1: Login interativo
supabase login

# Opção 2: Variável de ambiente do sistema
export SUPABASE_ACCESS_TOKEN=sbp_...

# Opção 3: Arquivo de configuração local (não commitado)
# Crie um arquivo separado para tokens do CLI
```

---

## 📚 Referências

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Google Maps API Key Setup](./GOOGLE_API_KEY_SETUP.md)

