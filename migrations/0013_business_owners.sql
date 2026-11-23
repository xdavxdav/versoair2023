CREATE TABLE IF NOT EXISTS public.business_owners (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  invited_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT business_owners_status_check
    CHECK (status IN ('invited', 'active')),
  CONSTRAINT business_owners_business_user_unique
    UNIQUE (business_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS business_owners_user_status_idx
  ON public.business_owners (user_id, status);
--> statement-breakpoint
INSERT INTO public.business_owners
  (business_id, user_id, status, accepted_at)
SELECT id, owner_id, 'active', NOW()
FROM public.businesses
WHERE owner_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;
