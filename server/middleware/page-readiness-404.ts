import type { RequestHandler } from "express";
import { isLocalPreviewOnlyPath } from "@shared/page-readiness";

export type NoticeLanguage = "en" | "fr" | "es";

const PAGE_TITLES: Record<NoticeLanguage, Record<string, string>> = {
  en: {
    programs: "Programs",
    sponsorship: "Sponsorship",
  },
  fr: {
    programs: "Programmes",
    sponsorship: "Parrainage",
  },
  es: {
    programs: "Programas",
    sponsorship: "Patrocinio",
  },
};

interface NoticeCopy {
  eyebrow: string;
  status: string;
  message: string;
  home: string;
  countdownOne: string;
  countdownOther: string;
}

const NOTICE_COPY: Record<NoticeLanguage, NoticeCopy> = {
  en: {
    eyebrow: "A little more time",
    status: "Will be ready soon",
    message: "We're preparing this part of Verso Air. Please check back soon.",
    home: "Review Verso Air",
    countdownOne: "Returning to the homepage in {n} second.",
    countdownOther: "Returning to the homepage in {n} seconds.",
  },
  fr: {
    eyebrow: "Encore un peu de patience",
    status: "Bientôt disponible",
    message: "Nous préparons cette partie de Verso Air. Revenez bientôt.",
    home: "Retour à l'accueil",
    countdownOne: "Retour à l'accueil dans {n} seconde.",
    countdownOther: "Retour à l'accueil dans {n} secondes.",
  },
  es: {
    eyebrow: "Un poco más de tiempo",
    status: "Próximamente",
    message: "Estamos preparando esta parte de Verso Air. Vuelve pronto.",
    home: "Volver al inicio",
    countdownOne: "Volviendo al inicio en {n} segundo.",
    countdownOther: "Volviendo al inicio en {n} segundos.",
  },
};

// First supported language by q-weight; anything else (including "*") stays English.
export function pickNoticeLanguage(acceptLanguage: string | undefined): NoticeLanguage {
  if (!acceptLanguage) return "en";
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const quality = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const weight = quality ? Number.parseFloat(quality.slice(2)) : 1;
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag !== "" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split("-", 1)[0];
    if (base === "fr" || base === "es" || base === "en") return base;
  }
  return "en";
}

function lookupPageTitle(language: NoticeLanguage, segment: string): string | undefined {
  for (const table of [PAGE_TITLES[language], PAGE_TITLES.en]) {
    if (Object.prototype.hasOwnProperty.call(table, segment)) return table[segment];
  }
  return undefined;
}

function getPageTitle(pathname: string, language: NoticeLanguage): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase();
  const segments = path.split("/").filter(Boolean);
  return segments
    .map(
      (segment) =>
        lookupPageTitle(language, segment) ??
        segment
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (character) => character.toUpperCase()),
    )
    .join(" / ");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function renderPageReadinessNotice(pageTitle: string, language: NoticeLanguage): string {
  const safeTitle = escapeHtml(pageTitle);
  const copy = NOTICE_COPY[language];
  // Embedded in a <script>, so "<" is escaped to keep the JSON from closing the tag.
  const countdownCopy = JSON.stringify({
    one: copy.countdownOne,
    other: copy.countdownOther,
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0f766e">
    <title>${safeTitle} | ${copy.status} | Verso Air</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: #f8fafc; color: #0f172a; }
      main { width: min(100%, 620px); padding: clamp(28px, 7vw, 56px); border: 1px solid #e2e8f0; border-radius: 24px; background: #fff; box-shadow: 0 24px 70px rgb(15 23 42 / 9%); text-align: center; }
      .brand { margin: 0 0 32px; color: #0f766e; font-size: 14px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
      .eyebrow { margin: 0 0 10px; color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(30px, 6vw, 46px); line-height: 1.1; letter-spacing: -.04em; }
      .readiness { margin: 16px 0 0; color: #0f766e; font-size: 20px; font-weight: 700; }
      .message { margin: 18px auto 0; max-width: 460px; color: #475569; font-size: 17px; line-height: 1.65; }
      .countdown { margin: 20px 0 0; color: #64748b; font-size: 14px; }
      .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
      .actions a, .actions button { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; padding: 0 18px; border: 1px solid #0f766e; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; }
      .primary { background: #0f766e; color: #fff; }
      .secondary { background: #fff; color: #0f766e; }
      .actions a:focus-visible, .actions button:focus-visible { outline: 3px solid #5eead4; outline-offset: 3px; }
      @media (prefers-color-scheme: dark) {
        body { background: #020617; color: #f8fafc; }
        main { border-color: #334155; background: #0f172a; box-shadow: 0 24px 70px rgb(0 0 0 / 25%); }
        .message, .countdown { color: #cbd5e1; }
        .secondary { border-color: #5eead4; background: transparent; color: #99f6e4; }
      }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">Verso Air</p>
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1>${safeTitle}</h1>
      <p class="readiness">${copy.status}</p>
      <p class="message">${copy.message}</p>
      <p class="countdown" id="countdown" role="status" aria-live="polite">${copy.countdownOther.replace("{n}", "5")}</p>
      <div class="actions">
        <a class="primary" href="/">${copy.home}</a>
      </div>
    </main>
    <script>
      (() => {
        const countdownCopy = ${countdownCopy};
        let seconds = 5;
        const countdown = document.getElementById("countdown");
        const returnHome = () => { window.location.replace("/"); };
        window.setTimeout(returnHome, 5000);
        const countdownTimer = window.setInterval(() => {
          seconds -= 1;
          if (countdown && seconds > 0) countdown.textContent = (seconds === 1 ? countdownCopy.one : countdownCopy.other).replace("{n}", String(seconds));
          if (seconds <= 0) window.clearInterval(countdownTimer);
        }, 1000);
      })();
    </script>
  </body>
</html>`;
}

export function pageReadinessNotFound(
  isProduction = process.env.NODE_ENV === "production",
): RequestHandler {
  return (req, res, next) => {
    if (
      isProduction &&
      ["GET", "HEAD"].includes(req.method) &&
      isLocalPreviewOnlyPath(req.path)
    ) {
      const language = pickNoticeLanguage(req.get("accept-language"));
      res.set("Cache-Control", "no-store");
      res.vary("Accept-Language");
      res
        .status(404)
        .type("html")
        .send(renderPageReadinessNotice(getPageTitle(req.path, language), language));
      return;
    }
    next();
  };
}
