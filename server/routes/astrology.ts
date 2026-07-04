import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
const astroCache = new Map<string, { ts: number; data: any }>();
const ASTRO_TTL = 10 * 60 * 1000;
const ASTRO_FETCH_TIMEOUT = 5000;
const ASTRO_MAX_RETRIES = 3;
const ASTRO_BACKOFF_BASE = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAstroWithRetries(sign: string) {
  let lastErr: any = null;

  for (let attempt = 1; attempt <= ASTRO_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ASTRO_FETCH_TIMEOUT);

    try {
      const upstream = await fetch(
        `https://aztro.sameerkumar.website/?sign=${encodeURIComponent(sign)}&day=today`,
        { method: "POST", signal: controller.signal },
      );

      clearTimeout(timeout);

      if (!upstream.ok) {
        const bodyText = await upstream.text().catch(() => "<no body>");
        const msg = `upstream status ${upstream.status} - ${bodyText}`;
        console.error(`❌ Aztro attempt ${attempt} failed for sign: ${sign} -> ${msg}`);

        if (upstream.status >= 500 && attempt < ASTRO_MAX_RETRIES) {
          const backoff = ASTRO_BACKOFF_BASE * Math.pow(2, attempt - 1);
          await delay(backoff + Math.floor(Math.random() * 100));
          continue;
        }

        throw new Error(msg);
      }

      return await upstream.json();
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;

      const isAbort = err?.name === "AbortError";
      console.error(
        `❌ Aztro fetch error (attempt ${attempt}) for sign: ${sign}:`,
        err?.message || err,
      );

      if (
        (isAbort || err?.code === "ECONNRESET" || err?.code === "ECONNREFUSED") &&
        attempt < ASTRO_MAX_RETRIES
      ) {
        const backoff = ASTRO_BACKOFF_BASE * Math.pow(2, attempt - 1);
        await delay(backoff + Math.floor(Math.random() * 100));
        continue;
      }

      break;
    }
  }

  throw lastErr || new Error("Unknown upstream error");
}

router.post(
  "/astrology",
  asyncHandler(async (req, res) => {
    const sign = (req.query.sign || req.body.sign || "")
      .toString()
      .trim()
      .toLowerCase();

    if (!sign) {
      return res.status(400).json({ error: "sign query param or body required" });
    }

    const now = Date.now();
    const cached = astroCache.get(sign);

    if (cached && now - cached.ts < ASTRO_TTL) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.data);
    }

    if (cached) {
      res.setHeader("X-Cache", "HIT-STALE");
      void (async () => {
        try {
          const fresh = await fetchAstroWithRetries(sign);
          astroCache.set(sign, { ts: Date.now(), data: fresh });
          console.log(`🔁 Refreshed stale astrology cache for sign: ${sign}`);
        } catch (err: any) {
          console.warn(
            `⚠️ Failed to refresh astrology cache for sign ${sign}:`,
            err?.message || err,
          );
        }
      })();

      return res.json(cached.data);
    }

    try {
      const data = await fetchAstroWithRetries(sign);
      astroCache.set(sign, { ts: Date.now(), data });
      res.setHeader("X-Cache", "MISS");
      return res.json(data);
    } catch (err: any) {
      console.error("❌ Astrology proxy error:", err?.message || err);

      const cachedFallback = astroCache.get(sign);
      if (cachedFallback) {
        res.setHeader("X-Cache", "HIT-STALE-FALLBACK");
        return res.json(cachedFallback.data);
      }

      const today = new Date().toISOString().split("T")[0];
      const fallbacks: Record<string, any> = {
        aries: { date_range: "Mar 21 - Apr 19", current_date: today, description: "General guidance: take the lead today and pursue something important — small steps add up.", compatibility: "Leo", mood: "Energetic", color: "Red", lucky_number: "9", lucky_time: "2pm" },
        taurus: { date_range: "Apr 20 - May 20", current_date: today, description: "General guidance: focus on comfort and slow, steady progress. Practical choices pay off.", compatibility: "Virgo", mood: "Grounded", color: "Green", lucky_number: "6", lucky_time: "10am" },
        gemini: { date_range: "May 21 - Jun 20", current_date: today, description: "General guidance: communicate clearly and be open to new ideas — conversations matter.", compatibility: "Libra", mood: "Curious", color: "Yellow", lucky_number: "5", lucky_time: "11am" },
        cancer: { date_range: "Jun 21 - Jul 22", current_date: today, description: "General guidance: tend to your circle — a small act of care can deepen bonds.", compatibility: "Pisces", mood: "Nurturing", color: "Silver", lucky_number: "2", lucky_time: "7pm" },
        leo: { date_range: "Jul 23 - Aug 22", current_date: today, description: "General guidance: your confidence shines — step into the spotlight for something meaningful.", compatibility: "Aries", mood: "Bold", color: "Gold", lucky_number: "1", lucky_time: "6pm" },
        virgo: { date_range: "Aug 23 - Sep 22", current_date: today, description: "General guidance: organize an important task — refining details leads to wins.", compatibility: "Taurus", mood: "Focused", color: "Brown", lucky_number: "3", lucky_time: "9am" },
        libra: { date_range: "Sep 23 - Oct 22", current_date: today, description: "General guidance: seek balance and make fair choices — diplomacy helps progress.", compatibility: "Gemini", mood: "Balanced", color: "Blue", lucky_number: "7", lucky_time: "4pm" },
        scorpio: { date_range: "Oct 23 - Nov 21", current_date: today, description: "General guidance: focus your intensity on something that matters — transformation is possible.", compatibility: "Cancer", mood: "Intense", color: "Black", lucky_number: "8", lucky_time: "11pm" },
        sagittarius: { date_range: "Nov 22 - Dec 21", current_date: today, description: "General guidance: explore a fresh perspective or idea — growth comes from adventure.", compatibility: "Aries", mood: "Optimistic", color: "Purple", lucky_number: "4", lucky_time: "3pm" },
        capricorn: { date_range: "Dec 22 - Jan 19", current_date: today, description: "General guidance: steady work pays off — set a clear, practical goal and move steadily toward it.", compatibility: "Taurus", mood: "Determined", color: "Gray", lucky_number: "10", lucky_time: "8am" },
        aquarius: { date_range: "Jan 20 - Feb 18", current_date: today, description: "General guidance: embrace inventive thinking and connect with a community to amplify an idea.", compatibility: "Gemini", mood: "Innovative", color: "Turquoise", lucky_number: "11", lucky_time: "5pm" },
        pisces: { date_range: "Feb 19 - Mar 20", current_date: today, description: "General guidance: trust your instincts and allow creative expression to guide a decision.", compatibility: "Cancer", mood: "Dreamy", color: "Sea green", lucky_number: "12", lucky_time: "9pm" },
      };

      const fallback = fallbacks[sign];
      if (fallback) {
        console.warn(`⚠️ Returning fallback astrology data for sign ${sign}`);
        astroCache.set(sign, { ts: Date.now(), data: fallback });
        res.setHeader("X-Cache", "FALLBACK");
        return res.json(fallback);
      }

      return res.status(502).json({ error: "Upstream astrology API error" });
    }
  }),
);

export default router;
