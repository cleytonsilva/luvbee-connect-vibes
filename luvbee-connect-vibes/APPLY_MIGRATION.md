# Como Aplicar a Migração get_nearby_locations

## Problema
O erro "Failed to get nearby locations" ocorre porque a função RPC `get_nearby_locations` não existe no banco de dados Supabase.

## Solução

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo `supabase/migrations/20250128000000_add_get_nearby_locations_function.sql`
5. Copie todo o conteúdo do arquivo
6. Cole no SQL Editor
7. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

```bash
# No diretório do projeto
cd luvbee-connect-vibes

# Se você tem Supabase CLI instalado localmente
supabase db push

# Ou aplicar a migração específica
supabase migration up
```

### Opção 3: Via SQL direto

Execute o SQL abaixo no SQL Editor do Supabase:

```sql
-- Function: Get nearby locations within a radius
CREATE OR REPLACE FUNCTION get_nearby_locations(
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name VARCHAR(200),
  category VARCHAR(50),
  type VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  images TEXT[],
  photo_url TEXT,
  description TEXT,
  phone VARCHAR(20),
  website TEXT,
  rating DECIMAL(3, 2),
  price_level INTEGER,
  opening_hours JSONB,
  google_places_data JSONB,
  owner_id UUID,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  is_curated BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  distance_meters DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.google_place_id,
    l.name,
    l.category,
    l.type,
    l.address,
    l.latitude,
    l.longitude,
    l.images,
    l.photo_url,
    l.description,
    l.phone,
    l.website,
    l.rating,
    l.price_level,
    l.opening_hours,
    l.google_places_data,
    l.owner_id,
    l.is_active,
    l.is_verified,
    l.is_curated,
    l.created_at,
    l.updated_at,
    l.last_synced_at,
    -- Haversine formula to calculate distance in meters
    (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(lng)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    )::DECIMAL(10, 2) AS distance_meters
  FROM public.locations l
  WHERE 
    l.is_active = TRUE
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    -- Pre-filter using bounding box for performance
    AND l.latitude BETWEEN lat - (radius_meters::DECIMAL / 111000.0) AND lat + (radius_meters::DECIMAL / 111000.0)
    AND l.longitude BETWEEN lng - (radius_meters::DECIMAL / (111000.0 * cos(radians(lat)))) AND lng + (radius_meters::DECIMAL / (111000.0 * cos(radians(lat))))
    -- Exact distance check using Haversine
    AND (
      6371000 * acos(
        LEAST(1.0, 
          cos(radians(lat)) * 
          cos(radians(l.latitude::DECIMAL)) * 
          cos(radians(l.longitude::DECIMAL) - radians(lng)) + 
          sin(radians(lat)) * 
          sin(radians(l.latitude::DECIMAL))
        )
      )
    ) <= radius_meters
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_locations(DECIMAL, DECIMAL, INTEGER) TO anon;
```

## Verificação

Após aplicar a migração, verifique se a função foi criada:

```sql
SELECT proname, proargnames, prorettype 
FROM pg_proc 
WHERE proname = 'get_nearby_locations';
```

## Teste

Teste a função com coordenadas de exemplo:

```sql
SELECT * FROM get_nearby_locations(-23.5505, -46.6333, 5000);
-- Coordenadas de exemplo: São Paulo, Brasil
```

## Notas

- A função usa a fórmula de Haversine para calcular distâncias precisas
- Inclui um pré-filtro usando bounding box para melhor performance
- Retorna a distância em metros junto com os dados do local
- Ordena os resultados por distância (mais próximo primeiro)

