import { pool } from "../db";

/**
 * Auto-seed marketing packs and print products if tables are empty.
 * Idempotent — safe to call on every server boot.
 */
export async function autoSeedMarketingData() {
  try {
    // --- Seed Marketing Packs ---
    const packCount = await pool.query(
      "SELECT COUNT(*)::int AS count FROM marketing_packs",
    );
    if (parseInt(packCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO marketing_packs (name, slug, tier, description, price_cents, features, active, sort_order) VALUES
        ('Pack Basic', 'pack-basic', 'basic', 'Insertion dans le journal d''annonces — idéal pour une première visibilité locale.', 2900, '["Insertion journal (1 édition)", "Annonce texte + image", "Distribution zones ciblées"]', true, 1),
        ('Pack Standard', 'pack-standard', 'standard', 'Journal + flyers imprimés — doublez votre impact avec le papier.', 7900, '["Insertion journal (2 éditions)", "500 flyers A5 couleur", "Design graphique inclus", "Distribution zones ciblées"]', true, 2),
        ('Pack Premium', 'pack-premium', 'premium', 'Visibilité maximale — journal, flyers, affiches et mise en avant.', 14900, '["Insertion journal (4 éditions)", "1000 flyers A5 couleur", "50 affiches A3", "Mise en avant premium", "Design graphique inclus", "Distribution élargie"]', true, 3),
        ('Pack Pro', 'pack-pro', 'pro', 'Solution marketing complète — tout inclus + newsletter + formation.', 49900, '["Insertion journal (12 éditions)", "2000 flyers A5 couleur", "100 affiches A3", "500 cartes de visite", "Newsletter dédiée (4 envois)", "Formation marketing 1h", "Mise en avant premium", "Reporting mensuel"]', true, 4)
        ON CONFLICT (slug) DO NOTHING
      `);

      // Seed pack items for each pack
      const packs = await pool.query(
        "SELECT id, slug FROM marketing_packs ORDER BY sort_order",
      );
      for (const pack of packs.rows) {
        if (pack.slug === "pack-basic") {
          await pool.query(
            `INSERT INTO pack_items (pack_id, item_type, description, quantity) VALUES
            ($1, 'journal_insertion', 'Insertion dans 1 édition du journal', 1)`,
            [pack.id],
          );
        } else if (pack.slug === "pack-standard") {
          await pool.query(
            `INSERT INTO pack_items (pack_id, item_type, description, quantity) VALUES
            ($1, 'journal_insertion', 'Insertion dans 2 éditions du journal', 2),
            ($1, 'flyer', 'Flyers A5 couleur recto-verso', 500)`,
            [pack.id],
          );
        } else if (pack.slug === "pack-premium") {
          await pool.query(
            `INSERT INTO pack_items (pack_id, item_type, description, quantity) VALUES
            ($1, 'journal_insertion', 'Insertion dans 4 éditions du journal', 4),
            ($1, 'flyer', 'Flyers A5 couleur recto-verso', 1000),
            ($1, 'poster', 'Affiches A3 couleur', 50)`,
            [pack.id],
          );
        } else if (pack.slug === "pack-pro") {
          await pool.query(
            `INSERT INTO pack_items (pack_id, item_type, description, quantity) VALUES
            ($1, 'journal_insertion', 'Insertion dans 12 éditions du journal', 12),
            ($1, 'flyer', 'Flyers A5 couleur recto-verso', 2000),
            ($1, 'poster', 'Affiches A3 couleur', 100),
            ($1, 'card', 'Cartes de visite premium', 500),
            ($1, 'newsletter', 'Newsletter dédiée', 4),
            ($1, 'training', 'Formation marketing personnalisée 1h', 1)`,
            [pack.id],
          );
        }
      }

      console.log("✅ [SEED] Marketing packs seeded (4 tiers + items)");
    }

    // --- Seed Print Products ---
    const printCount = await pool.query(
      "SELECT COUNT(*)::int AS count FROM print_products",
    );
    if (parseInt(printCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO print_products (name, slug, category, description, specs, price_cents, turnaround_days, active) VALUES
        ('Flyers A5', 'flyer-a5', 'flyer', 'Flyers A5 recto-verso, papier couché 170g, couleur.', '{"width_mm": 148, "height_mm": 210, "dpi_min": 300, "bleed_mm": 3, "color_space": "CMYK"}', 4500, 3, true),
        ('Flyers A4', 'flyer-a4', 'flyer', 'Flyers A4 recto-verso, papier couché 170g, couleur.', '{"width_mm": 210, "height_mm": 297, "dpi_min": 300, "bleed_mm": 3, "color_space": "CMYK"}', 6500, 3, true),
        ('Cartes de visite', 'carte-visite', 'card', 'Cartes de visite 85x55mm, papier couché 350g mat ou brillant.', '{"width_mm": 85, "height_mm": 55, "dpi_min": 300, "bleed_mm": 2, "color_space": "CMYK"}', 2500, 2, true),
        ('Brochure A5', 'brochure-a5', 'brochure', 'Brochure A5 pliée, 8 pages, papier couché 170g.', '{"width_mm": 148, "height_mm": 210, "dpi_min": 300, "bleed_mm": 3, "color_space": "CMYK"}', 12000, 5, true),
        ('Affiche A3', 'affiche-a3', 'poster', 'Affiche A3, papier couché 250g, couleur haute qualité.', '{"width_mm": 297, "height_mm": 420, "dpi_min": 300, "bleed_mm": 3, "color_space": "CMYK"}', 3500, 2, true),
        ('Affiche A2', 'affiche-a2', 'poster', 'Affiche A2, papier couché 250g, couleur grand format.', '{"width_mm": 420, "height_mm": 594, "dpi_min": 300, "bleed_mm": 5, "color_space": "CMYK"}', 5500, 3, true),
        ('Catalogue A4', 'catalogue-a4', 'catalog', 'Catalogue A4, 16 pages minimum, reliure agrafée, papier couché 170g.', '{"width_mm": 210, "height_mm": 297, "dpi_min": 300, "bleed_mm": 3, "color_space": "CMYK"}', 25000, 7, true)
        ON CONFLICT (slug) DO NOTHING
      `);
      console.log("✅ [SEED] Print products catalog seeded (7 products)");
    }
  } catch (error) {
    // Tables may not exist yet on first run — that's fine
    console.warn(
      "⚠️ [SEED] Marketing seed skipped (tables may not exist yet):",
      (error as Error).message,
    );
  }
}
