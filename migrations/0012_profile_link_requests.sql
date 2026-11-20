CREATE TABLE IF NOT EXISTS public.profile_link_requests (
  id SERIAL PRIMARY KEY,
  requester_user_id INTEGER,
  requester_email VARCHAR(255) NOT NULL,
  display_name VARCHAR(160),
  provider VARCHAR(32) NOT NULL,
  normalized_url TEXT NOT NULL,
  external_id VARCHAR(128),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  resulting_user_id INTEGER,
  resulting_artist_profile_id INTEGER,
  resulting_artist_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_link_requests_requester_user_id_fk
    FOREIGN KEY (requester_user_id) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT profile_link_requests_reviewed_by_fk
    FOREIGN KEY (reviewed_by) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT profile_link_requests_resulting_user_id_fk
    FOREIGN KEY (resulting_user_id) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT profile_link_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS profile_link_requests_pending_url_unique
  ON public.profile_link_requests (normalized_url)
  WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profile_link_requests_status_created_idx
  ON public.profile_link_requests (status, created_at ASC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profile_link_requests_email_idx
  ON public.profile_link_requests (LOWER(requester_email));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.profile_import_tracks (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  artist_user_id INTEGER,
  external_track_id VARCHAR(128),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration_sec INTEGER,
  artwork_url TEXT,
  external_url TEXT,
  license VARCHAR(100),
  external_created_at TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL DEFAULT 'awaiting_audio',
  attached_track_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_import_tracks_request_id_fk
    FOREIGN KEY (request_id) REFERENCES public.profile_link_requests (id) ON DELETE CASCADE,
  CONSTRAINT profile_import_tracks_artist_user_id_fk
    FOREIGN KEY (artist_user_id) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT profile_import_tracks_status_check
    CHECK (status IN ('awaiting_audio', 'attached', 'archived'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profile_import_tracks_request_idx
  ON public.profile_import_tracks (request_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profile_import_tracks_artist_status_idx
  ON public.profile_import_tracks (artist_user_id, status);
