-- Migration: Add place_comments and place_checkins tables
-- These tables support check-in and commenting features for places

-- ===== place_checkins: Registro de check-ins em lugares =====
CREATE TABLE IF NOT EXISTS public.place_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  google_place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for quickly checking if user already checked in today
CREATE INDEX IF NOT EXISTS idx_place_checkins_user_place 
  ON public.place_checkins(user_id, place_id, created_at);

-- RLS
ALTER TABLE public.place_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all checkins" 
  ON public.place_checkins FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own checkins" 
  ON public.place_checkins FOR INSERT 
  WITH CHECK (auth.uid() = user_id);


-- ===== place_comments: Comentários em lugares =====
CREATE TABLE IF NOT EXISTS public.place_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) <= 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast loading of comments per place
CREATE INDEX IF NOT EXISTS idx_place_comments_place 
  ON public.place_comments(place_id, created_at DESC);

-- RLS
ALTER TABLE public.place_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comments" 
  ON public.place_comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own comments" 
  ON public.place_comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
  ON public.place_comments FOR DELETE 
  USING (auth.uid() = user_id);
