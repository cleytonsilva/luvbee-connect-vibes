-- Migration to clean up invalid locations with (0,0) coordinates
-- Created to fix data corruption caused by a bug in LocationService

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete locations that have exactly (0,0) coordinates and have a google_place_id
    -- This ensures we only delete automatically imported locations that are definitely wrong
    -- We exclude locations that might be manually created "city-wide" events if any (though unlikely to be exactly 0,0 with google_place_id)
    WITH deleted AS (
        DELETE FROM locations
        WHERE lat = 0 AND lng = 0
        AND google_place_id IS NOT NULL
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;

    RAISE NOTICE 'Deleted % locations with invalid (0,0) coordinates', deleted_count;
END $$;

