-- db/link_businesses_categories.sql
-- Idempotent script to link migrated `businesses` to `categories` using
-- heuristic rules: match source table category/name fields to `categories.name`
-- and match businesses by name or id where possible.
BEGIN;

-- create a linking table
CREATE TABLE IF NOT EXISTS business_category_links (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  source_table TEXT,
  source_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, category_id, source_table)
);

-- list of source tables to inspect (matching those used in migration)
DO $$
DECLARE
  tbl TEXT;
  source_tables TEXT[] := ARRAY[
    'automobile_businesses','finance_businesses','healthcare_businesses','restaurants_businesses',
    'retail_businesses','technology_businesses','hotels_businesses','hotellerie_businesses',
    'commerce_businesses','divertissement_businesses','batiment_businesses'
  ];
BEGIN
  FOREACH tbl IN ARRAY source_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl) THEN
      -- Use dynamic SQL: for each distinct category value in the source table,
      -- find matching category id and link to businesses by name or id
      EXECUTE format($f$
        WITH src_vals AS (
          SELECT DISTINCT
            t.id,
            COALESCE(NULLIF((to_jsonb(t) ->> 'category'), ''), NULLIF((to_jsonb(t) ->> 'categorie'), ''), NULLIF((to_jsonb(t) ->> 'category_name'), ''), NULLIF((to_jsonb(t) ->> 'rubrique'), ''), NULLIF((to_jsonb(t) ->> 'secteur'), ''), NULLIF((to_jsonb(t) ->> 'categorie_nom'), ''), NULLIF((to_jsonb(t) ->> 'categories'), '')) AS cat,
            COALESCE(NULLIF((to_jsonb(t) ->> 'nom'), ''), NULLIF((to_jsonb(t) ->> 'name'), ''), NULLIF((to_jsonb(t) ->> 'titre'), '')) AS src_name,
            COALESCE(NULLIF((to_jsonb(t) ->> 'adresse'), ''), NULLIF((to_jsonb(t) ->> 'address'), '')) AS src_address
          FROM %1$I t
        )
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %2$L, sv.cat
        FROM src_vals sv
        JOIN categories c ON lower(trim(c.name)) = lower(trim(sv.cat))
        JOIN businesses b ON (
          (b.id = sv.id) OR
          (lower(trim(b.name)) = lower(trim(sv.src_name))) OR
          (b.address IS NOT NULL AND sv.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(sv.src_address)))
        )
        WHERE sv.cat IS NOT NULL AND sv.cat <> ''
        ON CONFLICT (business_id, category_id, source_table) DO NOTHING;
      $f$, tbl, tbl);
    END IF;
  END LOOP;
END$$;

COMMIT;

-- End link script
