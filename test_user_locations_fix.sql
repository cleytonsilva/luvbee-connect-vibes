-- =============================================
-- TESTE: Verificar se a correção funcionou
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Verificar estrutura da tabela user_locations
SELECT 'ESTRUTURA DA TABELA' as test;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_locations'
ORDER BY ordinal_position;

-- 2. Verificar se RLS está habilitado
SELECT 'RLS STATUS' as test;
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_locations';

-- 3. Verificar políticas RLS
SELECT 'POLITICAS RLS' as test;
SELECT 
    policyname, 
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_locations';

-- 4. Teste de inserção (simulando o que a Edge Function faz)
-- Substitua '<USER_UUID>' por um UUID de usuário válido do seu banco
SELECT 'TESTE DE INSERCAO' as test;

-- Descomente e execute após substituir o UUID:
/*
INSERT INTO public.user_locations (
    user_id,
    google_place_id,
    status,
    place_data
) VALUES (
    '<USER_UUID>',  -- Substitua por um UUID válido
    'TEST_PLACE_ID_123',
    'liked',
    '{"name": "Test Location", "rating": 4.5}'::jsonb
)
ON CONFLICT (user_id, google_place_id) 
DO UPDATE SET 
    status = 'liked',
    updated_at = NOW()
RETURNING *;
*/

-- 5. Verificar triggers
SELECT 'TRIGGERS' as test;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_locations'
AND trigger_schema = 'public';

-- 6. Contagem de registros
SELECT 'CONTAGEM' as test;
SELECT 
    COUNT(*) as total_registros,
    COUNT(location_id) as com_location_id,
    COUNT(*) - COUNT(location_id) as sem_location_id
FROM public.user_locations;

-- 7. Verificar índices
SELECT 'INDICES' as test;
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'user_locations';
