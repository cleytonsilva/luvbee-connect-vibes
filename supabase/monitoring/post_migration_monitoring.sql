-- Monitoramento Pós-Migração do Supabase
-- Criado em: 2025-11-20
-- Responsável: Sistema Esquads

-- ==============================================
-- 1. MONITORAMENTO DE INTEGRIDADE DO SCHEMA
-- ==============================================

-- Verificar integridade das tabelas críticas
CREATE OR REPLACE FUNCTION monitorar_integridade_tabelas()
RETURNS TABLE (
    tabela_name TEXT,
    total_registros BIGINT,
    ultima_atualizacao TIMESTAMP,
    status_integridade TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COUNT(*)::BIGINT as total_registros,
        MAX(COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)) as ultima_atualizacao,
        CASE 
            WHEN COUNT(*) > 0 THEN 'OK'
            ELSE 'VAZIA'
        END as status_integridade
    FROM information_schema.tables t
    LEFT JOIN public.locations l ON t.table_name = 'locations'
    LEFT JOIN public.user_preferences up ON t.table_name = 'user_preferences'
    LEFT JOIN public.br_states bs ON t.table_name = 'br_states'
    LEFT JOIN public.br_cities bc ON t.table_name = 'br_cities'
    LEFT JOIN public.br_neighborhoods bn ON t.table_name = 'br_neighborhoods'
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('locations', 'user_preferences', 'br_states', 'br_cities', 'br_neighborhoods')
    GROUP BY t.table_name
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 2. MONITORAMENTO DE PERFORMANCE
-- ==============================================

-- Verificar tamanho das tabelas e índices
CREATE OR REPLACE FUNCTION monitorar_performance_tabelas()
RETURNS TABLE (
    tabela_name TEXT,
    tamanho_pretty TEXT,
    total_bytes BIGINT,
    indice_bytes BIGINT,
    percentual_indice NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)),
        pg_total_relation_size(schemaname||'.'||tablename) as total_bytes,
        pg_indexes_size(schemaname||'.'||tablename) as indice_bytes,
        ROUND((pg_indexes_size(schemaname||'.'||tablename)::NUMERIC / 
              pg_total_relation_size(schemaname||'.'||tablename)::NUMERIC * 100), 2) as percentual_indice
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('locations', 'user_preferences', 'br_states', 'br_cities', 'br_neighborhoods')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 3. MONITORAMENTO DE MIGRAÇÕES
-- ==============================================

-- Verificar status das migrações aplicadas
CREATE OR REPLACE FUNCTION monitorar_status_migracoes()
RETURNS TABLE (
    versao TEXT,
    descricao TEXT,
    aplicada_em TIMESTAMP,
    tempo_execucao INTERVAL,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        split_part(name, '_', 1)::TEXT as versao,
        regexp_replace(name, '^[0-9]+_', '', 'g')::TEXT as descricao,
        executed_at as aplicada_em,
        execution_time as tempo_execucao,
        CASE 
            WHEN execution_time IS NOT NULL THEN 'SUCESSO'
            ELSE 'PENDENTE'
        END as status
    FROM supabase_migrations.schema_migrations
    ORDER BY executed_at DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 4. MONITORAMENTO DE ERROS E LOGS
-- ==============================================

-- Criar tabela de logs de erro para monitoramento
CREATE TABLE IF NOT EXISTS public.migration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nivel TEXT NOT NULL CHECK (nivel IN ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
    componente TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    detalhes JSONB,
    user_id UUID REFERENCES auth.users(id),
    contexto TEXT
);

-- Índices para performance de consultas
CREATE INDEX IF NOT EXISTS idx_migration_logs_timestamp ON public.migration_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_migration_logs_nivel ON public.migration_logs(nivel);
CREATE INDEX IF NOT EXISTS idx_migration_logs_componente ON public.migration_logs(componente);

-- Função para registrar logs
CREATE OR REPLACE FUNCTION registrar_log(
    p_nivel TEXT,
    p_componente TEXT,
    p_mensagem TEXT,
    p_detalhes JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_contexto TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.migration_logs (nivel, componente, mensagem, detalhes, user_id, contexto)
    VALUES (p_nivel, p_componente, p_mensagem, p_detalhes, p_user_id, p_contexto)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. ALERTAS E NOTIFICAÇÕES
-- ==============================================

-- Configurar alertas para problemas críticos
CREATE OR REPLACE FUNCTION verificar_alertas_criticos()
RETURNS TABLE (
    alerta_tipo TEXT,
    severidade TEXT,
    mensagem TEXT,
    recomendacao TEXT,
    acao_imediata BOOLEAN
) AS $$
BEGIN
    -- Verificar tabelas sem registros
    RETURN QUERY
    SELECT 
        'TABELA_VAZIA'::TEXT,
        'CRITICAL'::TEXT,
        'Tabela '||t.table_name||' está vazia após migração'::TEXT,
        'Verificar se a migração foi aplicada corretamente e restaurar dados se necessário'::TEXT,
        true::BOOLEAN
    FROM information_schema.tables t
    LEFT JOIN public.locations l ON t.table_name = 'locations'
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('locations', 'user_preferences')
    GROUP BY t.table_name
    HAVING COUNT(l.id) = 0;
    
    -- Verificar índices corrompidos
    RETURN QUERY
    SELECT 
        'INDICE_CORROMPIDO'::TEXT,
        'HIGH'::TEXT,
        'Possível índice corrompido em '||t.table_name::TEXT,
        'Recriar índices da tabela'::TEXT,
        false::BOOLEAN
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_name IN ('locations', 'user_preferences')
    AND EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_index i ON c.oid = i.indexrelid 
        WHERE c.relname LIKE t.table_name||'%'
        AND i.indisvalid = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. RELATÓRIOS DE MONITORAMENTO
-- ==============================================

-- Relatório consolidado de saúde do sistema
CREATE OR REPLACE FUNCTION relatorio_saude_sistema()
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'integridade_tabelas', (SELECT json_agg(row_to_json(t)) FROM monitorar_integridade_tabelas() t),
        'performance_tabelas', (SELECT json_agg(row_to_json(p)) FROM monitorar_performance_tabelas() p),
        'status_migracoes', (SELECT json_agg(row_to_json(m)) FROM monitorar_status_migracoes() m),
        'alertas_criticos', (SELECT json_agg(row_to_json(a)) FROM verificar_alertas_criticos() a),
        'ultimos_logs', (
            SELECT json_agg(row_to_json(l))
            FROM (
                SELECT nivel, componente, mensagem, timestamp
                FROM public.migration_logs
                WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
                ORDER BY timestamp DESC
                LIMIT 10
            ) l
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 7. MONITORAMENTO DE DESEMPENHO 24H
-- ==============================================

-- Criar tabela de métricas de performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metrica_tipo TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    unidade TEXT,
    contexto JSONB,
    limite_alerta NUMERIC
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tipo ON public.performance_metrics(metrica_tipo);

-- Função para registrar métricas
CREATE OR REPLACE FUNCTION registrar_metrica(
    p_metrica_tipo TEXT,
    p_valor NUMERIC,
    p_unidade TEXT DEFAULT NULL,
    p_contexto JSONB DEFAULT NULL,
    p_limite_alerta NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metrica_id UUID;
BEGIN
    INSERT INTO public.performance_metrics (metrica_tipo, valor, unidade, contexto, limite_alerta)
    VALUES (p_metrica_tipo, p_valor, p_unidade, p_contexto, p_limite_alerta)
    RETURNING id INTO metrica_id;
    
    -- Verificar se ultrapassou limite
    IF p_limite_alerta IS NOT NULL AND p_valor > p_limite_alerta THEN
        PERFORM registrar_log(
            'WARN',
            'PERFORMANCE',
            'Métrica '||p_metrica_tipo||' ultrapassou limite: '||p_valor||' > '||p_limite_alerta,
            jsonb_build_object('metrica_tipo', p_metrica_tipo, 'valor', p_valor, 'limite', p_limite_alerta),
            NULL,
            'Monitoramento 24h pós-migração'
        );
    END IF;
    
    RETURN metrica_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 8. MONITORAMENTO DE CONEXÕES E USO
-- ==============================================

-- Verificar estatísticas de conexão
CREATE OR REPLACE FUNCTION monitorar_conexoes()
RETURNS TABLE (
    total_conexoes INTEGER,
    conexoes_ativas INTEGER,
    conexoes_ociosas INTEGER,
    tempo_medio_conexao INTERVAL,
    conexoes_por_banco TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        count(*)::INTEGER as total_conexoes,
        count(*) FILTER (WHERE state = 'active')::INTEGER as conexoes_ativas,
        count(*) FILTER (WHERE state = 'idle')::INTEGER as conexoes_ociosas,
        avg(current_timestamp - backend_start)::INTERVAL as tempo_medio_conexao,
        string_agg(
            datname||': '||count(*)::TEXT, 
            ', ' 
            ORDER BY count(*) DESC
        ) as conexoes_por_banco
    FROM pg_stat_activity
    WHERE datname IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 9. PERMISSÕES E SEGURANÇA
-- ==============================================

-- Grant permissions for monitoring functions
GRANT SELECT ON public.migration_logs TO anon, authenticated;
GRANT SELECT ON public.performance_metrics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION monitorar_integridade_tabelas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION monitorar_performance_tabelas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION monitorar_status_migracoes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verificar_alertas_criticos() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION relatorio_saude_sistema() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION monitorar_conexoes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION registrar_log(TEXT, TEXT, TEXT, JSONB, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION registrar_metrica(TEXT, NUMERIC, TEXT, JSONB, NUMERIC) TO anon, authenticated;

-- ==============================================
-- 10. REGISTRO INICIAL DO MONITORAMENTO
-- ==============================================

-- Registrar início do monitoramento pós-migração
SELECT registrar_log(
    'INFO',
    'MONITORAMENTO',
    'Sistema de monitoramento pós-migração iniciado',
    jsonb_build_object(
        'versao', '1.0.0',
        'migracoes_aplicadas', (SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE executed_at IS NOT NULL),
        'timestamp_inicio', CURRENT_TIMESTAMP
    ),
    NULL,
    'Configuração inicial do monitoramento'
);

-- Registrar métrica inicial de saúde
SELECT registrar_metrica('SAUDE_SISTEMA', 100, 'percentual', NULL, 80);

-- Exibir relatório inicial
SELECT jsonb_pretty(relatorio_saude_sistema()::jsonb);