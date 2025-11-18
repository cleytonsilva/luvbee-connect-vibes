-- Migration: Create notifications table
-- Date: 2025-01-31
-- Description: Creates notifications table for in-app notifications
--              Required for RF-07.1: Sistema de Notificações

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('match_mutual', 'new_message')),
    title VARCHAR(200) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}', -- Dados adicionais (chat_id, match_id, user_id, etc.)
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (to mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only system can insert notifications (via triggers or service role)
-- Service role can insert (for triggers)
CREATE POLICY "notifications_insert_service" ON public.notifications
    FOR INSERT
    WITH CHECK (true); -- Triggers run with service role

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Add comment
COMMENT ON TABLE public.notifications IS 'In-app notifications for users (matches, messages, etc.)';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: match_mutual, new_message';
COMMENT ON COLUMN public.notifications.data IS 'Additional data as JSONB (chat_id, match_id, user_id, etc.)';

