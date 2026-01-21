-- Adicionar colunas necessárias à tabela locations existente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS google_place_id text UNIQUE,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS is_adult boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'google',
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Atualizar latitude/longitude a partir dos dados existentes
-- UPDATE public.locations 
-- SET latitude = lat::double precision, 
--    longitude = lng::double precision
-- WHERE latitude IS NULL AND longitude IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS locations_google_place_id_index ON public.locations (google_place_id);
CREATE INDEX IF NOT EXISTS locations_city_state_index ON public.locations (city, state);
CREATE INDEX IF NOT EXISTS locations_is_adult_index ON public.locations (is_adult);
CREATE INDEX IF NOT EXISTS locations_lat_lng_index ON public.locations (lat, lng);

-- 2. Tabela de Cache de Regiões (Para saber onde já buscamos)
create table if not exists public.search_cache_logs (
  id uuid default gen_random_uuid() primary key,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null,
  search_type text, -- 'normal' ou 'adult'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS search_cache_logs_location_index ON public.search_cache_logs (latitude, longitude);
CREATE INDEX IF NOT EXISTS search_cache_logs_created_index ON public.search_cache_logs (created_at);

-- 3. Função RPC para busca por raio (usando haversine simples)
create or replace function get_places_nearby(
  lat double precision,
  long double precision,
  radius_meters int,
  filter_adult boolean default false
)
returns setof locations
language sql
as $$
  select *
  from locations
  where (
    6371000 * acos(
      cos(radians(lat)) * cos(radians(lat)) * 
      cos(radians(lng) - radians(long)) + 
      sin(radians(lat)) * sin(radians(lat))
    )
  ) <= radius_meters
  and (is_adult = filter_adult OR is_adult IS NULL)
  order by (
    6371000 * acos(
      cos(radians(lat)) * cos(radians(lat)) * 
      cos(radians(lng) - radians(long)) + 
      sin(radians(lat)) * sin(radians(lat))
    )
  );
$$;

-- 4. Função para verificar cache recente
create or replace function check_search_cache(
  lat double precision,
  long double precision,
  radius_meters int,
  search_type text,
  max_age_days int default 30
)
returns boolean
language sql
as $$
  select exists(
    select 1
    from search_cache_logs
    where (
      6371000 * acos(
        cos(radians(lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(long)) + 
        sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= 500 -- 500m de tolerância
    and search_type = check_search_cache.search_type
    and created_at > now() - interval '1 day' * max_age_days
  );
$$;

-- 5. Função para busca por cidade/estado
create or replace function get_places_by_city_state(
  city_name text,
  state_name text,
  filter_adult boolean default false
)
returns setof locations
language sql
as $$
  select *
  from locations
  where lower(city) = lower(city_name)
  and lower(state) = lower(state_name)
  and (is_adult = filter_adult OR is_adult IS NULL)
  order by rating desc, name;
$$;

-- 6. Permissões RLS
alter table public.search_cache_logs enable row level security;

-- Políticas para search_cache_logs (leitura restrita, escrita por funções)
create policy "search_cache_logs_read_admin" on search_cache_logs
  for select using (auth.jwt() ->> 'role' = 'admin');

create policy "search_cache_logs_write_functions" on search_cache_logs
  for insert with check (true); -- Funções podem inserir

-- Grant permissions
grant select on search_cache_logs to authenticated;
grant insert on search_cache_logs to authenticated;