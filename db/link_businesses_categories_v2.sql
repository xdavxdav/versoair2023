-- db/link_businesses_categories_v2.sql
-- Improved linking: looks for known category-like columns per source table
BEGIN;

-- Ensure links table exists
CREATE TABLE IF NOT EXISTS business_category_links (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  source_table TEXT,
  source_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, category_id, source_table)
);

DO $$
DECLARE
  tbl TEXT;
  v_sql TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'automobile_businesses','finance_businesses','healthcare_businesses','restaurants_businesses',
    'retail_businesses','technology_businesses','hotels_businesses','hotellerie_businesses',
    'commerce_businesses','divertissement_businesses','batiment_businesses'
  ]) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = tbl AND column_name = 'categories_produits') THEN
      v_sql := format($q$
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %1$L, cp
        FROM (
          SELECT id, unnest(string_to_array(categories_produits, ','))::text AS cp, nom AS src_name, adresse AS src_address FROM %2$I WHERE categories_produits IS NOT NULL
        ) s
        JOIN categories c ON lower(trim(c.name)) = lower(trim(s.cp))
        JOIN businesses b ON (b.id = s.id OR lower(trim(b.name)) = lower(trim(s.src_name)) OR (b.address IS NOT NULL AND s.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(s.src_address))))
        ON CONFLICT DO NOTHING;
      $q$, tbl, tbl);
      EXECUTE v_sql;

    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = tbl AND column_name = 'categories_activites') THEN
      v_sql := format($q$
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %1$L, cp
        FROM (
          SELECT id, unnest(string_to_array(categories_activites, ','))::text AS cp, nom AS src_name, adresse AS src_address FROM %2$I WHERE categories_activites IS NOT NULL
        ) s
        JOIN categories c ON lower(trim(c.name)) = lower(trim(s.cp))
        JOIN businesses b ON (b.id = s.id OR lower(trim(b.name)) = lower(trim(s.src_name)) OR (b.address IS NOT NULL AND s.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(s.src_address))))
        ON CONFLICT DO NOTHING;
      $q$, tbl, tbl);
      EXECUTE v_sql;

    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = tbl AND column_name = 'services_offerts') THEN
      v_sql := format($q$
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %1$L, sfo
        FROM (
          SELECT id, unnest(string_to_array(services_offerts, ','))::text AS sfo, nom AS src_name, adresse AS src_address FROM %2$I WHERE services_offerts IS NOT NULL
        ) s
        JOIN categories c ON lower(trim(c.name)) = lower(trim(s.sfo))
        JOIN businesses b ON (b.id = s.id OR lower(trim(b.name)) = lower(trim(s.src_name)) OR (b.address IS NOT NULL AND s.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(s.src_address))))
        ON CONFLICT DO NOTHING;
      $q$, tbl, tbl);
      EXECUTE v_sql;

    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = tbl AND column_name = 'type_automobile') THEN
      v_sql := format($q$
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %1$L, t
        FROM (
          SELECT id, COALESCE(type_automobile::text, type_commerce::text, type_divertissement::text, type_etablissement::text, type_finance::text) AS t, nom AS src_name, adresse AS src_address FROM %2$I
        ) s
        JOIN categories c ON lower(trim(c.name)) = lower(trim(s.t))
        JOIN businesses b ON (b.id = s.id OR lower(trim(b.name)) = lower(trim(s.src_name)) OR (b.address IS NOT NULL AND s.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(s.src_address))))
        ON CONFLICT DO NOTHING;
      $q$, tbl, tbl);
      EXECUTE v_sql;

    ELSE
      -- fallback: try to extract any column name containing 'cat' or 'categorie' or 'rubrique' or 'secteur'
      PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = tbl AND (column_name ILIKE '%cat%' OR column_name ILIKE '%categorie%' OR column_name ILIKE '%rubrique%' OR column_name ILIKE '%secteur%');
      IF FOUND THEN
        v_sql := format($q$
          INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
          SELECT DISTINCT b.id, c.id, %1$L, val
          FROM (
            SELECT id, unnest(ARRAY[ %2$s ])::text AS val, nom AS src_name, adresse AS src_address FROM %3$I
          ) s
          JOIN categories c ON lower(trim(c.name)) = lower(trim(s.val))
          JOIN businesses b ON (b.id = s.id OR lower(trim(b.name)) = lower(trim(s.src_name)) OR (b.address IS NOT NULL AND s.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(s.src_address))))
          ON CONFLICT DO NOTHING;
        $q$, tbl, 'NULL', tbl);
        -- Note: dynamic assembly of columns for fallback is skipped (conservative)
      END IF;
    END IF;
  END LOOP;
END$$;

COMMIT;

-- End improved linking
