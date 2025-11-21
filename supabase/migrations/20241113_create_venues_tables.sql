-- 1. Tabela Principal de Locais (Venues)
create table if not exists public.venues (
  id uuid default gen_random_uuid() primary key,
  google_place_id text unique, -- Para evitar duplicatas do Google
  name text not null,
  description text,
  address text,
  city text,
  state text,
  latitude double precision not null,
  longitude double precision not null,
  category text not null, -- ex: 'bar', 'club', 'swing_club', 'prive'
  is_adult boolean default false, -- True para modo Solo/Swing
  photos text[], -- Array de URLs
  source text default 'google', -- 'google' ou 'manual'
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index para performance
CREATE INDEX IF NOT EXISTS venues_city_state_index ON public.venues (city, state);
CREATE INDEX IF NOT EXISTS venues_google_place_id_index ON public.venues (google_place_id);
CREATE INDEX IF NOT EXISTS venues_category_index ON public.venues (category);
CREATE INDEX IF NOT EXISTS venues_is_adult_index ON public.venues (is_adult);
CREATE INDEX IF NOT EXISTS venues_lat_lng_index ON public.venues (latitude, longitude);

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
returns setof venues
language sql
as $$
  select *
  from venues
  where (
    6371000 * acos(
      cos(radians(lat)) * cos(radians(latitude)) * 
      cos(radians(longitude) - radians(long)) + 
      sin(radians(lat)) * sin(radians(latitude))
    )
  ) <= radius_meters
  and is_adult = filter_adult
  order by (
    6371000 * acos(
      cos(radians(lat)) * cos(radians(latitude)) * 
      cos(radians(longitude) - radians(long)) + 
      sin(radians(lat)) * sin(radians(latitude))
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

-- 5. Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_venues_updated_at
  before update on venues
  for each row
  execute function update_updated_at_column();

-- 6. Permissões RLS
alter table public.venues enable row level security;
alter table public.search_cache_logs enable row level security;

-- Políticas para venues (leitura pública, escrita restrita)
create policy "venues_read_public" on venues
  for select using (true);

create policy "venues_write_admin" on venues
  for all using (auth.jwt() ->> 'role' = 'admin');

-- Políticas para search_cache_logs (leitura restrita, escrita por funções)
create policy "search_cache_logs_read_admin" on search_cache_logs
  for select using (auth.jwt() ->> 'role' = 'admin');

create policy "search_cache_logs_write_functions" on search_cache_logs
  for insert with check (true); -- Funções podem inserir

-- 7. Grant permissions
grant select on venues to anon, authenticated;
grant insert, update, delete on venues to authenticated;
grant select on search_cache_logs to authenticated;
grant insert on search_cache_logs to authenticated;