CREATE TABLE IF NOT EXISTS public.listening_sessions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  host_user_id INTEGER,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  playlist_id INTEGER,
  status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  set_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  gap_seconds SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listening_sessions_host_user_id_users_id_fk
    FOREIGN KEY (host_user_id) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT listening_sessions_playlist_id_playlists_id_fk
    FOREIGN KEY (playlist_id) REFERENCES public.playlists (id) ON DELETE SET NULL,
  CONSTRAINT listening_sessions_status_check
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  CONSTRAINT listening_sessions_window_check CHECK (ends_at > starts_at),
  CONSTRAINT listening_sessions_gap_check CHECK (gap_seconds >= 0 AND gap_seconds <= 300)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listening_sessions_starts_at_idx
  ON public.listening_sessions (starts_at);
