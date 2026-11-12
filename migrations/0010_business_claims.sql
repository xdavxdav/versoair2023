ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(30) NOT NULL DEFAULT 'general';
--> statement-breakpoint
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS business_name TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.business_claims (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  message TEXT,
  claimant_role VARCHAR(100) NOT NULL,
  work_email TEXT,
  work_phone VARCHAR(30),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT business_claims_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS business_claims_pending_business_user_unique
  ON public.business_claims (business_id, user_id)
  WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_claims_business_status_idx
  ON public.business_claims (business_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_claims_user_created_idx
  ON public.business_claims (user_id, created_at);
