ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS previous_role VARCHAR(20);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.inbox_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'support',
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP,
  unread_count INTEGER NOT NULL DEFAULT 0,
  business_id INTEGER REFERENCES public.businesses(id) ON DELETE SET NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_post_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inbox_conv_user_idx ON public.inbox_conversations (user_id);
CREATE INDEX IF NOT EXISTS inbox_conv_type_idx ON public.inbox_conversations (type);
CREATE INDEX IF NOT EXISTS inbox_conv_updated_idx ON public.inbox_conversations (updated_at);
CREATE INDEX IF NOT EXISTS inbox_msg_conv_idx ON public.inbox_messages (conversation_id);
CREATE INDEX IF NOT EXISTS inbox_msg_created_idx ON public.inbox_messages (created_at);
CREATE INDEX IF NOT EXISTS inbox_msg_read_idx ON public.inbox_messages (is_read);
