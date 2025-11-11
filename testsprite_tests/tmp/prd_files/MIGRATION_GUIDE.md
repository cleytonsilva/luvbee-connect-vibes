# 🚀 Guia Completo de Migração - Supabase LuvBee

## 📋 Pré-requisitos

1. ✅ Variáveis de ambiente configuradas no `.env.local`
2. ✅ Acesso ao Dashboard do Supabase
3. ✅ Permissões de administrador no projeto

## 🔍 Passo 1: Verificar Estado Atual

Execute para verificar o que já está configurado:

```bash
npm run db:check
```

Isso mostrará quais tabelas já existem.

## 📦 Passo 2: Aplicar Migração SQL

### Opção A: Via SQL Editor (Recomendado)

1. **Acesse o SQL Editor:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
   ```

2. **Abra o arquivo de migração:**
   ```
   supabase/migrations/20250127000000_create_core_tables.sql
   ```

3. **Copie TODO o conteúdo** do arquivo

4. **Cole no SQL Editor** e clique em **"Run"**

5. **Aguarde a execução** (pode levar alguns segundos)

6. **Verifique se houve erros** na aba "Results"

### Opção B: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref zgxtcawgllsnnernlgim

# Aplicar migrations
supabase db push
```

## ✅ Passo 3: Verificar Migração

Após aplicar a migração, execute:

```bash
npm run db:check
```

Deve mostrar:
```
✅ Todas as tabelas estão criadas!
```

## 📦 Passo 4: Criar Buckets de Storage

### Via Dashboard:

1. **Acesse Storage:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
   ```

2. **Clique em "New bucket"** e crie:

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

### Via Script (se tiver SERVICE_KEY):

```bash
npm run setup:storage
```

## 🔔 Passo 5: Habilitar Realtime

### Via SQL Editor:

1. **Acesse o SQL Editor:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
   ```

2. **Execute o script:**
   ```sql
   -- Habilitar Realtime para mensagens
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   
   -- Habilitar Realtime para matches de pessoas
   ALTER PUBLICATION supabase_realtime ADD TABLE people_matches;
   
   -- Habilitar Realtime para matches de locais
   ALTER PUBLICATION supabase_realtime ADD TABLE location_matches;
   
   -- Habilitar Realtime para chats
   ALTER PUBLICATION supabase_realtime ADD TABLE chats;
   ```

3. **Verificar tabelas habilitadas:**
   ```sql
   SELECT 
     schemaname,
     tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
   ORDER BY tablename;
   ```

### Via Dashboard:

1. **Acesse Replication:**
   ```
   https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/replication
   ```

2. **Habilite Realtime para:**
   - ✅ `messages`
   - ✅ `people_matches`
   - ✅ `location_matches`
   - ✅ `chats`

## ✅ Passo 6: Teste Final

Execute o teste completo:

```bash
npm run test:supabase
```

Deve mostrar:
- ✅ Autenticação OK
- ✅ Conexão com banco de dados OK
- ✅ Storage OK (com buckets listados)
- ✅ Realtime OK

## 📊 O que a Migração Cria

### Estrutura Completa:

- **12 Tabelas** com todas as colunas necessárias
- **Extensões**: uuid-ossp, postgis, pgcrypto
- **50+ Índices** para otimização
- **4 Funções** PostgreSQL customizadas
- **6 Triggers** automáticos
- **30+ RLS Policies** de segurança
- **Dados iniciais** (location_categories)

## 🔒 Segurança (RLS)

Todas as tabelas têm Row Level Security habilitado:

- ✅ Usuários só podem ver/editar seus próprios dados
- ✅ Matches só visíveis para os usuários envolvidos
- ✅ Mensagens protegidas por chat
- ✅ Locais públicos, mas edição restrita

## 🐛 Troubleshooting

### Erro: "relation already exists"
- ✅ Normal se a tabela já existe
- A migração usa `CREATE TABLE IF NOT EXISTS`

### Erro: "permission denied"
- Verifique se está usando SERVICE_KEY no SQL Editor
- Ou use o Dashboard com permissões de admin

### Erro: "extension does not exist"
- Execute manualmente:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "postgis";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```

## 📚 Próximos Passos

Após completar a migração:

1. ✅ Testar autenticação completa
2. ✅ Testar upload de imagens
3. ✅ Testar Realtime com mensagens
4. ✅ Iniciar desenvolvimento das features

## 🔗 Links Úteis

- **Dashboard**: https://app.supabase.com/project/zgxtcawgllsnnernlgim
- **SQL Editor**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
- **Storage**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/storage/buckets
- **Replication**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/database/replication
- **API Docs**: https://app.supabase.com/project/zgxtcawgllsnnernlgim/api
