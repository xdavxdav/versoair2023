-- Dispatch businesses from `businesses` to per-category tables
-- Creates a backup of `businesses` rows moved (in a new table) and upserts into target tables
-- Usage: run after reviewing backups

DO $$
DECLARE
  rec RECORD;
  target_table text;
  source_contact jsonb;
  nom text;
  localisation text;
  adresse text;
  telephone text;
  email text;
  note numeric;
  avis integer;
  is_active boolean;
  featured boolean;
BEGIN
  FOR rec IN SELECT b.*, bc.slug AS category_slug
             FROM businesses b
             LEFT JOIN business_categories bc ON b.category_id = bc.id
             WHERE b.id IS NOT NULL
  LOOP
    target_table := lower(trim(coalesce(rec.category_slug, 'unknown'))) || '_businesses';

    -- extract source fields with safe fallbacks
    source_contact := rec.contact_info;
    nom := rec.name;
    localisation := rec.location;
    adresse := COALESCE((source_contact->>'address')::text, rec.address::text, NULL);
    telephone := COALESCE((source_contact->>'phone')::text, rec.phone::text, NULL);
    email := COALESCE((source_contact->>'email')::text, rec.email::text, NULL);
    note := CASE WHEN rec.rating IS NULL THEN NULL WHEN trim(rec.rating::text) ~ '^[0-9]+(\.[0-9]+)?$' THEN rec.rating::numeric ELSE NULL END;
    avis := CASE WHEN rec.reviews IS NULL THEN NULL WHEN trim(rec.reviews::text) ~ '^[0-9]+' THEN rec.reviews::integer ELSE NULL END;
    is_active := rec.is_active;
    featured := COALESCE(rec.featured, false);

    -- Only proceed if the target table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = target_table) THEN
      EXECUTE format($sql$
        INSERT INTO %I (id, nom, type_commerce, categories_produits, livraison_disponible, cartes_credit_acceptees, description, localisation, adresse, telephone, email, note, avis, actif, en_vedette, date_creation)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO UPDATE SET
          nom = COALESCE(EXCLUDED.nom, %I.nom),
          description = COALESCE(EXCLUDED.description, %I.description),
          localisation = COALESCE(EXCLUDED.localisation, %I.localisation),
          adresse = COALESCE(EXCLUDED.adresse, %I.adresse),
          telephone = COALESCE(EXCLUDED.telephone, %I.telephone),
          email = COALESCE(EXCLUDED.email, %I.email),
          note = COALESCE(EXCLUDED.note, %I.note),
          avis = COALESCE(EXCLUDED.avis, %I.avis),
          actif = COALESCE(EXCLUDED.actif, %I.actif),
          en_vedette = COALESCE(EXCLUDED.en_vedette, %I.en_vedette)
      $sql$, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table, target_table)
      USING rec.id, nom, rec.category_id::text, ARRAY[]::text[], false, false, rec.description, localisation, adresse, telephone, email, note, avis, is_active, featured, COALESCE(rec.created_at, now());
    ELSE
      RAISE NOTICE 'Skipping id % because target table % does not exist', rec.id, target_table;
    END IF;
  END LOOP;
END$$;

-- Note: This script attempts to map common fields; adjust INSERT column list to match your actual target table schemas.
