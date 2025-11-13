-- Migração Supabase - Luvbee Connect Vibes
-- Bucket de imagens de lugares
select storage.create_bucket('div', public := true);

-- Políticas de leitura pública do bucket div
create policy if not exists "public_read_div"
on storage.objects for select
using (bucket_id = 'div');

-- Tabela de cache de fotos por place_id
create table if not exists public.cached_place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  photo_reference text,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

alter table public.cached_place_photos enable row level security;

create policy if not exists "cached_place_photos_read"
on public.cached_place_photos for select
using (true);

create policy if not exists "cached_place_photos_write_admin"
on public.cached_place_photos for all to authenticated
using ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin')
with check ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin');
-- Data: 2024-01-15
-- Responsável: Sistema Esquads

-- =============================================
-- 1. EXTENSÕES NECESSÁRIAS
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 2. TABELAS PRINCIPAIS
-- =============================================

-- Tabela de usuários (estende auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabela de estabelecimentos/locais
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    phone VARCHAR(20),
    website TEXT,
    opening_hours JSONB DEFAULT '{}',
    location POINT,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de matches/conexões
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    matched_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, matched_user_id),
    CONSTRAINT different_users CHECK (user_id != matched_user_id)
);

-- Tabela de mensagens
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 1000),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT different_participants CHECK (sender_id != receiver_id)
);

-- Tabela de check-ins
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_out_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, location_id, is_active) WHERE is_active = true
);

-- Tabela de categorias de locais
CREATE TABLE public.location_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#000000',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de favoritos
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Tabela de avaliações
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================

-- Índices para users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_active ON public.users(is_active);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Índices para locations
CREATE INDEX idx_locations_category ON public.locations(category);
CREATE INDEX idx_locations_rating ON public.locations(rating DESC);
CREATE INDEX idx_locations_verified ON public.locations(is_verified);
CREATE INDEX idx_locations_active ON public.locations(is_active);
CREATE INDEX idx_locations_owner ON public.locations(owner_id);
CREATE INDEX idx_locations_created_at ON public.locations(created_at DESC);
CREATE INDEX idx_locations_geo ON public.locations USING GIST(location);

-- Índices para matches
CREATE INDEX idx_matches_user ON public.matches(user_id);
CREATE INDEX idx_matches_matched_user ON public.matches(matched_user_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_created_at ON public.matches(created_at DESC);

-- Índices para messages
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- Índices para check_ins
CREATE INDEX idx_checkins_user ON public.check_ins(user_id);
CREATE INDEX idx_checkins_location ON public.check_ins(location_id);
CREATE INDEX idx_checkins_active ON public.check_ins(is_active);
CREATE INDEX idx_checkins_created_at ON public.check_ins(created_at DESC);

-- Índices para reviews
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_reviews_location ON public.reviews(location_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating DESC);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Índices para favorites
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_location ON public.favorites(location_id);
CREATE INDEX idx_favorites_created_at ON public.favorites(created_at DESC);

-- =============================================
-- 4. FUNÇÕES AUXILIARES
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION update_location_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.locations
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE location_id = NEW.location_id AND is_verified = true
    )
    WHERE id = NEW.location_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_location_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_location_rating();

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Desabilitar RLS por padrão (habilitaremos por tabela)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela users
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (is_active = true);

CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_admin" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON public.users
    FOR DELETE USING (auth.uid() = id);

-- Políticas para tabela locations
CREATE POLICY "locations_select_verified" ON public.locations
    FOR SELECT USING (is_verified = true OR auth.uid() = owner_id);

CREATE POLICY "locations_select_all" ON public.locations
    FOR SELECT USING (true);

CREATE POLICY "locations_insert_authenticated" ON public.locations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "locations_update_owner" ON public.locations
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "locations_delete_owner" ON public.locations
    FOR DELETE USING (auth.uid() = owner_id);

-- Políticas para tabela matches
CREATE POLICY "matches_select_own" ON public.matches
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "matches_insert_own" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "matches_update_own" ON public.matches
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "matches_delete_own" ON public.matches
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- Políticas para tabela messages
CREATE POLICY "messages_select_own" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_own" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_own" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Políticas para tabela check_ins
CREATE POLICY "checkins_select_own" ON public.check_ins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "checkins_insert_own" ON public.check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkins_update_own" ON public.check_ins
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "checkins_delete_own" ON public.check_ins
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para tabela favorites
CREATE POLICY "favorites_select_own" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para tabela reviews
CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "reviews_select_own" ON public.reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reviews_insert_own" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. DADOS INICIAIS
-- =============================================

-- Inserir categorias de locais padrão
INSERT INTO public.location_categories (name, icon, color) VALUES
    ('Bar', 'wine', '#8B5CF6'),
    ('Club', 'music', '#EC4899'),
    ('Restaurante', 'utensils', '#F59E0B'),
    ('Pub', 'beer', '#10B981'),
    ('Lounge', 'sofa', '#6366F1'),
    ('Café', 'coffee', '#D97706'),
    ('Hotel', 'hotel', '#3B82F6'),
    ('Evento', 'calendar', '#EF4444');

-- =============================================
-- 7. PERMISSÕES
-- =============================================

-- Conceder permissões para anon role (leitura pública)
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.locations TO anon;
GRANT SELECT ON public.location_categories TO anon;
GRANT SELECT ON public.reviews TO anon;

-- Conceder permissões para authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.locations TO authenticated;
GRANT ALL ON public.matches TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.check_ins TO authenticated;
GRANT ALL ON public.location_categories TO authenticated;
GRANT ALL ON public.favorites TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;

-- Conceder permissões para service_role (admin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================
-- 8. FUNÇÕES DE AUDITORIA
-- =============================================

-- Função genérica para auditoria
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Criar triggers de auditoria
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_locations
    AFTER INSERT OR UPDATE OR DELETE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_matches
    AFTER INSERT OR UPDATE OR DELETE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_messages
    AFTER INSERT OR UPDATE OR DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_check_ins
    AFTER INSERT OR UPDATE OR DELETE ON public.check_ins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- 9. VALIDAÇÕES E CONSTRAINTS ADICIONAIS
-- =============================================

-- Verificar se não existe check-in ativo duplicado
CREATE OR REPLACE FUNCTION prevent_duplicate_active_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        IF EXISTS (
            SELECT 1 FROM public.check_ins
            WHERE user_id = NEW.user_id
            AND location_id = NEW.location_id
            AND is_active = true
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Usuário já possui check-in ativo neste local';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_duplicate_checkin
    BEFORE INSERT OR UPDATE ON public.check_ins
    FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_active_checkin();

-- =============================================
-- 10. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================

COMMENT ON TABLE public.users IS 'Tabela de usuários do sistema (estende auth.users)';
COMMENT ON TABLE public.locations IS 'Tabela de estabelecimentos/locais de entretenimento';
COMMENT ON TABLE public.matches IS 'Tabela de conexões/matches entre usuários';
COMMENT ON TABLE public.messages IS 'Tabela de mensagens entre usuários';
COMMENT ON TABLE public.check_ins IS 'Tabela de check-ins em locais';
COMMENT ON TABLE public.location_categories IS 'Categorias de estabelecimentos';
COMMENT ON TABLE public.favorites IS 'Locais favoritos dos usuários';
COMMENT ON TABLE public.reviews IS 'Avaliações de locais por usuários';
COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria do sistema';

-- =============================================
-- 11. VERIFICAÇÃO FINAL
-- =============================================

-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'locations', 'matches', 'messages', 'check_ins', 'location_categories', 'favorites', 'reviews', 'audit_logs')
ORDER BY table_name;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verificar índices
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- =============================================
-- 12. PROCEDIMENTO DE MIGRAÇÃO
-- =============================================

/*
PROCEDIMENTO DE MIGRAÇÃO:

1. FAZER BACKUP DO BANCO ATUAL
   pg_dump [database_name] > backup_[data].sql

2. EXECUTAR ESTE SCRIPT
   psql -h [host] -U [user] -d [database] -f migracao-supabase.sql

3. VALIDAR MIGRAÇÃO
   - Verificar se todas as tabelas foram criadas
   - Testar RLS policies
   - Validar índices e constraints
   - Executar testes de integridade

4. EM CASO DE FALHA:
   - Executar rollback: psql -h [host] -U [user] -d [database] -f backup_[data].sql
   - Verificar logs de erro
   - Corrigir problemas e repetir

5. PÓS-MIGRAÇÃO:
   - Configurar webhooks
   - Ativar realtime
   - Configurar triggers de notificação
   - Executar testes de carga
*/

-- =============================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- =============================================
