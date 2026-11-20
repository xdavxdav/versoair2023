CREATE TABLE IF NOT EXISTS public.arcade_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game VARCHAR(32) NOT NULL,
  run_id VARCHAR(64) NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  level SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT arcade_scores_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT arcade_scores_game_check
    CHECK (game IN ('snake', 'tetris', 'brick_ball', 'xensia')),
  CONSTRAINT arcade_scores_score_check CHECK (score >= 0),
  CONSTRAINT arcade_scores_duration_check CHECK (duration_ms >= 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS arcade_scores_game_score_idx
  ON public.arcade_scores (game, score DESC, created_at ASC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS arcade_scores_user_game_score_idx
  ON public.arcade_scores (user_id, game, score DESC);
