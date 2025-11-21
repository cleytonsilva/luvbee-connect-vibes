# 🚀 Aplicar Migração RLS - Guia Completo

## ⚠️ Situação Atual

Não há MCP (Model Context Protocol) disponível para Supabase neste ambiente. Por isso, vamos usar alternativas para aplicar a migração.

## ✅ Opções Disponíveis

### Opção 1: Via Supabase Dashboard (Recomendado e Mais Rápido)

1. **Acesse o SQL Editor do Supabase:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
   ```

2. **Execute o script para ver o SQL:**
   ```bash
   node scripts/apply-migration-rls.js
   ```

3. **Copie TODO o SQL** que aparecer no terminal

4. **Cole no SQL Editor** do Supabase Dashboard

5. **Clique em "Run"** para executar

6. **Verifique os resultados** - deve aparecer mensagens de sucesso ✅

### Opção 2: Via Supabase CLI (Se Instalado)

Se você tem o Supabase CLI instalado:

```bash
# Instalar Supabase CLI (se necessário)
npm install -g supabase

# Login no Supabase
supabase login

# Linkar ao projeto
supabase link --project-ref zgxtcawgllsnnernlgim

# Aplicar todas as migrações pendentes
supabase db push

# Ou aplicar apenas esta migração específica
supabase migration up
```

### Opção 3: Executar Script Node.js

```bash
# Mostrar SQL para copiar
node scripts/apply-migration-rls.js

# Ou tentar aplicar via API (requer SERVICE_ROLE_KEY)
npm run db:migrate
```

## 📋 O Que a Migração Faz

Esta migração corrige os erros de RLS no onboarding:

1. ✅ **Cria o bucket `avatars`** se não existir
2. ✅ **Configura políticas RLS** para o bucket `avatars`:
   - Leitura pública
   - Upload apenas para usuários autenticados
   - Apenas em pastas com o próprio `user_id`
3. ✅ **Cria política de upsert** para `user_preferences`
4. ✅ **Verifica** se tudo foi criado corretamente

## 🔍 Verificação Após Aplicar

Após aplicar a migração, verifique:

### 1. Bucket avatars existe:
```sql
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

### 2. Políticas RLS estão ativas:
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%avatars%';
```

### 3. Política de upsert para user_preferences:
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_preferences' 
AND policyname = 'user_preferences_upsert_own';
```

## 🧪 Testar Após Aplicar

1. Faça login na aplicação
2. Complete o onboarding:
   - Upload de foto ✅
   - Preencher bio, idade, cidade ✅
   - Selecionar preferências ✅
   - Finalizar ✅
3. Verifique se não há erros no console

## ⚠️ Troubleshooting

### Erro: "bucket already exists"
- ✅ Normal! A migração usa `ON CONFLICT DO NOTHING`
- Continue executando o resto da migração

### Erro: "policy already exists"
- ✅ Normal! A migração usa `DROP POLICY IF EXISTS`
- Continue executando o resto da migração

### Erro: "permission denied"
- Verifique se você tem permissões de administrador no projeto
- Verifique se está logado no Supabase Dashboard

## 📝 Notas Importantes

- ⚠️ **Backup**: A migração é segura e idempotente (pode ser executada múltiplas vezes)
- ✅ **Segurança**: As políticas RLS garantem que usuários só podem acessar seus próprios dados
- ✅ **Compatibilidade**: A migração não quebra funcionalidades existentes

## 🔗 Links Úteis

- **SQL Editor**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
- **Storage Buckets**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
- **Database Policies**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/policies

---

**Recomendação**: Use a **Opção 1 (Supabase Dashboard)** - é a mais rápida e confiável! 🚀

