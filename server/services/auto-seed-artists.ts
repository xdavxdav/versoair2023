/**
 * Auto-seed artists on server startup if the table is empty.
 * Runs once at boot — idempotent, safe to call multiple times.
 */
import { pool } from "../db";

const SEED_ARTISTS = [
  {
    name: "DJ Arafat Legacy",
    genre: "Coupé-Décalé",
    cc: "CI",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example1",
  },
  {
    name: "Tiken Jah Fakoly",
    genre: "Reggae",
    cc: "CI",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example2",
  },
  {
    name: "Magic System",
    genre: "Zouglou",
    cc: "CI",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example3",
  },
  {
    name: "Alpha Blondy",
    genre: "Reggae",
    cc: "CI",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example4",
  },
  {
    name: "Meiway",
    genre: "Zoblazo",
    cc: "CI",
    label: "signed",
    spotify: null,
  },
  {
    name: "Serge Beynaud",
    genre: "Coupé-Décalé",
    cc: "CI",
    label: "independent",
    spotify: "https://open.spotify.com/artist/example5",
  },
  {
    name: "Josey",
    genre: "Afropop",
    cc: "CI",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example6",
  },
  {
    name: "Roseline Layo",
    genre: "Gospel",
    cc: "CI",
    label: "independent",
    spotify: null,
  },
  {
    name: "Youssou N'Dour",
    genre: "Mbalax",
    cc: "SN",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example7",
  },
  {
    name: "Baaba Maal",
    genre: "World Music",
    cc: "SN",
    label: "signed",
    spotify: null,
  },
  {
    name: "Salif Keïta",
    genre: "Afro-Manding",
    cc: "ML",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example8",
  },
  {
    name: "Amadou & Mariam",
    genre: "Afro-Blues",
    cc: "ML",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example9",
  },
  {
    name: "Fally Ipupa",
    genre: "Rumba",
    cc: "CD",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example10",
  },
  {
    name: "Ferre Gola",
    genre: "Rumba",
    cc: "CD",
    label: "independent",
    spotify: null,
  },
  {
    name: "Koffi Olomide",
    genre: "Soukous",
    cc: "CD",
    label: "signed",
    spotify: null,
  },
  {
    name: "Burna Boy",
    genre: "Afrobeats",
    cc: "NG",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example11",
  },
  {
    name: "Wizkid",
    genre: "Afrobeats",
    cc: "NG",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example12",
  },
  {
    name: "Davido",
    genre: "Afropop",
    cc: "NG",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example13",
  },
  {
    name: "Diamond Platnumz",
    genre: "Bongo Flava",
    cc: "TZ",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example14",
  },
  {
    name: "Sauti Sol",
    genre: "Afro-Pop",
    cc: "KE",
    label: "independent",
    spotify: "https://open.spotify.com/artist/example15",
  },
  {
    name: "Angélique Kidjo",
    genre: "World Music",
    cc: "BJ",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example16",
  },
  {
    name: "Stromae",
    genre: "Electronic",
    cc: "BE",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example17",
  },
  {
    name: "Aya Nakamura",
    genre: "Pop/R&B",
    cc: "FR",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example18",
  },
  {
    name: "MHD",
    genre: "Afro Trap",
    cc: "FR",
    label: "signed",
    spotify: "https://open.spotify.com/artist/example19",
  },
  {
    name: "Sidiki Diabaté",
    genre: "Mandingue",
    cc: "ML",
    label: "signed",
    spotify: null,
  },
];

export async function autoSeedArtists(): Promise<void> {
  try {
    // Check if table exists
    try {
      await pool.query("SELECT 1 FROM artists LIMIT 0");
    } catch {
      console.log("⏭️  [AUTO-SEED] artists table doesn't exist yet — skipping");
      return;
    }

    // Detect available columns
    const colResult = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'artists'",
    );
    const cols = new Set(colResult.rows.map((r: any) => r.column_name));

    // Ensure country_code column exists (safety net if db:push missed it)
    if (!cols.has("country_code")) {
      try {
        await pool.query(
          "ALTER TABLE artists ADD COLUMN IF NOT EXISTS country_code VARCHAR(2)",
        );
        cols.add("country_code");
        console.log(
          "🔧 [AUTO-SEED] Added missing country_code column to artists",
        );
      } catch (err: any) {
        console.error(
          "⚠️  [AUTO-SEED] Could not add country_code column:",
          err.message,
        );
      }
    }

    const hasCC = cols.has("country_code");
    const hasLabel = cols.has("label_status");
    const hasSpotify = cols.has("spotify_url");

    console.log(
      `🎤 [AUTO-SEED] artists columns: country_code=${hasCC}, label_status=${hasLabel}, spotify_url=${hasSpotify}`,
    );

    // Check if already populated
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM artists",
    );

    if (rows[0].cnt > 0) {
      // Backfill country_code on existing rows if the column exists but values are NULL
      if (hasCC) {
        const nullCC = await pool.query(
          "SELECT COUNT(*)::int AS cnt FROM artists WHERE country_code IS NULL",
        );
        if (nullCC.rows[0].cnt > 0) {
          console.log(
            `🔄 [AUTO-SEED] Backfilling country_code for ${nullCC.rows[0].cnt} artists...`,
          );
          let updated = 0;
          for (const a of SEED_ARTISTS) {
            try {
              const result = await pool.query(
                "UPDATE artists SET country_code = $1 WHERE stage_name = $2 AND country_code IS NULL",
                [a.cc, a.name],
              );
              if (result.rowCount && result.rowCount > 0) updated++;
            } catch (err: any) {
              // Non-fatal
            }
          }
          console.log(
            `✅ [AUTO-SEED] Backfilled country_code for ${updated} artists`,
          );
        } else {
          console.log(
            `⏭️  [AUTO-SEED] artists already has ${rows[0].cnt} rows with country_codes — skipping`,
          );
        }
      } else {
        console.log(
          `⏭️  [AUTO-SEED] artists already has ${rows[0].cnt} rows — skipping`,
        );
      }
      return;
    }

    console.log("🎤 [AUTO-SEED] artists table empty — inserting seed data...");

    let inserted = 0;
    for (const a of SEED_ARTISTS) {
      try {
        const columns = ["stage_name", "genre"];
        const values: any[] = [a.name, a.genre];

        if (hasCC) {
          columns.push("country_code");
          values.push(a.cc);
        }
        if (hasLabel) {
          columns.push("label_status");
          values.push(a.label);
        }
        if (hasSpotify) {
          columns.push("spotify_url");
          values.push(a.spotify);
        }

        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        await pool.query(
          `INSERT INTO artists (${columns.join(", ")}) VALUES (${placeholders})`,
          values,
        );
        inserted++;
      } catch (err: any) {
        console.error(`  ❌ [AUTO-SEED] Failed "${a.name}": ${err.message}`);
      }
    }

    console.log(
      `✅ [AUTO-SEED] Inserted ${inserted}/${SEED_ARTISTS.length} artists`,
    );
  } catch (err: any) {
    console.error("⚠️  [AUTO-SEED] Artist auto-seed failed:", err.message);
    // Non-fatal — server continues without seed data
  }
}
