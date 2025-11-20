-- Fix filter_unmatched_locations to exclude user's rejected locations
-- Date: 2025-01-28
-- Description: Adiciona filtro para excluir locais rejeitados pelo usuário específico
-- Fix: Locais rejeitados pelo usuário não aparecem mais após atualizar a página

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
    user_rejected_place_ids AS (
        -- Locais rejeitados pelo usuário específico
        SELECT DISTINCT
            COALESCE(l.place_id, lr.location_id) AS place_id
        FROM location_rejections lr
        LEFT JOIN locations l ON (
            lr.location_id = l.id::TEXT
            OR lr.location_id = l.place_id
        )
        WHERE lr.user_id = p_user_id
          AND (
              lr.location_id = ANY(p_place_ids)
              OR EXISTS (
                  SELECT 1
                  FROM locations l2
                  WHERE l2.place_id = ANY(p_place_ids)
                    AND (lr.location_id = l2.id::TEXT OR lr.location_id = l2.place_id)
              )
          )
    ),
    rejected_locations AS (
        -- Locais com mais de 50% de rejeição global
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
        FROM user_rejected_place_ids urpi
        WHERE urpi.place_id = ipi.place_id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM rejected_locations rl
        WHERE rl.place_id = ipi.place_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION filter_unmatched_locations(UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION filter_unmatched_locations IS 'Filtra locais não correspondidos, excluindo: matches do usuário, locais rejeitados pelo usuário e locais com alta taxa de rejeição global (>=50%)';

