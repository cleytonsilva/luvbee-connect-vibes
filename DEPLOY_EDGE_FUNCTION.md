# Deploy da Edge Function search-nearby expandida

## Passo a passo

### 1. Fazer backup da função atual
```bash
cd "C:\Users\LENOVO\Documents\Luvbee2"
copy supabase\functions\search-nearby\index.ts supabase\functions\search-nearby\index.ts.backup
```

### 2. Substituir pela versão expandida
```bash
copy "C:\Users\LENOVO\Documents\LUvbee-search-nearby-expandido.ts" supabase\functions\search-nearby\index.ts
```

### 3. Deploy
```bash
supabase functions deploy search-nearby
```

### 4. Verificar logs
```bash
supabase functions logs search-nearby --tail
```

### 5. Testar
Fazer uma requisição de teste:
```bash
curl -X POST "https://zgxtcawgllsnnernlgim.supabase.co/functions/v1/search-nearby" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"latitude": -23.5, "longitude": -46.6, "radius": 5000}'
```

## O que muda na nova versão

### Categorias expandidas:
- **Bares**: bar, pub, cocktail_bar, wine_bar, karaoke_bar, speakeasy
- **Baladas**: night_club, dance_hall, disco_club
- **Música**: live_music_venue, jazz_club, samba, forró, rock
- **Comédia**: comedy_club, stand up
- **Cultura**: museum, art_gallery, theater, cinema
- **Diversão**: bowling, pool_hall, escape_room

### Keywords brasileiras:
- buteco, boteco
- samba, pagode, forró, sertanejo
- stand up, bar de rock
- bar do zé

### Busca dupla:
1. Nearby Search (por tipos)
2. Text Search (por keywords)

### Filtros rigorosos:
- Rating >= 4.0
- Mínimo 10 reviews
- Status OPERATIONAL
- Deve ter fotos
- Deve ter endereço
