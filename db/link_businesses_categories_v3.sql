-- db/link_businesses_categories_v3.sql
-- Per-table explicit linking using actual column names discovered in source tables
BEGIN;

CREATE TABLE IF NOT EXISTS business_category_links (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  source_table TEXT,
  source_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, category_id, source_table)
);

-- automobile_businesses: use services_automobile and type_automobile
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automobile_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'automobile_businesses', trim(sv)
    FROM (
      SELECT id, unnest(CASE WHEN pg_typeof(services_automobile)::text LIKE '%%[]' THEN services_automobile ELSE string_to_array(services_automobile::text, ',') END)::text AS sv, nom AS src_name, adresse AS src_address FROM automobile_businesses WHERE services_automobile IS NOT NULL
    ) src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.sv))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.src_name)) OR (b.address IS NOT NULL AND src.src_address IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.src_address))))
    ON CONFLICT DO NOTHING;

    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'automobile_businesses', trim(type_automobile)
    FROM automobile_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_automobile))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_automobile IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- batiment_businesses: services_offerts, type_construction
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'batiment_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'batiment_businesses', trim(sv)
    FROM (
      SELECT id, unnest(CASE WHEN pg_typeof(services_offerts)::text LIKE '%%[]' THEN services_offerts ELSE string_to_array(services_offerts::text, ',') END)::text AS sv, nom, adresse FROM batiment_businesses WHERE services_offerts IS NOT NULL
    ) src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.sv))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
    ON CONFLICT DO NOTHING;

    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'batiment_businesses', trim(type_construction)
    FROM batiment_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_construction))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_construction IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- commerce_businesses: categories_produits, type_commerce
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'commerce_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'commerce_businesses', trim(cp)
    FROM (
      SELECT id, unnest(CASE WHEN pg_typeof(categories_produits)::text LIKE '%%[]' THEN categories_produits ELSE string_to_array(categories_produits::text, ',') END)::text AS cp, nom, adresse FROM commerce_businesses WHERE categories_produits IS NOT NULL
    ) src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.cp))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
    ON CONFLICT DO NOTHING;

    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'commerce_businesses', trim(type_commerce)
    FROM commerce_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_commerce))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_commerce IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- divertissement_businesses: categories_activites, type_divertissement
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'divertissement_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'divertissement_businesses', trim(cp)
    FROM (
      SELECT id, unnest(CASE WHEN pg_typeof(categories_activites)::text LIKE '%%[]' THEN categories_activites ELSE string_to_array(categories_activites::text, ',') END)::text AS cp, nom, adresse FROM divertissement_businesses WHERE categories_activites IS NOT NULL
    ) src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.cp))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
    ON CONFLICT DO NOTHING;

    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'divertissement_businesses', trim(type_divertissement)
    FROM divertissement_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_divertissement))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_divertissement IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- finance_businesses: services_financiers, type_finance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'finance_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'finance_businesses', trim(sf)
    FROM (
      SELECT id, unnest(CASE WHEN pg_typeof(services_financiers)::text LIKE '%%[]' THEN services_financiers ELSE string_to_array(services_financiers::text, ',') END)::text AS sf, nom, adresse FROM finance_businesses WHERE services_financiers IS NOT NULL
    ) src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.sf))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
    ON CONFLICT DO NOTHING;

    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'finance_businesses', trim(type_finance)
    FROM finance_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_finance))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_finance IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- healthcare_businesses: categories_produits (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'healthcare_businesses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='healthcare_businesses' AND column_name='categories_produits') THEN
      INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
      SELECT DISTINCT b.id, c.id, 'healthcare_businesses', trim(cp)
      FROM (
        SELECT id, unnest(CASE WHEN pg_typeof(categories_produits)::text LIKE '%%[]' THEN categories_produits ELSE string_to_array(categories_produits::text, ',') END)::text AS cp, nom, adresse FROM healthcare_businesses WHERE categories_produits IS NOT NULL
      ) src
      JOIN categories c ON lower(trim(c.name)) = lower(trim(src.cp))
      JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'hotellerie_businesses') THEN
    INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
    SELECT DISTINCT b.id, c.id, 'hotellerie_businesses', trim(type_etablissement)
    FROM hotellerie_businesses src
    JOIN categories c ON lower(trim(c.name)) = lower(trim(src.type_etablissement))
    JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)))
    WHERE src.type_etablissement IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  FOR tbl IN SELECT unnest(ARRAY['hotels_businesses','restaurants_businesses','retail_businesses','technology_businesses']) LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl) THEN
      EXECUTE format($q$
        INSERT INTO business_category_links (business_id, category_id, source_table, source_value)
        SELECT DISTINCT b.id, c.id, %1$L, trim(cp)
        FROM (
          SELECT id, unnest(CASE WHEN pg_typeof(categories_produits)::text LIKE '%%[]' THEN categories_produits ELSE string_to_array(categories_produits::text, ',') END)::text AS cp, nom, adresse FROM %2$I WHERE categories_produits IS NOT NULL
        ) src
        JOIN categories c ON lower(trim(c.name)) = lower(trim(src.cp))
        JOIN businesses b ON (b.id = src.id OR lower(trim(b.name)) = lower(trim(src.nom)) OR (b.address IS NOT NULL AND src.adresse IS NOT NULL AND lower(trim(b.address)) = lower(trim(src.adresse))))
        ON CONFLICT DO NOTHING;
      $q$, tbl, tbl);
    END IF;
  END LOOP;
END$$;

COMMIT;

-- End v3
