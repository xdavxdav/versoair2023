import type { RequestHandler } from "express";
import { isLocalPreviewOnlyPath } from "@shared/page-readiness";

const PAGE_READINESS_NOTICE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0f766e">
    <title>Will be ready soon | Verso Air</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: #f8fafc; color: #0f172a; }
      main { width: min(100%, 620px); padding: clamp(28px, 7vw, 56px); border: 1px solid #e2e8f0; border-radius: 24px; background: #fff; box-shadow: 0 24px 70px rgb(15 23 42 / 9%); text-align: center; }
      .brand { margin: 0 0 32px; color: #0f766e; font-size: 14px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
      .eyebrow { margin: 0 0 10px; color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(30px, 6vw, 46px); line-height: 1.1; letter-spacing: -.04em; }
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
      <p class="eyebrow">A little more time</p>
      <h1>Will be ready soon</h1>
      <p class="message">We're preparing this part of Verso Air. Please check back soon.</p>
      <p class="countdown" id="countdown" role="status" aria-live="polite">Returning to the homepage in 5 seconds.</p>
      <div class="actions">
        <a class="primary" href="/">Go to homepage</a>
        <button class="secondary" id="stay" type="button">Stay on this page</button>
      </div>
    </main>
    <script>
      (() => {
        let seconds = 5;
        const countdown = document.getElementById("countdown");
        const stay = document.getElementById("stay");
        const returnHome = () => { window.location.replace("/"); };
        const redirectTimer = window.setTimeout(returnHome, 5000);
        const countdownTimer = window.setInterval(() => {
          seconds -= 1;
          if (countdown) countdown.textContent = "Returning to the homepage in " + seconds + " second" + (seconds === 1 ? "" : "s.");
          if (seconds <= 0) window.clearInterval(countdownTimer);
        }, 1000);
        stay?.addEventListener("click", () => {
          window.clearTimeout(redirectTimer);
          window.clearInterval(countdownTimer);
          if (countdown) countdown.textContent = "You're welcome to stay here. Use the homepage button whenever you're ready.";
          stay.disabled = true;
          stay.textContent = "You're staying here";
        });
      })();
    </script>
  </body>
</html>`;

export function pageReadinessNotFound(
  isProduction = process.env.NODE_ENV === "production",
): RequestHandler {
  return (req, res, next) => {
    if (
      isProduction &&
      ["GET", "HEAD"].includes(req.method) &&
      isLocalPreviewOnlyPath(req.path)
    ) {
      res.set("Cache-Control", "no-store");
      res.status(404).type("html").send(PAGE_READINESS_NOTICE);
      return;
    }
    next();
  };
}
