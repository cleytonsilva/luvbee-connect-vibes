# Guia de Configuração de Segurança - LuvBee

Este documento descreve as configurações de segurança que devem ser aplicadas no Supabase Dashboard e em outros serviços externos.

## 1. Configuração CORS no Supabase

### Passos:
1. Acesse o Supabase Dashboard
2. Vá em **Settings** > **API**
3. Em **CORS**, adicione apenas os domínios permitidos:
   - `http://localhost:8080` (desenvolvimento)
   - `https://app.luvbee.com` (produção)
   - `https://luvbee.com` (produção)

**Importante:** Não use `*` (wildcard) em produção.

---

## 2. Rate Limiting no Supabase

### Configuração:
1. Acesse **Settings** > **API** > **Rate Limiting**
2. Configure limites por endpoint:

**Recomendações:**
- **Auth endpoints** (`/auth/v1/*`): 10 requisições/minuto por IP
- **Database endpoints** (`/rest/v1/*`): 100 requisições/minuto por usuário autenticado
- **Storage endpoints** (`/storage/v1/*`): 50 requisições/minuto por usuário

### Rate Limiting no Frontend (React Query)
Já implementado via `staleTime` e `cacheTime` nos hooks:
- `useLocations`: `staleTime: 24 * 60 * 60 * 1000` (24 horas)
- `useChats`: `staleTime: 30 * 1000` (30 segundos)
- `useChatMessages`: `staleTime: 10 * 1000` (10 segundos)

---

## 3. Configuração de Chave Google Maps API

### Passos:
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **APIs & Services** > **Credentials**
3. Selecione sua chave da API
4. Em **Application restrictions**:
   - Selecione **HTTP referrers (web sites)**
   - Adicione apenas:
     - `http://localhost:8080/*` (desenvolvimento)
     - `https://app.luvbee.com/*` (produção)
     - `https://luvbee.com/*` (produção)
5. Em **API restrictions**:
   - Selecione **Restrict key**
   - Marque apenas:
     - Places API
     - Maps JavaScript API
     - Geocoding API
6. Configure **Quotas**:
   - Limite diário: 10.000 requisições/dia (ajustar conforme necessário)
   - Limite por minuto: 100 requisições/minuto

### Configurar Secret no Supabase (para Edge Function):
```bash
supabase secrets set GOOGLE_MAPS_API_KEY=sua-chave-aqui
```

> 🔐 **Gere sempre uma nova credencial no Google Cloud Console e revogue imediatamente qualquer chave anterior que tenha vazado (por exemplo, iniciada por `AIza`). Nunca versionar chaves em arquivos do repositório.**

---

## 4. Configuração de Storage (Supabase)

### Limite de Tamanho de Arquivo:
1. Acesse **Storage** > **Policies**
2. Para o bucket `profile-photos`:
   - Configure limite máximo de 5MB por arquivo
   - Use a política existente ou crie uma nova:

```sql
-- Política para upload de fotos de perfil
CREATE POLICY "profile_photos_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND octet_length(decode((storage.raw_headers())->>'content-length', 'base64')) <= 5242880 -- 5MB
  );
```

---

## 5. Configuração HSTS (Produção)

### No servidor de produção (ex: Vercel, Netlify):

**Vercel:**
Adicione no `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

**Netlify:**
Adicione no `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
```

---

## 6. Auditoria de Dependências

Execute regularmente:
```bash
npm audit
npm audit fix
```

Para verificar vulnerabilidades conhecidas.

---

## 7. Checklist de Deploy em Produção

Antes de fazer deploy, verifique:

- [ ] CORS configurado apenas para domínios permitidos
- [ ] Rate limiting configurado no Supabase
- [ ] Chave Google Maps API restrita por domínio e API
- [ ] Quotas configuradas na Google Cloud Console
- [ ] Secret `GOOGLE_MAPS_API_KEY` configurado no Supabase
- [ ] Edge Function `get-place-photo` deployada
- [ ] HSTS headers configurados no servidor
- [ ] CSP headers ativos (já implementado no `index.html`)
- [ ] Todas as migrações aplicadas no Supabase
- [ ] RLS habilitado em todas as tabelas críticas
- [ ] Políticas DELETE criadas para `location_matches` e `people_matches`
- [ ] CHECK constraints aplicadas no PostgreSQL
- [ ] Sanitização XSS implementada em todos os campos de texto
- [ ] Validação de autorização implementada em serviços críticos

---

## 8. Monitoramento Contínuo

### Logs a Monitorar:
1. **Supabase Dashboard** > **Logs**:
   - Erros 403 (RLS bloqueando acesso)
   - Erros 429 (Rate limiting)
   - Erros 500 (Erros do servidor)

2. **Google Cloud Console**:
   - Uso da API (quota)
   - Requisições suspeitas
   - Erros de autenticação

3. **Frontend (Sentry ou similar)**:
   - Erros de XSS bloqueados
   - Tentativas de acesso não autorizado
   - Erros de validação

---

## 9. Prevenção de Vazamento de Segredos no Git

1. Instale o pre-commit (requer Python):
   ```bash
   pip install pre-commit
   ```
2. Instale os hooks localmente após clonar o repositório:
   ```bash
   pre-commit install
   ```
3. Antes de commitar, os hooks verificam se existe algum padrão de chave do Google Maps (ex.: `AIza...`). O commit é bloqueado caso seja detectado, evitando novos vazamentos.

---

**Última atualização:** 2025-01-28

