-- vxpp (VersoAirApp): persistent personal profile media, bio fields, and social post media
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS avatar_data BYTEA;
--> statement-breakpoint
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS avatar_mime TEXT;
--> statement-breakpoint
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS cover_data BYTEA;
--> statement-breakpoint
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS cover_mime TEXT;
--> statement-breakpoint
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS headline TEXT;
--> statement-breakpoint
ALTER TABLE public.social_users
  ADD COLUMN IF NOT EXISTS interests TEXT[];
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.social_post_media (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_post_media_size_check CHECK (size_bytes > 0 AND size_bytes <= 5242880)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_post_media_owner_idx
  ON public.social_post_media (owner_user_id, created_at DESC);
