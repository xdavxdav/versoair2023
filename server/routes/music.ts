import { Router } from "express";
import { db, pool } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

const router = Router();
// Mounted at /api/music

// GET /api/music/artists
router.get("/artists", async (req, res) => {
  try {
    const { countryCode } = req.query as Record<string, string>;
    console.log(
      `🎵 [MUSIC] Fetching artists${countryCode ? ` for country=${countryCode}` : ""}`,
    );

    let query = `SELECT id, stage_name AS name, genre, label_status, spotify_url, business_id, user_id, country_code FROM artists`;
    const params: any[] = [];

    if (countryCode && countryCode !== "all") {
      query += ` WHERE country_code = $1`;
      params.push(countryCode.toUpperCase());
    }
    query += ` ORDER BY stage_name ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error("❌ Get music artists error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to fetch music artists",
        details: error.message,
      });
  }
});

// GET /api/music/tracks
router.get("/tracks", async (_req, res) => {
  try {
    const tracks = await db
      .select()
      .from(schema.musicTracks)
      .orderBy(schema.musicTracks.id);
    res.json({ success: true, data: tracks, count: tracks.length });
  } catch (error: any) {
    console.error("❌ Get music tracks error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to fetch music tracks",
        details: error.message,
      });
  }
});

// GET /api/music/analytics
router.get("/analytics", async (_req, res) => {
  try {
    const analytics = await db
      .select()
      .from(schema.musicAnalytics)
      .orderBy(schema.musicAnalytics.recordedAt)
      .limit(1);

    const analyticsData = analytics[0] || {
      id: 0,
      totalArtists: 0,
      totalTracks: 0,
      totalStreams: 0,
      recordedAt: new Date(),
    };
    res.json({ success: true, data: analyticsData });
  } catch (error: any) {
    console.error("❌ Get music analytics error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to fetch music analytics",
        details: error.message,
      });
  }
});

// GET /api/music/artists/:id
router.get("/artists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await db
      .select()
      .from(schema.musicArtists)
      .where(eq(schema.musicArtists.id, parseInt(id)))
      .limit(1);

    if (!artist.length) {
      return res
        .status(404)
        .json({ success: false, error: "Artist not found" });
    }

    const tracks = await db
      .select()
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.artistId, parseInt(id)))
      .orderBy(schema.musicTracks.id);

    res.json({ success: true, data: { ...artist[0], tracks } });
  } catch (error: any) {
    console.error("❌ Get artist error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to fetch artist",
        details: error.message,
      });
  }
});

// POST /api/music/artists/generate-random
router.post("/artists/generate-random", async (req, res) => {
  try {
    const { count: artistCount = 10 } = req.body;
    console.log(`🎵 [MUSIC] Generating ${artistCount} random artists`);

    const genres = [
      "Pop",
      "Rock",
      "Hip Hop",
      "Electronic",
      "Jazz",
      "R&B",
      "Country",
      "Reggae",
      "Latin",
      "Classical",
    ];
    const firstNames = [
      "Alex",
      "Jordan",
      "Taylor",
      "Morgan",
      "Casey",
      "Riley",
      "Drew",
      "Sage",
    ];
    const lastNames = [
      "Storm",
      "Phoenix",
      "Rivers",
      "Knight",
      "Azure",
      "Blaze",
      "Nova",
    ];

    const artists = [];
    for (let i = 0; i < artistCount; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const genre = genres[Math.floor(Math.random() * genres.length)];

      const [artist] = await db
        .insert(schema.musicArtists)
        .values({ name: `${firstName} ${lastName}`, genre })
        .returning();
      artists.push(artist);
    }

    res.json({ success: true, data: artists, count: artists.length });
  } catch (error: any) {
    console.error("❌ Generate artists error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to generate artists",
        details: error.message,
      });
  }
});

export default router;
