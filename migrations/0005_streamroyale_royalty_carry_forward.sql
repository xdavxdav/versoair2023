ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS royalty_carry_forward DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
