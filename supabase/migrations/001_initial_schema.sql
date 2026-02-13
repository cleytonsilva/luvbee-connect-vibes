-- Tabelas do Supabase para o Luvbee Dating App

-- Tabela de perfis (estendida)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'other')),
  bio TEXT,
  occupation TEXT,
  education TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photos TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  vibes TEXT[] DEFAULT '{}',
  looking_for TEXT CHECK (looking_for IN ('relationship', 'casual', 'friendship', 'unsure')),
  preferred_age_min INTEGER DEFAULT 18,
  preferred_age_max INTEGER DEFAULT 50,
  preferred_distance INTEGER DEFAULT 50,
  show_me BOOLEAN DEFAULT true,
  incognito_mode BOOLEAN DEFAULT false,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de likes
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_like BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Tabela de matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'matched', 'declined', 'blocked')) DEFAULT 'pending',
  compatibility_score DECIMAL(3, 2),
  initiated_by UUID REFERENCES auth.users(id),
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- Tabela de chats
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message JSONB,
  unread_count_1 INTEGER DEFAULT 0,
  unread_count_2 INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'gif')) DEFAULT 'text',
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de verificação de identidade
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('rg', 'cnh', 'passport')),
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de moderação de fotos
CREATE TABLE IF NOT EXISTS photo_moderations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  has_nudity BOOLEAN DEFAULT false,
  is_inappropriate BOOLEAN DEFAULT false,
  moderation_score DECIMAL(3, 2),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IN ('inappropriate_photos', 'underage', 'harassment', 'spam', 'fake_profile', 'other')),
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('match', 'like', 'message', 'check_in', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de lugares do usuário
CREATE TABLE IF NOT EXISTS user_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  check_ins INTEGER DEFAULT 0,
  last_check_in TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user_id_1);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user_id_2);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user_id_1);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user_id_2);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios perfis
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: Usuários podem ver perfis de matches
CREATE POLICY "Users can view matched profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE (user_id_1 = auth.uid() AND user_id_2 = profiles.id)
         OR (user_id_2 = auth.uid() AND user_id_1 = profiles.id)
         AND status = 'matched'
    )
  );

-- Política: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: Mensagens - usuários só podem ver mensagens de seus chats
CREATE POLICY "Users can view own chat messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id
        AND (chats.user_id_1 = auth.uid() OR chats.user_id_2 = auth.uid())
    )
  );

-- Função para criar chat automaticamente quando der match
CREATE OR REPLACE FUNCTION create_chat_on_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'matched' THEN
    INSERT INTO chats (match_id, user_id_1, user_id_2)
    VALUES (NEW.id, NEW.user_id_1, NEW.user_id_2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar chat automaticamente
CREATE TRIGGER create_chat_after_match
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'matched' AND OLD.status != 'matched')
  EXECUTE FUNCTION create_chat_on_match();

-- Função para verificar idade mínima
CREATE OR REPLACE FUNCTION check_minimum_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.age < 18 THEN
    RAISE EXCEPTION 'Usuário deve ter pelo menos 18 anos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar idade
CREATE TRIGGER check_age_before_insert
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_minimum_age();
