-- =============================================
-- Script Completo de Configuração Supabase
-- LuvBee Connect Vibes
-- =============================================
-- 
-- Este script deve ser executado no SQL Editor do Supabase
-- Acesse: https://app.supabase.com/project/zgxtcawgllsnnernlgim/sql/new
--
-- IMPORTANTE: Execute em ordem:
-- 1. Primeiro execute: supabase/migrations/20250127000000_create_core_tables.sql
-- 2. Depois execute este script para habilitar Realtime
-- =============================================

-- =============================================
-- HABILITAR REALTIME
-- =============================================

-- Habilitar Realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;

-- Habilitar Realtime para matches de pessoas
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS people_matches;

-- Habilitar Realtime para matches de locais
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS location_matches;

-- Habilitar Realtime para chats
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS chats;

-- =============================================
-- VERIFICAR CONFIGURAÇÃO
-- =============================================

-- Verificar tabelas habilitadas no Realtime
SELECT 
  schemaname,
  tablename,
  'Realtime habilitado' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Verificar se todas as tabelas existem
SELECT 
  table_name,
  'Tabela existe' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'user_preferences', 'locations', 'location_matches',
  'people_matches', 'chats', 'messages', 'check_ins',
  'location_categories', 'favorites', 'reviews', 'audit_logs'
)
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS habilitado'
    ELSE 'RLS desabilitado'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'user_preferences', 'locations', 'location_matches',
  'people_matches', 'chats', 'messages', 'check_ins',
  'favorites', 'reviews'
)
ORDER BY tablename;

-- =============================================
-- VERIFICAR FUNÇÕES
-- =============================================

SELECT 
  routine_name,
  routine_type,
  'Função existe' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_updated_at_column',
  'calculate_compatibility_score',
  'get_common_locations',
  'update_location_rating'
)
ORDER BY routine_name;

-- =============================================
-- VERIFICAR TRIGGERS
-- =============================================

SELECT 
  trigger_name,
  event_object_table as table_name,
  'Trigger existe' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
  'users', 'user_preferences', 'locations', 'people_matches',
  'chats', 'messages', 'reviews'
)
ORDER BY event_object_table, trigger_name;

-- =============================================
-- RESUMO FINAL
-- =============================================

SELECT 
  'Configuração completa!' as mensagem,
  (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime') as tabelas_realtime,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
    'users', 'user_preferences', 'locations', 'location_matches',
    'people_matches', 'chats', 'messages', 'check_ins',
    'location_categories', 'favorites', 'reviews', 'audit_logs'
  )) as total_tabelas;

