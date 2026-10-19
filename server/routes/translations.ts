import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isBundledLanguage, nativeDictionary } from "../../shared/public-translations";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "TRANSLATION_RATE_LIMITED", message: "Too many language requests. Please try again later." },
});

router.get("/:language", limiter, (req, res) => {
  const { language } = req.params;
  res.setHeader("Cache-Control", "no-store");
  if (Object.keys(req.query).length > 0) {
    return res.status(400).json({ success: false, code: "TRANSLATION_INVALID_REQUEST", message: "Text submissions are not accepted." });
  }
  if (!isBundledLanguage(language)) {
    return res.status(400).json({
      success: false, code: "TRANSLATION_LANGUAGE_NOT_BUNDLED",
      message: "Choose Français, English or Español. Other language dictionaries are not bundled yet.",
    });
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.json({ success: true, language, machineTranslated: false, dictionary: nativeDictionary(language) });
});

export default router;
