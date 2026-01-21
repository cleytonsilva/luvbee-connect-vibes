-- =============================================
-- LIMPEZA DE DADOS CORROMPIDOS
-- =============================================
-- Data: 2026-01-09
-- Descrição: Remove locais com coordenadas inválidas (0,0)
--            que não são eventos
-- =============================================

BEGIN;

-- Logar quantos registros serão removidos
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.locations 
  WHERE lat = 0 AND lng = 0 
    AND event_start_date IS NULL
    AND is_active = true;
  
  RAISE NOTICE 'Encontrados % locais com coordenadas inválidas (0,0) que serão desativados', invalid_count;
END $$;

-- Desativar locais com coordenadas inválidas ao invés de deletar
-- (preserva dados para auditoria)
UPDATE public.locations 
SET is_active = false,
    updated_at = NOW()
WHERE lat = 0 AND lng = 0 
  AND event_start_date IS NULL
  AND is_active = true;

-- Logar resultado
DO $$
DECLARE
  remaining_invalid INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_invalid
  FROM public.locations 
  WHERE lat = 0 AND lng = 0 
    AND event_start_date IS NULL
    AND is_active = true;
  
  RAISE NOTICE 'Locais com coordenadas inválidas ainda ativos: %', remaining_invalid;
END $$;

COMMIT;

-- Verificação (executar manualmente para confirmar)
-- SELECT COUNT(*) as total_invalid_active
-- FROM public.locations 
-- WHERE lat = 0 AND lng = 0 
--   AND event_start_date IS NULL
--   AND is_active = true;
