# Edge Function: create-location

Esta Edge Function permite que usuários autenticados criem locais no banco de dados, bypassando as políticas RLS que impedem INSERT direto na tabela `locations`.

## Deploy

```bash
supabase functions deploy create-location
```

## Variáveis de Ambiente

A Edge Function usa automaticamente as seguintes variáveis de ambiente do Supabase:
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role (bypass RLS)

## Uso

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-location`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: 'Nome do Local',
    address: 'Endereço completo',
    type: 'bar', // ou 'restaurant', 'night_club', etc.
    place_id: 'ChIJ...', // ID do Google Places (opcional)
    lat: -23.5505,
    lng: -46.6333,
    rating: 4.5,
    price_level: 2,
    image_url: 'https://...',
    peak_hours: [0, 0, 0, 0, 0], // Array de 5 elementos
    google_rating: 4.5,
    google_place_data: { ... },
  }),
})
```

## Resposta

- **200 OK**: Local criado ou já existente
- **400 Bad Request**: Dados inválidos ou campos obrigatórios faltando
- **401 Unauthorized**: Token inválido ou ausente
- **500 Internal Server Error**: Erro no servidor

