-- Migration: Support Events and Scraping Source
-- Date: 2025-02-19
-- Description: Adds columns to locations table to support temporal events and scraping metadata

ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS event_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ticket_url TEXT,
ADD COLUMN IF NOT EXISTS source_id TEXT, -- Ex: 'sympla_12345', 'google_ChIJ...'
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_locations_event_date ON public.locations(event_start_date);
CREATE INDEX IF NOT EXISTS idx_locations_source_id ON public.locations(source_id);

COMMENT ON COLUMN public.locations.event_start_date IS 'Start date/time for temporal events';
COMMENT ON COLUMN public.locations.source_id IS 'Unique identifier from the source (e.g. Google Place ID or Event ID)';
