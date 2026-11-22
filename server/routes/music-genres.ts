import { Router } from "express";
import { listGenres } from "../../shared/music-genres";

const router = Router();

// GET /api/music-genres?country=CI — canonical genre taxonomy, optionally for one country
router.get("/", (req, res) => {
  const country = typeof req.query.country === "string" ? req.query.country : undefined;
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({ success: true, data: listGenres(country) });
});

export default router;
