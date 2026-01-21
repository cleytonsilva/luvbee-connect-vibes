-- =============================================
-- FIX VIBELOCAL: Database Schema Verification and Fixes
-- =============================================
-- Data: 2026-01-09
-- Descrição: Garante que todas as colunas necessárias existem na tabela locations
--            e cria as tabelas location_matches e location_rejections
-- =============================================

BEGIN;

-- =============================================
-- 1. VERIFICAR E ADICIONAR COLUNAS NA TABELA LOCATIONS
-- =============================================

-- Adicionar place_id se não existir (chave do Google Places)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Adicionar lat/lng separados (já existem, mas garantir)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Adicionar price_level (1-4, níveis de preço do Google)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS price_level INT CHECK (price_level >= 1 AND price_level <= 4);

-- Adicionar city e state (para filtros e busca)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Adicionar google_place_data (armazenar JSON completo do Google)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS google_place_data JSONB;

-- Adicionar google_rating e google_user_ratings_total
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(3,2) CHECK (google_rating >= 0 AND google_rating <= 5),
ADD COLUMN IF NOT EXISTS google_user_ratings_total INT;

-- Adicionar campos de eventos
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS event_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ticket_url TEXT;

-- Adicionar features (JSONB para recursos como serves_wine, live_music, etc)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS features JSONB;

-- Adicionar type (além de category, para compatibilidade)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Garantir que is_active existe e tem default true
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Se a coluna 'category' existisse, copiaríamos. Como pode não existir, comentamos.
-- UPDATE public.locations 
-- SET type = category 
-- WHERE type IS NULL AND category IS NOT NULL;

-- =============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índice único para place_id (evitar duplicatas do Google Places)
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_place_id_unique 
ON public.locations(place_id) 
WHERE place_id IS NOT NULL;

-- Índice composto para lat/lng (queries geoespaciais)
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng 
ON public.locations(lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Índice composto para city/state (filtros por localização)
CREATE INDEX IF NOT EXISTS idx_locations_city_state 
ON public.locations(city, state) 
WHERE city IS NOT NULL;

-- Índice para eventos (ordenar por data)
CREATE INDEX IF NOT EXISTS idx_locations_event_date 
ON public.locations(event_start_date) 
WHERE event_start_date IS NOT NULL;

-- Índice para is_active (filtrar apenas ativos)
CREATE INDEX IF NOT EXISTS idx_locations_is_active 
ON public.locations(is_active) 
WHERE is_active = true;

-- Índice GIN para google_place_data (queries em JSONB)
CREATE INDEX IF NOT EXISTS idx_locations_google_place_data 
ON public.locations USING GIN(google_place_data);

-- Índice para type (filtros por tipo de local)
CREATE INDEX IF NOT EXISTS idx_locations_type 
ON public.locations(type) 
WHERE type IS NOT NULL;

-- =============================================
-- 3. CRIAR TABELA LOCATION_MATCHES
-- =============================================

CREATE TABLE IF NOT EXISTS public.location_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL, -- Pode ser UUID ou place_id
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'accepted')),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Ensure columns exist
ALTER TABLE public.location_matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.location_matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para location_matches
CREATE INDEX IF NOT EXISTS idx_location_matches_user 
ON public.location_matches(user_id);

CREATE INDEX IF NOT EXISTS idx_location_matches_location 
ON public.location_matches(location_id);

CREATE INDEX IF NOT EXISTS idx_location_matches_status 
ON public.location_matches(status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_location_matches_created 
ON public.location_matches(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_location_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS location_matches_updated_at_trigger ON public.location_matches;
CREATE TRIGGER location_matches_updated_at_trigger
    BEFORE UPDATE ON public.location_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_location_matches_updated_at();

-- =============================================
-- 4. CRIAR TABELA LOCATION_REJECTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS public.location_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL, -- Pode ser UUID ou place_id
  rejected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Ensure columns exist
ALTER TABLE public.location_rejections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para location_rejections
CREATE INDEX IF NOT EXISTS idx_location_rejections_user 
ON public.location_rejections(user_id);

CREATE INDEX IF NOT EXISTS idx_location_rejections_location 
ON public.location_rejections(location_id);

CREATE INDEX IF NOT EXISTS idx_location_rejections_created 
ON public.location_rejections(created_at DESC);

-- =============================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.location_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_rejections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para location_matches
DROP POLICY IF EXISTS "location_matches_own_select" ON public.location_matches;
CREATE POLICY "location_matches_own_select" ON public.location_matches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_matches_own_insert" ON public.location_matches;
CREATE POLICY "location_matches_own_insert" ON public.location_matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_matches_own_update" ON public.location_matches;
CREATE POLICY "location_matches_own_update" ON public.location_matches
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_matches_own_delete" ON public.location_matches;
CREATE POLICY "location_matches_own_delete" ON public.location_matches
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para location_rejections
DROP POLICY IF EXISTS "location_rejections_own_select" ON public.location_rejections;
CREATE POLICY "location_rejections_own_select" ON public.location_rejections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_rejections_own_insert" ON public.location_rejections;
CREATE POLICY "location_rejections_own_insert" ON public.location_rejections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_rejections_own_delete" ON public.location_rejections;
CREATE POLICY "location_rejections_own_delete" ON public.location_rejections
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. GARANTIR VALORES PADRÃO PARA is_active
-- =============================================

-- Atualizar locais existentes sem is_active para true
UPDATE public.locations 
SET is_active = true 
WHERE is_active IS NULL;

-- Garantir que o default está definido
ALTER TABLE public.locations 
ALTER COLUMN is_active SET DEFAULT true;

-- =============================================
-- 7. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================

COMMENT ON COLUMN public.locations.place_id IS 'Google Places ID único';
COMMENT ON COLUMN public.locations.price_level IS 'Nível de preço do Google (1-4)';
COMMENT ON COLUMN public.locations.city IS 'Cidade do local';
COMMENT ON COLUMN public.locations.state IS 'Estado/UF do local';
COMMENT ON COLUMN public.locations.google_place_data IS 'Dados completos do Google Places (JSON)';
COMMENT ON COLUMN public.locations.google_rating IS 'Rating do Google (0-5)';
COMMENT ON COLUMN public.locations.google_user_ratings_total IS 'Total de avaliações no Google';
COMMENT ON COLUMN public.locations.event_start_date IS 'Data de início do evento';
COMMENT ON COLUMN public.locations.event_end_date IS 'Data de término do evento';
COMMENT ON COLUMN public.locations.ticket_url IS 'URL para compra de ingressos';
COMMENT ON COLUMN public.locations.features IS 'Recursos do local (serves_wine, live_music, etc)';
COMMENT ON COLUMN public.locations.type IS 'Tipo do local (bar, restaurant, club, etc)';

COMMENT ON TABLE public.location_matches IS 'Matches de usuários com locais (likes)';
COMMENT ON TABLE public.location_rejections IS 'Rejeições de usuários a locais (dislikes)';

COMMIT;

-- =============================================
-- VERIFICAÇÃO (EXECUTAR MANUALMENTE PARA TESTAR)
-- =============================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'locations' 
-- ORDER BY ordinal_position;
--
-- SELECT * FROM information_schema.tables 
-- WHERE table_name IN ('location_matches', 'location_rejections');
