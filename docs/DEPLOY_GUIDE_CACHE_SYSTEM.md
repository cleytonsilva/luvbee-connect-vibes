# 🚀 Deploy Guide - Sistema de Cache Supabase

## Visão Rápida
Este guia fornece instruções passo-a-passo para deploy do sistema de cache de imagens Google Places usando Supabase.

## 📋 Checklist Pré-Deploy

- [ ] Node.js 18+ instalado
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Acesso ao projeto Supabase
- [ ] Google Places API key válida
- [ ] Variáveis de ambiente configuradas

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente
Crie o arquivo `.env.local` na raiz do projeto:

```env
# Google Maps
VITE_GOOGLE_MAPS_API_KEY=sua-chave-aqui

# Supabase (substitua com suas credenciais)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu-anon-key

# Ambiente
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

### 2. Autenticação Supabase CLI
```bash
# Faça login no Supabase
npx supabase login

# Link com seu projeto
npx supabase link --project-ref seu-project-ref
```

## 🎯 Deploy Passo-a-Passo

### Passo 1: Deploy das Edge Functions
```bash
# Deploy da função principal
echo "🚀 Deploy da Edge Function cache-place-photo..."
npx supabase functions deploy cache-place-photo --project-ref seu-project-ref

# Verificar status
echo "✅ Verificando deploy..."
npx supabase functions list
```

### Passo 2: Aplicar Migrações
```bash
# Aplicar migração do banco de dados
echo "📊 Aplicando migrações..."
npx supabase migration up

# Ou aplicar manualmente via SQL
echo "Executando SQL de migração..."
npx supabase db push
```

### Passo 3: Verificar Permissões
```bash
# Executar script de verificação
echo "🔒 Verificando permissões..."
node scripts/verify-permissions.js
```

### Passo 4: Testar Integração
```bash
# Executar testes de integração
echo "🧪 Executando testes..."
npm test src/__tests__/manual-cache-test.js
```

### Passo 5: Verificar Dashboard
```bash
# Iniciar aplicação local
echo "📱 Iniciando aplicação..."
npm run dev

# Acessar dashboard
echo "Dashboard disponível em: http://localhost:5173/dashboard/admin/cache"
```

## 📊 Verificação Pós-Deploy

### Testes Automatizados
Execute o script de verificação completa:

```bash
#!/bin/bash

echo "🔍 Verificação Pós-Deploy do Sistema de Cache"
echo "=============================================="

# Variáveis
SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

echo "🔗 Projeto: $PROJECT_REF"
echo "📍 URL: $SUPABASE_URL"
echo ""

# 1. Verificar Edge Function
echo "1️⃣ Verificando Edge Function..."
FUNCTION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/functions/v1/cache-place-photo" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"placeId":"test","photoReference":"test"}')

if [ "$FUNCTION_STATUS" -eq 200 ]; then
  echo "✅ Edge Function: FUNCIONANDO"
else
  echo "❌ Edge Function: FALHOU ($FUNCTION_STATUS)"
fi

# 2. Verificar Bucket
echo ""
echo "2️⃣ Verificando Bucket Storage..."
BUCKET_RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/storage/v1/bucket/div" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

if echo "$BUCKET_RESPONSE" | grep -q "id.*div"; then
  echo "✅ Bucket 'div': EXISTE"
else
  echo "❌ Bucket 'div': NÃO ENCONTRADO"
fi

# 3. Verificar Tabela
echo ""
echo "3️⃣ Verificando Tabela do Banco..."
TABLE_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/cached_place_photos" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"place_id":"test","photo_reference":"test","storage_path":"test","public_url":"test"}')

if [ $? -eq 0 ]; then
  echo "✅ Tabela 'cached_place_photos': ACESSÍVEL"
else
  echo "❌ Tabela 'cached_place_photos': FALHOU"
fi

# 4. Verificar Função SQL
echo ""
echo "4️⃣ Verificando Função SQL..."
FUNCTION_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/get_cached_photo_url" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"place_id_param":"test"}')

if [ $? -eq 0 ]; then
  echo "✅ Função 'get_cached_photo_url': EXISTE"
else
  echo "❌ Função 'get_cached_photo_url': FALHOU"
fi

echo ""
echo "🎉 Verificação Concluída!"
echo "Acesse o dashboard para monitoramento: ${SUPABASE_URL}/dashboard/admin/cache"
```

## 🔧 Comandos Úteis

### Deploy Rápido
```bash
# Script completo de deploy
npm run deploy:cache-system
```

### Verificação Manual
```bash
# Testar Edge Function
curl -X POST "${SUPABASE_URL}/functions/v1/cache-place-photo" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "photoReference": "Aap_uEA7vb0DDH9qGA7gu3n9CqAf1kBW0AEv1xVJqUoLqVd-L5nXw8bWvKJXXPpO2KrRdG8BFnzDfF1dxa3VqYb2gOh3B5n0fRTf2fBMdXYIoV",
    "maxWidth": 400
  }'
```

### Monitoramento
```bash
# Ver logs da Edge Function
npx supabase functions logs cache-place-photo --project-ref seu-project-ref

# Ver métricas do banco
npx supabase db stats --project-ref seu-project-ref
```

## 🚨 Troubleshooting Rápido

### Problema: Edge Function 404
```bash
# Verificar se está deployada
npx supabase functions list

# Redeploy se necessário
npx supabase functions deploy cache-place-photo --project-ref seu-project-ref
```

### Problema: Permissões Negadas
```bash
# Verificar RLS policies
npx supabase db dump --schema-only | grep -A 10 -B 5 "cached_place_photos"

# Reaplicar permissões
npx supabase db push --dry-run
```

### Problema: Bucket Não Encontrado
```bash
# Listar buckets
npx supabase storage list

# Criar bucket manualmente se necessário
npx supabase storage create-bucket div --public
```

## 📈 Performance Checklist

- [ ] Tempo de resposta do cache < 200ms
- [ ] Taxa de acerto > 80%
- [ ] Uso de storage < 100MB
- [ ] Erros < 1% das requisições
- [ ] Disponibilidade > 99%

## 🔐 Segurança

### Verificar Permissões
```sql
-- Executar no Supabase Dashboard
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated')
AND table_name = 'cached_place_photos';
```

### Auditoria de Acesso
```bash
# Ver logs de acesso
npx supabase audit list --project-ref seu-project-ref
```

## 🎯 Rollback (Se Necessário)

### Remover Edge Function
```bash
npx supabase functions delete cache-place-photo --project-ref seu-project-ref
```

### Reverter Migração
```bash
# Criar rollback manual
npx supabase migration new rollback-cache-system

# Adicionar SQL de reversão
```sql
-- Remover tabela
DROP TABLE IF EXISTS public.cached_place_photos;

-- Remover bucket
DELETE FROM storage.buckets WHERE id = 'div';

-- Remover função
DROP FUNCTION IF EXISTS public.get_cached_photo_url(TEXT);
```
```

### Restaurar Hook Original
```bash
# Reverter para versão sem cache
git checkout HEAD~1 -- src/hooks/usePlacePhoto.ts
```

## 📞 Suporte

### Recursos
- [Documentação Completa](./SUPABASE_CACHE_IMPLEMENTATION.md)
- [Changelog](./CHANGELOG_CACHE_SYSTEM.md)
- [Supabase Dashboard](https://supabase.com/dashboard/project/seu-project-ref)

### Contato
- **Equipe DevOps**: devops@esquads.com.br
- **Suporte Técnico**: suporte@esquads.com.br
- **Emergências**: +55 11 99999-9999

---

**Última Atualização:** 12 de janeiro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ **PRONTO PARA PRODUÇÃO**