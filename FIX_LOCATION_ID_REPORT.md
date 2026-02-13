# Correção do Erro location_id NOT NULL

## Resumo do Problema
O app mobile estava tentando salvar likes/passes na tabela `user_locations`, mas recebia erro:
```
null value in column "location_id" violates not-null constraint
```

## Causa Raiz
A tabela `user_locations` tinha uma coluna `location_id` com constraint `NOT NULL`, mas o código estava enviando apenas `google_place_id` (do Google Places API), não o `location_id` (UUID da tabela `locations`).

## Solução Implementada

### 1. Estrutura da Tabela Corrigida
**Arquivo:** `supabase/migrations/20250130000010_fix_user_locations_structure.sql`

- Removeu a constraint `NOT NULL` da coluna `location_id`
- Adicionou coluna `google_place_id` (TEXT) para armazenar o ID do Google Places
- Adicionou coluna `place_data` (JSONB) para cache dos dados do lugar
- Criou índices para performance
- Habilitou RLS com políticas de segurança
- Adicionou trigger para sincronização automática de `location_id`

### 2. Edge Function Atualizada
**Arquivo:** `supabase/functions/save-user-location/index.ts`

Agora a Edge Function:
1. **Busca** o location na tabela `locations` pelo `google_place_id`
2. Se não existir, **cria** um novo location com os dados do Google Places
3. **Salva** na `user_locations` com o `location_id` correto (ou NULL se não conseguir)
4. Se for um `like`, também cria um registro em `location_matches`

### 3. Código Mobile
**Arquivo:** `mobile/src/services/locationService.ts`

Não precisou de alterações - já estava enviando os dados corretos:
- `user_id`
- `google_place_id`
- `status` (liked/passed)
- `place_data` (dados completos do lugar)

## Estrutura Final da Tabela user_locations

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | UUID | NO | PK auto-generado |
| user_id | UUID | NO | FK para users |
| location_id | UUID | **YES** | FK para locations (pode ser NULL) |
| google_place_id | TEXT | YES | ID do Google Places |
| status | VARCHAR | NO | liked, passed, saved |
| place_data | JSONB | YES | Cache dos dados do lugar |
| created_at | TIMESTAMPTZ | NO | Data de criação |
| updated_at | TIMESTAMPTZ | NO | Data de atualização |

## Deploy Realizado

✅ **Edge Function:** `save-user-location` deployada com sucesso
- URL: https://zgxtcawgllsnnernlgim.supabase.co/functions/v1/save-user-location

⏳ **Migração SQL:** Necessário executar manualmente
- Arquivo: `fix_user_locations_manual.sql`
- Local: SQL Editor no Supabase Dashboard

## Como Testar

### 1. Executar a Migração SQL
1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/zgxtcawgllsnnernlgim
2. Vá em "SQL Editor"
3. Cole o conteúdo de `fix_user_locations_manual.sql`
4. Execute o script

### 2. Testar a Edge Function (curl)
```bash
curl -X POST \
  https://zgxtcawgllsnnernlgim.supabase.co/functions/v1/save-user-location \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<USER_UUID>",
    "google_place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "status": "liked",
    "place_data": {
      "name": "Test Location",
      "formatted_address": "123 Test St",
      "geometry": {
        "location": { "lat": -23.5, "lng": -46.6 }
      }
    }
  }'
```

### 3. Testar pelo App Mobile
1. Abra o app
2. Navegue até a tela de descoberta de lugares
3. Dê like ou pass em algum lugar
4. Verifique no console se não há mais erro de "null value in column location_id"

### 4. Verificar no Banco
```sql
-- Verificar se os registros foram salvos corretamente
SELECT 
    ul.id,
    ul.user_id,
    ul.google_place_id,
    ul.location_id,
    ul.status,
    l.name as location_name
FROM user_locations ul
LEFT JOIN locations l ON l.id = ul.location_id
ORDER BY ul.created_at DESC
LIMIT 10;
```

## Fluxo de Dados Atual

```
App Mobile
    ↓ (like/pass)
locationService.ts
    ↓ {user_id, google_place_id, status, place_data}
Edge Function: save-user-location
    ↓
1. Busca location pelo google_place_id
2. Se não existir, cria novo location
    ↓
Salva em user_locations (com location_id ou NULL)
    ↓
Se for 'liked', também cria location_match
```

## Vantagens da Nova Solução

1. **Resiliente:** Funciona mesmo se não conseguir criar o location
2. **Sincronização automática:** Trigger atualiza location_id quando o location for criado depois
3. **Cache:** place_data armazena dados do Google Places para acesso rápido
4. **Integridade:** Mantém relação com tabela locations quando possível

## Próximos Passos (Opcional)

1. Criar um job periódico para sincronizar registros com location_id = NULL
2. Migrar dados antigos se necessário
3. Monitorar erros na Edge Function através dos logs do Supabase
