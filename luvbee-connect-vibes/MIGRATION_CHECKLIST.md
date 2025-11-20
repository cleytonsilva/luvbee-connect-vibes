# ✅ Checklist de Migração - Supabase LuvBee

Use este checklist para garantir que tudo foi configurado corretamente.

## 📋 Checklist de Migração

### 1. Migração SQL ✅
- [ ] Acessei o SQL Editor do Supabase
- [ ] Executei o arquivo `supabase/migrations/20250127000000_create_core_tables.sql`
- [ ] Verifiquei que não houve erros
- [ ] Executei `npm run db:check` e todas as tabelas existem

### 2. Storage Buckets 📦
- [ ] Criei o bucket `avatars` (público, 5MB)
- [ ] Criei o bucket `locations` (público, 10MB)
- [ ] Criei o bucket `public` (público, 10MB)
- [ ] Verifiquei que os buckets aparecem no Dashboard

### 3. Realtime 🔔
- [ ] Executei o script `supabase/sql/enable-realtime.sql`
- [ ] Ou habilitei manualmente via Dashboard > Replication
- [ ] Verifiquei que as 4 tabelas estão habilitadas:
  - [ ] `messages`
  - [ ] `people_matches`
  - [ ] `location_matches`
  - [ ] `chats`

### 4. Verificação Final ✅
- [ ] Executei `npm run db:check` - todas as tabelas existem
- [ ] Executei `npm run test:supabase` - todos os testes passam
- [ ] Verifiquei RLS policies no Dashboard
- [ ] Testei autenticação na aplicação

## 🚀 Comandos Rápidos

```bash
# Verificar estrutura do banco
npm run db:check

# Verificar status completo da migração
npm run db:migrate

# Testar conexão completa
npm run test:supabase

# Verificar Storage
npm run setup:storage

# Verificar Realtime
npm run setup:realtime
```

## 📊 Status Esperado

Após completar tudo, você deve ver:

```
✅ Todas as tabelas estão criadas! (12/12)
✅ Todos os buckets estão criados! (3/3)
✅ Realtime habilitado! (4 tabelas)
✅ Autenticação OK
✅ Conexão com banco de dados OK
✅ Storage OK
✅ Realtime OK
```

## 🔗 Links Diretos

- **SQL Editor**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
- **Storage**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
- **Replication**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/replication
- **Policies**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/auth/policies

## ⚠️ Problemas Comuns

### "Tabela já existe"
- ✅ Normal, a migração usa `IF NOT EXISTS`
- Continue com os próximos passos

### "Permission denied"
- Verifique se está logado como admin
- Use SERVICE_KEY se necessário

### "Bucket já existe"
- ✅ Normal se você já criou antes
- Continue com os próximos passos

## 📝 Próximos Passos Após Migração

1. ✅ Testar autenticação completa
2. ✅ Testar upload de avatar
3. ✅ Testar criação de location_match
4. ✅ Testar Realtime com mensagens
5. ✅ Iniciar desenvolvimento das features

