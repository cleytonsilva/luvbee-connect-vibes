-- =============================================
-- BACKUP SCRIPT - EXECUTAR ANTES DAS MIGRAÇÕES
-- =============================================
-- Data: 2025-11-20
-- Descrição: Cria backups das tabelas críticas antes da migração
-- =============================================

BEGIN;

-- Criar schema de backup se não existir
CREATE SCHEMA IF NOT EXISTS backup_20251120;

-- Backup da tabela locations
CREATE TABLE backup_20251120.locations AS 
SELECT * FROM public.locations;

-- Backup da tabela user_preferences
CREATE TABLE backup_20251120.user_preferences AS 
SELECT * FROM public.user_preferences;

-- Backup das funções existentes
CREATE TABLE backup_20251120.functions_backup AS 
SELECT 
    proname as function_name,
    prosrc as function_source,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('get_places_nearby', 'get_nearby_locations');

-- Backup das tabelas de georreferenciamento (se existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'br_states') THEN
        EXECUTE 'CREATE TABLE backup_20251120.br_states AS SELECT * FROM public.br_states';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'neighborhoods') THEN
        EXECUTE 'CREATE TABLE backup_20251120.neighborhoods AS SELECT * FROM public.neighborhoods';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_hashes') THEN
        EXECUTE 'CREATE TABLE backup_20251120.location_hashes AS SELECT * FROM public.location_hashes';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences_hashes') THEN
        EXECUTE 'CREATE TABLE backup_20251120.user_preferences_hashes AS SELECT * FROM public.user_preferences_hashes';
    END IF;
END $$;

-- Registrar informações do backup
CREATE TABLE backup_20251120.backup_info (
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    backup_type VARCHAR(50) DEFAULT 'pre_migration',
    migration_versions TEXT[] DEFAULT ARRAY['20250219000001','20250219000002','20250219000003','20250219000004','20250219000005','20250219000006','20250219000007','20250219000008','20250219000009','20251113000000','20251120000001'],
    executed_by TEXT DEFAULT CURRENT_USER
);

INSERT INTO backup_20251120.backup_info DEFAULT VALUES;

COMMIT;

-- =============================================
-- ROLLBACK SCRIPT - CASO NECESSÁRIO
-- =============================================
-- Este script pode ser executado para reverter as mudanças
-- =============================================

-- Rollback functions (descomentar se necessário)
/*
BEGIN;

-- Restaurar funções originais
DROP FUNCTION IF EXISTS public.get_places_nearby(DECIMAL, DECIMAL, INTEGER, BOOLEAN, TEXT[], TEXT[], TEXT[]) CASCADE;

-- Restaurar funções do backup
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT function_name, function_source, arguments 
        FROM backup_20251120.functions_backup 
    LOOP
        EXECUTE format('CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS TABLE (...) AS %s LANGUAGE plpgsql STABLE;', 
                      func_record.function_name, 
                      func_record.arguments,
                      func_record.function_source);
    END LOOP;
END $$;

COMMIT;
*/

-- Rollback tables (descomentar se necessário)
/*
BEGIN;

-- Dropar novas tabelas
DROP TABLE IF EXISTS public.location_hashes CASCADE;
DROP TABLE IF EXISTS public.user_preferences_hashes CASCADE;
DROP TABLE IF EXISTS public.neighborhoods CASCADE;
DROP TABLE IF EXISTS public.br_states CASCADE;

-- Restaurar tabelas originais
TRUNCATE public.locations;
INSERT INTO public.locations SELECT * FROM backup_20251120.locations;

TRUNCATE public.user_preferences;
INSERT INTO public.user_preferences SELECT * FROM backup_20251120.user_preferences;

COMMIT;
*/