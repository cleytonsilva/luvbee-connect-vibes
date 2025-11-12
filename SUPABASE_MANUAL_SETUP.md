# Configuração Manual do Supabase - Guia Rápido

## ✅ Status Atual

- ✅ **Conexão**: Configurada e funcionando
- ✅ **Banco de Dados**: Todas as 12 tabelas criadas
- ⚠️ **Storage**: Buckets precisam ser criados manualmente
- ⚠️ **Realtime**: Precisa ser habilitado nas tabelas

## 📦 1. Criar Buckets de Storage

### Via Dashboard:
1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
2. Clique em **"New bucket"**
3. Crie os seguintes buckets:

#### Bucket: `avatars`
- **Nome**: `avatars`
- **Público**: ✅ Sim
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

#### Bucket: `locations`
- **Nome**: `locations`
- **Público**: ✅ Sim
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

#### Bucket: `public`
- **Nome**: `public`
- **Público**: ✅ Sim
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`

## 🔔 2. Habilitar Realtime

### Via Dashboard:
1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/replication
2. Habilite Realtime para as seguintes tabelas:
   - ✅ `messages`
   - ✅ `people_matches`
   - ✅ `location_matches`
   - ✅ `chats`

### Via SQL Editor:
Execute o seguinte SQL no SQL Editor:

```sql
-- Habilitar Realtime para tabelas de mensagens e matches
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE people_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE location_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
```

## 🔒 3. Verificar RLS Policies

As políticas RLS já devem estar configuradas pela migração. Para verificar:

1. Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/auth/policies
2. Verifique se todas as tabelas têm políticas ativas

## ✅ 4. Testar Configuração

Após configurar tudo, execute:

```bash
npm run test:supabase
```

Deve mostrar:
- ✅ Autenticação OK
- ✅ Conexão com banco de dados OK
- ✅ Storage OK (com buckets listados)
- ✅ Realtime OK

## 📝 Scripts Disponíveis

- `npm run test:supabase` - Testa conexão completa
- `npm run db:check` - Verifica estrutura do banco
- `npm run setup:storage` - Tenta criar buckets (pode precisar de service key)
- `npm run setup:realtime` - Verifica status do Realtime

## 🔗 Links Úteis

- **Dashboard**: https://app.supabase.com/project/zgxtcawgllsnnernlgim
- **Storage**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
- **Replication**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/replication
- **SQL Editor**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
- **API Docs**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/api

## 🎯 Próximos Passos

Após completar a configuração manual:
1. ✅ Testar upload de imagens para os buckets
2. ✅ Testar Realtime com mensagens
3. ✅ Verificar autenticação completa
4. ✅ Iniciar desenvolvimento das features

