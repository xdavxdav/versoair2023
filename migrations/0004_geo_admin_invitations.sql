CREATE TABLE IF NOT EXISTS public.geo_admin_invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  gate_username TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'moderator')),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired', 'delivery_failed')),
  invited_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS geo_admin_invitations_pending_email_uidx
  ON public.geo_admin_invitations (email)
  WHERE status = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS geo_admin_invitations_pending_gate_uidx
  ON public.geo_admin_invitations (gate_username)
  WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS geo_admin_invitations_status_expires_idx
  ON public.geo_admin_invitations (status, expires_at);
