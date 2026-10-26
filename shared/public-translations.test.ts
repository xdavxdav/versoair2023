import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { BUNDLED_LANGUAGES, isBundledLanguage, getPublicCopyId, nativeDictionary, PUBLIC_COPY } from "./public-translations";
import { SPANISH_COPY } from "./spanish-translations";

test("legal page static copy has native FR/EN coverage, excluding brands and punctuation", () => {
  const fixed = new Set([
    "support@versoair.com", "Verso Air", '"Straight to the point"', "Stripe:",
    "Groq / Ollama:", "Google Analytics:", "Google Translate:",
    "When you select another language, the browser-based translation widget may send visible page text and language preferences to Google to provide translations.",
    "Browser-based page translation when you choose another language. Google may process page text, language preferences, and related browser information under its own privacy terms.",
    "Neon / PostgreSQL:", "Render:",
    "connect.sid", "Essential", "token", "verso_portal", "verso_theme", "_ga / _gid", "_gat",
    "verso_favorites", "verso_search_history", "verso_notification_prefs", "tanstack_query_cache",
    "Chrome:", "Firefox:", "Safari:", "Edge:", "GDPR",
  ]);
  for (const file of ["terms", "privacy", "cookies"]) {
    const path = new URL(`../client/src/pages/${file}.tsx`, import.meta.url);
    const source = ts.createSourceFile(String(path), readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const missing: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.text.replace(/\s+/g, " ").trim();
        if (text && /[a-z]/i.test(text) && !fixed.has(text) && getPublicCopyId(text) === undefined) {
          missing.push(text);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.deepEqual(missing, [], `${file} needs native copy for these strings`);
  }
});

test("every catalogue phrase has nonempty native translations and stable lookup in both languages", () => {
  for (const [en, fr] of PUBLIC_COPY) {
    assert.ok(en.trim());
    assert.ok(fr.trim());
    assert.notEqual(getPublicCopyId(en), undefined);
    assert.notEqual(getPublicCopyId(fr), undefined);
  }
});

test("every bundled language covers the whole current catalogue without ordinal drift or fallback", () => {
  for (const language of BUNDLED_LANGUAGES) {
    const dictionary = nativeDictionary(language);
    assert.equal(Object.keys(dictionary).length, PUBLIC_COPY.length);
    PUBLIC_COPY.forEach(([en, fr], index) => {
      const expected = language === "es" ? SPANISH_COPY[en] : language === "fr" ? fr : en;
      assert.equal(dictionary[String(index)], expected);
      assert.ok(dictionary[String(index)].trim(), `${language}: ${en}`);
    });
  }
  assert.equal(isBundledLanguage("es"), true);
  assert.equal(isBundledLanguage("de"), false);
  assert.equal(isBundledLanguage("../private"), false);
});

test("Spanish critical commercial and legal copy preserves no-payment and no-entitlement terms", () => {
  assert.equal(SPANISH_COPY["Custom quote"], "Presupuesto personalizado");
  assert.match(SPANISH_COPY["GeoAdmin pricing is provided for reference and inquiry only. No payment is taken and no plan is activated from the pricing page. Availability, deliverables, taxes, billing, renewal, cancellation, and any refund conditions must be confirmed in a written offer before you accept."],
    /No se cobra ningún pago ni se activa ningún plan/);
  assert.match(SPANISH_COPY["Premium is available by inquiry only. It uses the same platform scope as Essentiel and adds proposed content-preparation services, subject to written confirmation. It does not grant additional account permissions."],
    /No concede permisos adicionales/);
});

test("the homepage hero's launch copy is native in English and Spanish and no longer says it is preparing", () => {
  const badge = "Ontario, Canada • lancement en cours";
  const tagline =
    "VERSO AIR INC. lance sa plateforme numérique dédiée à la visibilité des entreprises et aux projets créatifs. Nous démarrons en Ontario, avec l’ambition de nous développer à l’échelle mondiale.";

  for (const text of [badge, tagline]) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    for (const language of ["en", "es"] as const) {
      const native = nativeDictionary(language)[id!];
      assert.notEqual(native, text, `not translated to ${language}: ${text}`);
      assert.match(native, /Ontario/, `${language} keeps the Ontario start: ${text}`);
      assert.doesNotMatch(native, /prepar/i, `${language} must not say it is preparing: ${text}`);
    }
  }

  const english = nativeDictionary("en");
  assert.match(english[getPublicCopyId(badge)!], /launching now/);
  assert.match(english[getPublicCopyId(tagline)!], /launching[\s\S]*Ontario[\s\S]*worldwide/);
  assert.match(nativeDictionary("es")[getPublicCopyId(tagline)!], /lanza[\s\S]*Ontario[\s\S]*mundial/);
});

test("the About page's launch copy is native in English and Spanish and no longer says it is preparing", () => {
  const launchCopy = [
    "Ce Que VERSO AIR Lance",
    "VERSO AIR INC. lance ses services numériques, en commençant par l’Ontario. Contactez-nous pour en savoir plus sur les prochaines étapes.",
    "La Plateforme d'Intelligence d'Affaires, de l'Ontario vers le monde",
  ];

  for (const text of launchCopy) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    for (const language of ["en", "es"] as const) {
      const native = nativeDictionary(language)[id!];
      assert.notEqual(native, text, `not translated to ${language}: ${text}`);
      assert.doesNotMatch(native, /prepar/i, `${language} must not say it is preparing: ${text}`);
    }
  }

  const english = nativeDictionary("en");
  const spanish = nativeDictionary("es");
  const cta = getPublicCopyId(launchCopy[1])!;
  assert.match(english[cta], /launching[\s\S]*Ontario/);
  assert.match(spanish[cta], /lanza[\s\S]*Ontario/);
  assert.match(english[getPublicCopyId(launchCopy[2])!], /Ontario to the world/);
  assert.match(spanish[getPublicCopyId(launchCopy[2])!], /Ontario al mundo/);
});

test("the About page's primary French copy has native English translations", () => {
  const english = nativeDictionary("en");
  const aboutCopy = [
    "Plateforme d'Intelligence Multi-Sectorielle",
    "Écosystème d'Intelligence d'Affaires",
    "VERSO AIR INC. lance sa plateforme numérique dédiée à la visibilité des entreprises et aux projets créatifs. Nous démarrons en Ontario, avec l’ambition de nous développer à l’échelle mondiale.",
    "Parcourir les Entreprises",
    "Commerce & Détail",
    "Annuaire complet d'entreprises & moteur de recherche multi-secteur",
    "Secteurs de la Plateforme",
    "Fonctionnalités prévues",
    "Prêt à Explorer ?",
  ];

  for (const text of aboutCopy) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    assert.notEqual(english[id!], text, `not translated to English: ${text}`);
  }
});
