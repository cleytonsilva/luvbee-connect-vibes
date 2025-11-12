# Configuração do Supabase - Luvbee Connect Vibes

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_SERVICE_KEY=[service-key]

# Application Configuration
VITE_APP_NAME=Luvbee Connect Vibes
VITE_APP_URL=http://localhost:8080

# Google Maps API (opcional)
VITE_GOOGLE_MAPS_API_KEY=[google-maps-api-key]

# Environment
VITE_ENV=development
```

## Como Obter as Credenciais do Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `VITE_SUPABASE_SERVICE_KEY` (mantenha secreto!)

## Testando a Conexão

Após configurar as variáveis de ambiente, execute:

```bash
npm run test:supabase
```

Este script irá:
- ✅ Verificar autenticação
- ✅ Testar conexão com banco de dados
- ✅ Verificar Storage buckets
- ✅ Testar Realtime

## Estrutura do Banco de Dados

O projeto usa as seguintes tabelas principais:
- `users` - Usuários do sistema
- `user_preferences` - Preferências dos usuários
- `locations` - Locais/estabelecimentos
- `location_matches` - Matches de usuários com locais
- `people_matches` - Matches entre usuários
- `chats` - Conversas
- `messages` - Mensagens

## Migrações

As migrações SQL estão em `supabase/migrations/`. Para aplicar:

```bash
# Usando Supabase CLI
supabase db push

# Ou manualmente via SQL Editor no Dashboard
```

## Storage Buckets

Configure os seguintes buckets no Supabase Storage:
- `avatars` - Imagens de perfil (público)
- `locations` - Imagens de estabelecimentos (público)
- `public` - Assets públicos

## Row Level Security (RLS)

Todas as tabelas devem ter RLS habilitado. As políticas estão definidas em:
- `supabase/migrations/20250127000000_create_core_tables.sql`

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env.local` existe
- Confirme que as variáveis começam com `VITE_`
- Reinicie o servidor de desenvolvimento após criar/editar `.env.local`

### Erro: "Failed to fetch" ou CORS
- Verifique se a URL do Supabase está correta
- Confirme que o projeto está ativo no Dashboard
- Verifique as configurações de CORS no Supabase

### Erro: "RLS policy violation"
- Verifique se as políticas RLS estão configuradas corretamente
- Confirme que o usuário está autenticado (se necessário)
- Revise as políticas em `supabase/migrations/`

## Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [Guia de RLS](https://supabase.com/docs/guides/auth/row-level-security)

