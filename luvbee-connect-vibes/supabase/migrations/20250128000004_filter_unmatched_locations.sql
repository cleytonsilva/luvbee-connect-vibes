-- =============================================
-- Função para filtrar locais já curtidos pelo usuário
-- Retorna apenas place_ids que o usuário ainda não curtiu
-- =============================================

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
            -- Se location_id é UUID, buscar location correspondente
            lm.location_id = l.id::TEXT
            OR
            -- Se location_id já é place_id, usar diretamente
            lm.location_id = l.place_id
        )
        WHERE lm.user_id = p_user_id
          AND (
              -- location_id pode ser place_id diretamente
              lm.location_id = ANY(p_place_ids)
              OR
              -- location_id pode ser UUID de location que tem esse place_id
              EXISTS (
                  SELECT 1
                  FROM locations l2
                  WHERE l2.place_id = ANY(p_place_ids)
                    AND lm.location_id = l2.id::TEXT
              )
          )
          -- Considerar apenas matches ativos (se coluna status existir)
          AND (
              lm.status IS NULL 
              OR lm.status = 'active' 
              OR lm.status = 'accepted'
          )
    )
    SELECT ipi.place_id
    FROM input_place_ids ipi
    WHERE NOT EXISTS (
        SELECT 1
        FROM matched_place_ids mpi
        WHERE mpi.place_id = ipi.place_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION filter_unmatched_locations(UUID, TEXT[]) TO authenticated;


