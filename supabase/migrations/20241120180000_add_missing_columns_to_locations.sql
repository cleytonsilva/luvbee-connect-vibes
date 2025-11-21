-- Adicionar colunas faltantes na tabela locations
-- Esta migração resolve os erros de colunas inexistentes: opening_hours e is_active

-- Adicionar coluna opening_hours (text, opcional)
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS opening_hours text;

-- Adicionar coluna is_active (boolean, padrão true)
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Adicionar índice para otimizar queries com is_active
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active) 
WHERE is_active = true;

-- Adicionar comentários descritivos
COMMENT ON COLUMN locations.opening_hours IS 'Horário de funcionamento do local (formato texto)';
COMMENT ON COLUMN locations.is_active IS 'Indica se o local está ativo/disponível';

-- Garantir que locais existentes tenham is_active = true
UPDATE locations SET is_active = true WHERE is_active IS NULL;