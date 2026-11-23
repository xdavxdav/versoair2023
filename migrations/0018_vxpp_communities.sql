-- VXPP Communities: 5 normalized tables with strict unique constraints for memberships & likes
CREATE TABLE IF NOT EXISTS public.vxpp_communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  tagline VARCHAR(120) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(40) NOT NULL DEFAULT 'Business',
  emoji VARCHAR(16) NOT NULL DEFAULT '◎',
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_communities_created_at_idx
  ON public.vxpp_communities (created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.vxpp_community_members (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES public.vxpp_communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vxpp_community_members_unique UNIQUE (community_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_community_members_community_idx
  ON public.vxpp_community_members (community_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.vxpp_community_posts (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES public.vxpp_communities(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Member',
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_community_posts_community_created_idx
  ON public.vxpp_community_posts (community_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.vxpp_community_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES public.vxpp_community_posts(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES public.vxpp_communities(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Member',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_community_comments_post_created_idx
  ON public.vxpp_community_comments (post_id, created_at ASC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_community_comments_community_idx
  ON public.vxpp_community_comments (community_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.vxpp_community_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES public.vxpp_community_posts(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES public.vxpp_communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vxpp_community_likes_unique UNIQUE (post_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vxpp_community_likes_community_idx
  ON public.vxpp_community_likes (community_id);
