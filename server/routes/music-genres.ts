import { Router } from "express";
import { listGenreCountries, listGenres } from "../../shared/music-genres";

const router = Router();

// GET /api/music-genres/countries — only countries that have verified genre content
router.get("/countries", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({ success: true, data: listGenreCountries() });
});

// GET /api/music-genres?country=CI — canonical genre taxonomy, optionally for one country
router.get("/", (req, res) => {
  const country = typeof req.query.country === "string" ? req.query.country : undefined;
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({ success: true, data: listGenres(country) });
});

export default router;
