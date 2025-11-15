-- Migration: Fix RLS Policies - Add DELETE policies and restrict reviews
-- Date: 2025-01-28
-- Description: Adiciona políticas DELETE ausentes e restringe política de reviews

-- =============================================
-- 1. ADICIONAR POLÍTICAS DELETE AUSENTES
-- =============================================

-- Política DELETE para location_matches
CREATE POLICY IF NOT EXISTS "location_matches_delete_own" ON public.location_matches
    FOR DELETE USING (auth.uid() = user_id);

-- Política DELETE para people_matches
CREATE POLICY IF NOT EXISTS "people_matches_delete_own" ON public.people_matches
    FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =============================================
-- 2. RESTRINGIR POLÍTICA DE REVIEWS
-- =============================================

-- Se a tabela reviews não tiver coluna is_active, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;
END $$;

-- Remover política permissiva existente
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;

-- Criar política restritiva que filtra por is_active
CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (
        is_active = TRUE 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = reviews.user_id 
            AND users.is_active = TRUE
        )
    );

