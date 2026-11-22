-- Verified customer billing profiles for secure Stripe checkout & official receipts
CREATE TABLE IF NOT EXISTS public.user_billing_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address_line1 VARCHAR(160) NOT NULL,
  address_line2 VARCHAR(120) NOT NULL DEFAULT '',
  city VARCHAR(80) NOT NULL,
  region VARCHAR(80) NOT NULL,
  postal_code VARCHAR(24) NOT NULL,
  country CHAR(2) NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
