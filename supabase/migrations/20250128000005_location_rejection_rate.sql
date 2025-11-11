-- =============================================
-- Sistema de Taxa de Rejeição de Locais
-- Locais com mais de 50% de rejeição são removidos da amostragem
-- =============================================

-- Tabela para rastrear rejeições explicitamente
CREATE TABLE IF NOT EXISTS public.location_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id TEXT NOT NULL, -- Pode ser UUID ou place_id
    rejected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, location_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_location_rejections_location ON public.location_rejections(location_id);
CREATE INDEX IF NOT EXISTS idx_location_rejections_user ON public.location_rejections(user_id);

-- Função simplificada para calcular taxa de rejeição de um local
CREATE OR REPLACE FUNCTION get_location_rejection_rate(p_location_id TEXT)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    total_interactions INTEGER;
    total_rejections INTEGER;
    rejection_rate DECIMAL(5, 2);
BEGIN
    -- Contar total de interações (likes + rejeições)
    -- Considera location_id como UUID ou place_id
    SELECT COUNT(DISTINCT user_id)
    INTO total_interactions
    FROM (
        -- Likes (matches ativos)
        SELECT user_id FROM location_matches 
        WHERE (
            location_id = p_location_id
            OR EXISTS (
                SELECT 1 FROM locations l 
                WHERE (l.id::TEXT = location_matches.location_id OR l.place_id = location_matches.location_id)
                  AND (l.id::TEXT = p_location_id OR l.place_id = p_location_id)
            )
        )
        AND (status IS NULL OR status = 'active' OR status = 'accepted')
        
        UNION
        
        -- Rejeições explícitas
        SELECT user_id FROM location_rejections 
        WHERE location_id = p_location_id
          OR EXISTS (
              SELECT 1 FROM locations l 
              WHERE (l.id::TEXT = location_rejections.location_id OR l.place_id = location_rejections.location_id)
                AND (l.id::TEXT = p_location_id OR l.place_id = p_location_id)
          )
        
        UNION
        
        -- Matches inativos (rejeições implícitas)
        SELECT user_id FROM location_matches 
        WHERE (
            location_id = p_location_id
            OR EXISTS (
                SELECT 1 FROM locations l 
                WHERE (l.id::TEXT = location_matches.location_id OR l.place_id = location_matches.location_id)
                  AND (l.id::TEXT = p_location_id OR l.place_id = p_location_id)
            )
        )
        AND status = 'inactive'
    ) AS all_interactions;
    
    -- Contar rejeições
    SELECT COUNT(DISTINCT user_id)
    INTO total_rejections
    FROM (
        -- Rejeições explícitas
        SELECT user_id FROM location_rejections 
        WHERE location_id = p_location_id
          OR EXISTS (
              SELECT 1 FROM locations l 
              WHERE (l.id::TEXT = location_rejections.location_id OR l.place_id = location_rejections.location_id)
                AND (l.id::TEXT = p_location_id OR l.place_id = p_location_id)
          )
        
        UNION
        
        -- Matches inativos
        SELECT user_id FROM location_matches 
        WHERE (
            location_id = p_location_id
            OR EXISTS (
                SELECT 1 FROM locations l 
                WHERE (l.id::TEXT = location_matches.location_id OR l.place_id = location_matches.location_id)
                  AND (l.id::TEXT = p_location_id OR l.place_id = p_location_id)
            )
        )
        AND status = 'inactive'
    ) AS rejections;
    
    -- Calcular taxa de rejeição
    IF total_interactions = 0 THEN
        RETURN 0;
    END IF;
    
    rejection_rate := (total_rejections::DECIMAL / total_interactions::DECIMAL) * 100;
    RETURN rejection_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função atualizada para filtrar locais rejeitados por 50%+ dos usuários
CREATE OR REPLACE FUNCTION filter_unmatched_locations(
    p_user_id UUID,
    p_place_ids TEXT[]
)
RETURNS TABLE(place_id TEXT) AS $$
BEGIN
    RETURN QUERY
    WITH input_place_ids AS (
        SELECT unnest(p_place_ids) AS place_id
    ),
    matched_place_ids AS (
        SELECT DISTINCT
            COALESCE(l.place_id, lm.location_id) AS place_id
        FROM location_matches lm
        LEFT JOIN locations l ON (
            lm.location_id = l.id::TEXT
            OR lm.location_id = l.place_id
        )
        WHERE lm.user_id = p_user_id
          AND (
              lm.location_id = ANY(p_place_ids)
              OR EXISTS (
                  SELECT 1
                  FROM locations l2
                  WHERE l2.place_id = ANY(p_place_ids)
                    AND lm.location_id = l2.id::TEXT
              )
          )
          AND (
              lm.status IS NULL 
              OR lm.status = 'active' 
              OR lm.status = 'accepted'
          )
    ),
    rejected_locations AS (
        -- Locais com mais de 50% de rejeição
        SELECT DISTINCT ipi.place_id
        FROM input_place_ids ipi
        WHERE get_location_rejection_rate(ipi.place_id) >= 50.0
    )
    SELECT ipi.place_id
    FROM input_place_ids ipi
    WHERE NOT EXISTS (
        SELECT 1
        FROM matched_place_ids mpi
        WHERE mpi.place_id = ipi.place_id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM rejected_locations rl
        WHERE rl.place_id = ipi.place_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION filter_unmatched_locations(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_rejection_rate(TEXT) TO authenticated;

-- RLS para location_rejections
ALTER TABLE public.location_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_rejections_select_own" ON public.location_rejections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "location_rejections_insert_own" ON public.location_rejections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
