ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS geo_admin_code_hash VARCHAR(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_geo_admin_code_hash_uidx
  ON public.users (geo_admin_code_hash);
