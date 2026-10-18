import { Router } from "express";
import rateLimit from "express-rate-limit";
import { SUPPORTED_LANGUAGES, nativeDictionary } from "../../shared/public-translations";
import { getPublicTranslationService, TranslationError } from "../services/public-translation";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "TRANSLATION_RATE_LIMITED", message: "Too many language requests. Please try again later." },
});

router.get("/:language", limiter, async (req, res) => {
  const { language } = req.params;
  res.setHeader("Cache-Control", "no-store");
  if (!SUPPORTED_LANGUAGES.has(language) || Object.keys(req.query).length > 0) {
    return res.status(400).json({ success: false, code: "TRANSLATION_INVALID_REQUEST", message: "Choose a supported language; text submissions are not accepted." });
  }
  try {
    const native = language === "fr" || language === "en";
    const dictionary = native
      ? nativeDictionary(language)
      : await getPublicTranslationService().translate(language);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json({ success: true, language, machineTranslated: !native, dictionary });
  } catch (error: unknown) {
    const code = error instanceof TranslationError ? error.code : "TRANSLATION_UNAVAILABLE";
    console.error("[Translation] Request failed:", code);
    return res.status(error instanceof TranslationError ? error.status : 503).json({
      success: false,
      code,
      message: "Translation is unavailable. The original content remains available in French or English.",
    });
  }
});

export default router;
